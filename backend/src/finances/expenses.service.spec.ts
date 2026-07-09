import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { Expense } from './entities/expense.entity';
import { CreditCard } from './entities/credit-card.entity';

describe('ExpensesService - Search', () => {
  let service: ExpensesService;
  let mockRepository: any;
  let mockCreditCardsRepository: any;

  beforeEach(async () => {
    mockRepository = {
      createQueryBuilder: jest.fn(),
    };

    mockCreditCardsRepository = {
      findOneBy: jest.fn(),
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
        type: 'basico',
        creditCard: null,
      },
      {
        id: '2',
        description: 'Comida en restaurante',
        amount: 80000,
        date: new Date('2026-07-20'),
        type: 'lujo',
        creditCard: { id: 'cc1', name: 'Visa' },
      },
      {
        id: '3',
        description: 'Pago de servicios',
        amount: 150000,
        date: new Date('2026-07-10'),
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

    it('should filter expenses by year and month', async () => {
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

      const result = await service.findAll({
        page: 1,
        limit: 20,
        year: 2026,
        month: 7,
      });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'EXTRACT(year FROM expense.date) = :year',
        { year: 2026 },
      );
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'EXTRACT(month FROM expense.date) = :month',
        { month: 7 },
      );
      expect(result).toEqual(mockExpenses);
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

      const result = await service.findAll({
        page: 1,
        limit: 20,
        year: 2026,
        month: 7,
        search: 'comida',
      });

      // Verify all filters are applied
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'EXTRACT(year FROM expense.date) = :year',
        { year: 2026 },
      );
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'EXTRACT(month FROM expense.date) = :month',
        { month: 7 },
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
