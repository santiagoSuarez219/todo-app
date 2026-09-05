import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { Expense } from './entities/expense.entity';
import { CreditCard } from './entities/credit-card.entity';
import { Budget } from './entities/budget.entity';
import { ExpenseType } from '../common/enums/expense-type.enum';

/**
 * Unit tests for ExpensesService.duplicate() — spec-023.
 *
 * Covers the criterios de aceptación:
 * - Copies description/amount/type/creditCardId from the source expense.
 * - Shifts `date` to the destination month/year, keeping the same day,
 *   clamped to the last day of the destination month (no timezone drift).
 * - Preserves the associated credit card (or leaves it null when absent).
 * - Throws 404 when the source expense does not exist.
 */
describe('ExpensesService - duplicate()', () => {
  let service: ExpensesService;
  let mockExpensesRepository: any;
  let mockCreditCardsRepository: any;
  let mockBudgetsRepository: any;

  const buildExpense = (overrides: Partial<Expense> = {}): Expense =>
    ({
      id: 'source-id',
      description: 'Netflix',
      amount: 45000,
      date: '2026-01-31',
      type: ExpenseType.BASICO,
      creditCard: null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      ...overrides,
    }) as Expense;

  beforeEach(async () => {
    mockExpensesRepository = {
      createQueryBuilder: jest.fn(),
      create: jest.fn((entityLike) => entityLike),
      save: jest.fn(),
    };

    mockCreditCardsRepository = {
      findOneBy: jest.fn(),
    };

    // spec-035: duplicate() intenta auto-vincular el destino a un
    // presupuesto existente de ese mes — por defecto, ninguno (gasto
    // suelto), salvo que un test lo sobreescriba.
    mockBudgetsRepository = {
      findOneBy: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpensesService,
        {
          provide: getRepositoryToken(Expense),
          useValue: mockExpensesRepository,
        },
        {
          provide: getRepositoryToken(CreditCard),
          useValue: mockCreditCardsRepository,
        },
        {
          provide: getRepositoryToken(Budget),
          useValue: mockBudgetsRepository,
        },
      ],
    }).compile();

    service = module.get<ExpensesService>(ExpensesService);
  });

  /**
   * findOne() uses createQueryBuilder(...).where(...).getOne(). We stub it to
   * return, in order, the source expense lookup and then the re-read of the
   * newly created expense (the service calls findOne() twice: once for the
   * source, once to reload the saved duplicate with its creditCard relation).
   */
  function mockFindOneSequence(...expenses: (Expense | null)[]) {
    let call = 0;
    mockExpensesRepository.createQueryBuilder.mockImplementation(() => {
      const result = expenses[call];
      call += 1;
      return {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(result),
      };
    });
  }

  it('duplicates an expense without credit card, copying description/amount/type', async () => {
    const source = buildExpense({ creditCard: null });
    const saved = buildExpense({
      id: 'new-id',
      date: '2026-02-28',
      creditCard: null,
    });

    mockFindOneSequence(source, saved);
    mockExpensesRepository.save.mockResolvedValue({ id: 'new-id' });

    const result = await service.duplicate('source-id', {
      month: 2,
      year: 2026,
    });

    expect(mockExpensesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Netflix',
        amount: 45000,
        type: ExpenseType.BASICO,
        creditCard: null,
      }),
    );
    expect(result).toEqual(saved);
    expect(result.creditCard).toBeNull();
  });

  it('duplicates an expense with credit card, preserving creditCardId', async () => {
    const creditCard = { id: 'cc-1', name: 'Visa' } as CreditCard;
    const source = buildExpense({ creditCard });
    const saved = buildExpense({
      id: 'new-id',
      date: '2026-02-28',
      creditCard,
    });

    mockFindOneSequence(source, saved);
    mockExpensesRepository.save.mockResolvedValue({ id: 'new-id' });

    const result = await service.duplicate('source-id', {
      month: 2,
      year: 2026,
    });

    expect(mockExpensesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ creditCard: { id: 'cc-1' } }),
    );
    expect(result.creditCard).toEqual(creditCard);
  });

  it('clamps day 31 to day 30 when destination month has 30 days', async () => {
    const source = buildExpense({ date: '2026-01-31' });
    const saved = buildExpense({ id: 'new-id', date: '2026-04-30' });

    mockFindOneSequence(source, saved);
    mockExpensesRepository.save.mockResolvedValue({ id: 'new-id' });

    await service.duplicate('source-id', { month: 4, year: 2026 });

    expect(mockExpensesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ date: '2026-04-30' }),
    );
  });

  it('clamps January 31 to February 29 on a leap year', async () => {
    const source = buildExpense({ date: '2028-01-31' });
    const saved = buildExpense({ id: 'new-id', date: '2028-02-29' });

    mockFindOneSequence(source, saved);
    mockExpensesRepository.save.mockResolvedValue({ id: 'new-id' });

    await service.duplicate('source-id', { month: 2, year: 2028 });

    expect(mockExpensesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ date: '2028-02-29' }),
    );
  });

  it('clamps January 31 to February 28 on a non-leap year', async () => {
    const source = buildExpense({ date: '2026-01-31' });
    const saved = buildExpense({ id: 'new-id', date: '2026-02-28' });

    mockFindOneSequence(source, saved);
    mockExpensesRepository.save.mockResolvedValue({ id: 'new-id' });

    await service.duplicate('source-id', { month: 2, year: 2026 });

    expect(mockExpensesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ date: '2026-02-28' }),
    );
  });

  it('does not clamp when the destination month has enough days', async () => {
    const source = buildExpense({ date: '2026-03-15' });
    const saved = buildExpense({ id: 'new-id', date: '2026-06-15' });

    mockFindOneSequence(source, saved);
    mockExpensesRepository.save.mockResolvedValue({ id: 'new-id' });

    await service.duplicate('source-id', { month: 6, year: 2026 });

    expect(mockExpensesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ date: '2026-06-15' }),
    );
  });

  it('throws 404 when the source expense does not exist', async () => {
    mockFindOneSequence(null);

    await expect(
      service.duplicate('missing-id', { month: 2, year: 2026 }),
    ).rejects.toThrow(NotFoundException);

    expect(mockExpensesRepository.save).not.toHaveBeenCalled();
  });
});
