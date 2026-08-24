import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ExpensesService } from './expenses.service';
import { Expense } from './entities/expense.entity';
import { CreditCard } from './entities/credit-card.entity';
import { Budget } from './entities/budget.entity';

describe('ExpensesService - Search', () => {
  let service: ExpensesService;
  let mockRepository: any;
  let mockCreditCardsRepository: any;
  let mockBudgetsRepository: any;

  beforeEach(async () => {
    mockRepository = {
      createQueryBuilder: jest.fn(),
    };

    mockCreditCardsRepository = {
      findOneBy: jest.fn(),
    };

    // spec-034: applyMonthScope() consulta el presupuesto del mes antes de
    // filtrar — por defecto, sin presupuesto para ese mes (comportamiento
    // "gasto suelto por fecha").
    mockBudgetsRepository = {
      findOneBy: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpensesService,
        {
          provide: getRepositoryToken(Expense),
          useValue: mockRepository,
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

  describe('findAll()', () => {
    const mockExpenses = [
      {
        id: '1',
        description: 'Almuerzo comida rápida',
        amount: 25000,
        date: new Date('2026-07-15'),
        plannedAmount: null,
        type: 'basico',
        creditCard: null,
      },
      {
        id: '2',
        description: 'Comida en restaurante',
        amount: 80000,
        date: new Date('2026-07-20'),
        plannedAmount: null,
        type: 'lujo',
        creditCard: { id: 'cc1', name: 'Visa' },
      },
      {
        id: '3',
        description: 'Pago de servicios',
        amount: 150000,
        date: new Date('2026-07-10'),
        plannedAmount: null,
        type: 'basico',
        creditCard: null,
      },
    ];

    it('should list expenses without filters', async () => {
      const mockQb = {
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockExpenses),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(mockQb.getMany).toHaveBeenCalled();
      expect(result).toEqual(mockExpenses);
    });

    it('should search expenses by description (ILIKE)', async () => {
      const mockQb = {
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockExpenses[1]]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.findAll({
        page: 1,
        limit: 20,
        search: 'comida',
      });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'expense.description ILIKE :search',
        { search: '%comida%' },
      );
      expect(result).toEqual([mockExpenses[1]]);
    });

    // spec-034: year+month ya no filtra con dos EXTRACT sueltos — pasa por
    // applyMonthScope(), que resuelve el presupuesto del mes primero y arma
    // un único andWhere (con o sin presupuesto existente).
    it('should filter expenses by year and month via applyMonthScope (no budget for that month)', async () => {
      const mockQb = {
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockExpenses),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQb);
      mockBudgetsRepository.findOneBy.mockResolvedValue(null);

      const result = await service.findAll({
        page: 1,
        limit: 20,
        year: 2026,
        month: 7,
      });

      expect(mockBudgetsRepository.findOneBy).toHaveBeenCalledWith({
        month: 7,
        year: 2026,
      });
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'expense.budgetId IS NULL AND EXTRACT(YEAR FROM expense.date) = :scopeYear AND EXTRACT(MONTH FROM expense.date) = :scopeMonth',
        { scopeYear: 2026, scopeMonth: 7 },
      );
      expect(result).toEqual(mockExpenses);
    });

    it('should scope by budgetId when the month already has a budget', async () => {
      const mockQb = {
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockExpenses),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQb);
      mockBudgetsRepository.findOneBy.mockResolvedValue({ id: 'budget-1' });

      await service.findAll({ page: 1, limit: 20, year: 2026, month: 7 });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        '(expense.budgetId = :scopeBudgetId OR (expense.budgetId IS NULL AND EXTRACT(YEAR FROM expense.date) = :scopeYear AND EXTRACT(MONTH FROM expense.date) = :scopeMonth))',
        { scopeBudgetId: 'budget-1', scopeYear: 2026, scopeMonth: 7 },
      );
    });

    it('should combine search with year and month filters', async () => {
      const mockQb = {
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockExpenses[1]]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQb);
      mockBudgetsRepository.findOneBy.mockResolvedValue(null);

      const result = await service.findAll({
        page: 1,
        limit: 20,
        year: 2026,
        month: 7,
        search: 'comida',
      });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'expense.budgetId IS NULL AND EXTRACT(YEAR FROM expense.date) = :scopeYear AND EXTRACT(MONTH FROM expense.date) = :scopeMonth',
        { scopeYear: 2026, scopeMonth: 7 },
      );
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'expense.description ILIKE :search',
        { search: '%comida%' },
      );
      expect(result).toEqual([mockExpenses[1]]);
    });

    it('should filter by credit card when creditCardId is provided', async () => {
      const mockQb = {
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockExpenses[1]]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.findAll({
        page: 1,
        limit: 20,
        creditCardId: 'cc1',
      });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'expense.creditCardId = :creditCardId',
        { creditCardId: 'cc1' },
      );
      expect(result).toEqual([mockExpenses[1]]);
    });

    it('should respect pagination parameters', async () => {
      const mockQb = {
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.findAll({ page: 3, limit: 10 });

      expect(mockQb.skip).toHaveBeenCalledWith(20); // (3-1) * 10
      expect(mockQb.take).toHaveBeenCalledWith(10);
    });
  });
});
