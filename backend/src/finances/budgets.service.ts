import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Budget } from './entities/budget.entity';
import { BudgetItem } from './entities/budget-item.entity';
import { Income } from './entities/income.entity';
import { Expense } from './entities/expense.entity';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { CreateBudgetItemDto } from './dto/create-budget-item.dto';
import { UpdateBudgetItemDto } from './dto/update-budget-item.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ExpenseType } from '../common/enums/expense-type.enum';

export interface BudgetTypeSummary {
  type: ExpenseType;
  total: number;
  percentage: number;
}

export interface BudgetDetail extends Budget {
  typeSummary: BudgetTypeSummary[];
  totalIncome: number;
}

export interface MonthlySummary {
  year: number;
  month: number;
  budgetTotal: number;
  expensesTotal: number;
  combinedTotal: number;
  budgetId: string | null;
}

@Injectable()
export class BudgetsService {
  constructor(
    @InjectRepository(Budget)
    private readonly budgetsRepository: Repository<Budget>,
    @InjectRepository(BudgetItem)
    private readonly budgetItemsRepository: Repository<BudgetItem>,
    @InjectRepository(Income)
    private readonly incomesRepository: Repository<Income>,
    @InjectRepository(Expense)
    private readonly expensesRepository: Repository<Expense>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateBudgetDto): Promise<Budget> {
    return this.dataSource.transaction(async (manager) => {
      const budget = manager.create(Budget, {
        name: dto.name,
        month: dto.month,
        year: dto.year,
      });
      const savedBudget = await manager.save(budget);

      if (dto.items?.length) {
        const items = dto.items.map((item) =>
          manager.create(BudgetItem, { ...item, budget: savedBudget }),
        );
        await manager.save(items);
        savedBudget.items = items;
      } else {
        savedBudget.items = [];
      }

      return savedBudget;
    });
  }

  findAll(
    { page = 1, limit = 20 }: PaginationDto,
    year?: number,
    month?: number,
  ): Promise<Budget[]> {
    const qb = this.budgetsRepository
      .createQueryBuilder('budget')
      .leftJoinAndSelect('budget.items', 'items')
      .orderBy('budget.year', 'DESC')
      .addOrderBy('budget.month', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (year) qb.andWhere('budget.year = :year', { year });
    if (month) qb.andWhere('budget.month = :month', { month });

    return qb.getMany();
  }

  async findOne(id: string): Promise<BudgetDetail> {
    const budget = await this.budgetsRepository
      .createQueryBuilder('budget')
      .leftJoinAndSelect('budget.items', 'items')
      .where('budget.id = :id', { id })
      .getOne();

    if (!budget) throw new NotFoundException(`Budget ${id} not found`);

    const [totalIncome, expenses] = await Promise.all([
      this.incomesRepository
        .createQueryBuilder('income')
        .select('COALESCE(SUM(income.amount), 0)', 'total')
        .where('EXTRACT(month FROM income.date) = :month', { month: budget.month })
        .andWhere('EXTRACT(year FROM income.date) = :year', { year: budget.year })
        .getRawOne()
        .then((r) => Number(r.total)),
      this.expensesRepository
        .createQueryBuilder('expense')
        .where('EXTRACT(month FROM expense.date) = :month', { month: budget.month })
        .andWhere('EXTRACT(year FROM expense.date) = :year', { year: budget.year })
        .getMany(),
    ]);

    const typeSummary = this.computeTypeSummary(budget.items ?? [], expenses, totalIncome);

    return { ...budget, totalIncome, typeSummary };
  }

  private computeTypeSummary(
    items: BudgetItem[],
    expenses: Expense[],
    totalIncome: number,
  ): BudgetTypeSummary[] {
    const totals = new Map<ExpenseType, number>();

    for (const item of items) {
      totals.set(item.type, (totals.get(item.type) ?? 0) + Number(item.plannedAmount));
    }

    for (const expense of expenses) {
      totals.set(expense.type, (totals.get(expense.type) ?? 0) + Number(expense.amount));
    }

    return Array.from(totals.entries()).map(([type, total]) => ({
      type,
      total,
      percentage: totalIncome > 0 ? Math.round((total / totalIncome) * 10000) / 100 : 0,
    }));
  }

  async update(id: string, dto: UpdateBudgetDto): Promise<Budget> {
    const budget = await this.findOne(id);
    Object.assign(budget, dto);
    return this.budgetsRepository.save(budget);
  }

  async remove(id: string): Promise<void> {
    const budget = await this.findOne(id);
    await this.budgetsRepository.remove(budget);
  }

  async addItem(budgetId: string, dto: CreateBudgetItemDto): Promise<BudgetItem> {
    const budget = await this.findOne(budgetId);
    const item = this.budgetItemsRepository.create({ ...dto, budget });
    return this.budgetItemsRepository.save(item);
  }

  async updateItem(budgetId: string, itemId: string, dto: UpdateBudgetItemDto): Promise<BudgetItem> {
    const item = await this.budgetItemsRepository.findOne({
      where: { id: itemId, budget: { id: budgetId } },
    });
    if (!item) throw new NotFoundException(`BudgetItem ${itemId} not found in budget ${budgetId}`);
    Object.assign(item, dto);
    return this.budgetItemsRepository.save(item);
  }

  async getMonthlySummary(year: number, month: number): Promise<MonthlySummary> {
    const budget = await this.budgetsRepository
      .createQueryBuilder('budget')
      .leftJoinAndSelect('budget.items', 'items')
      .where('budget.year = :year', { year })
      .andWhere('budget.month = :month', { month })
      .getOne();

    const budgetTotal = budget
      ? (budget.items ?? []).reduce((sum, item) => sum + Number(item.plannedAmount), 0)
      : 0;

    const expensesTotal = await this.expensesRepository
      .createQueryBuilder('expense')
      .select('COALESCE(SUM(expense.amount), 0)', 'total')
      .where('EXTRACT(month FROM expense.date) = :month', { month })
      .andWhere('EXTRACT(year FROM expense.date) = :year', { year })
      .getRawOne()
      .then((r) => Number(r.total));

    return {
      year,
      month,
      budgetTotal,
      expensesTotal,
      combinedTotal: budgetTotal + expensesTotal,
      budgetId: budget?.id ?? null,
    };
  }

  async removeItem(budgetId: string, itemId: string): Promise<void> {
    const item = await this.budgetItemsRepository.findOne({
      where: { id: itemId, budget: { id: budgetId } },
    });
    if (!item) throw new NotFoundException(`BudgetItem ${itemId} not found in budget ${budgetId}`);
    await this.budgetItemsRepository.remove(item);
  }
}
