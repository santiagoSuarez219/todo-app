import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Budget } from './entities/budget.entity';
import { Income } from './entities/income.entity';
import { Expense } from './entities/expense.entity';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { DuplicateBudgetDto } from './dto/duplicate-budget.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ExpenseType } from '../common/enums/expense-type.enum';
import { ExpensesService } from './expenses.service';
import { withExecutionStatus } from './expense-execution-status.util';

// spec-035: reemplaza a BudgetTypeSummary (que sumaba plannedAmount de
// BudgetItem y amount de Expense en el mismo acumulador — la causa del
// doble conteo). Ahora planeado y ejecutado se reportan por separado.
export interface TypeBreakdown {
  type: ExpenseType;
  planned: number;
  executed: number;
  variance: number;
  plannedPct: number;
  executedPct: number;
}

export interface BudgetDetail extends Budget {
  totalIncome: number;
  plannedTotal: number;
  executedTotal: number;
  variance: number;
  byType: TypeBreakdown[];
}

export interface BudgetListItem extends Budget {
  plannedTotal: number;
}

export interface CardTotal {
  creditCardId: string;
  name: string;
  planned: number;
  executed: number;
}

export interface MonthlySummary {
  year: number;
  month: number;
  budgetId: string | null;
  totalIncome: number;
  plannedTotal: number;
  executedTotal: number;
  variance: number;
  pendingPlannedTotal: number;
  unplannedTotal: number;
  byType: TypeBreakdown[];
  cardTotals: CardTotal[];
}

export interface DuplicateBudgetResult {
  budget: BudgetDetail;
  plannedExpensesCopied: number;
  incomesCopied: number;
}

export interface RemoveBudgetResult {
  executedExpensesRemoved: number;
  executedTotalRemoved: number;
}

@Injectable()
export class BudgetsService {
  constructor(
    @InjectRepository(Budget)
    private readonly budgetsRepository: Repository<Budget>,
    @InjectRepository(Income)
    private readonly incomesRepository: Repository<Income>,
    @InjectRepository(Expense)
    private readonly expensesRepository: Repository<Expense>,
    private readonly expensesService: ExpensesService,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateBudgetDto): Promise<Budget> {
    const budget = this.budgetsRepository.create({
      name: dto.name,
      month: dto.month,
      year: dto.year,
    });
    const savedBudget = await this.budgetsRepository.save(budget);
    savedBudget.expenses = [];
    return savedBudget;
  }

  async findAll(
    { page = 1, limit = 20 }: PaginationDto,
    year?: number,
    month?: number,
  ): Promise<BudgetListItem[]> {
    const qb = this.budgetsRepository
      .createQueryBuilder('budget')
      .leftJoinAndSelect('budget.expenses', 'expenses')
      .leftJoinAndSelect('expenses.debt', 'expensesDebt')
      .orderBy('budget.year', 'DESC')
      .addOrderBy('budget.month', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (year) qb.andWhere('budget.year = :year', { year });
    if (month) qb.andWhere('budget.month = :month', { month });

    const budgets = await qb.getMany();
    return budgets.map((budget) => ({
      ...budget,
      expenses: (budget.expenses ?? []).map((e) => withExecutionStatus(e)),
      plannedTotal: (budget.expenses ?? []).reduce(
        (sum, e) =>
          sum + (e.plannedAmount != null ? Number(e.plannedAmount) : 0),
        0,
      ),
    }));
  }

  async findOne(id: string): Promise<BudgetDetail> {
    const budget = await this.budgetsRepository
      .createQueryBuilder('budget')
      .leftJoinAndSelect('budget.expenses', 'expenses')
      .leftJoinAndSelect('expenses.debt', 'expensesDebt')
      .leftJoinAndSelect('expenses.creditCard', 'expensesCreditCard')
      .where('budget.id = :id', { id })
      .getOne();

    if (!budget) throw new NotFoundException(`Budget ${id} not found`);

    const totalIncome = await this.incomesRepository
      .createQueryBuilder('income')
      .select('COALESCE(SUM(income.amount), 0)', 'total')
      .where('EXTRACT(month FROM income.date) = :month', {
        month: budget.month,
      })
      .andWhere('EXTRACT(year FROM income.date) = :year', { year: budget.year })
      .getRawOne()
      .then((r) => Number(r.total));

    const expenses = (budget.expenses ?? []).map((e) => withExecutionStatus(e));
    const plannedTotal = this.sumPlanned(expenses);
    const executedTotal = this.sumExecuted(expenses);
    const byType = this.computeTypeBreakdown(expenses, totalIncome);

    return {
      ...budget,
      totalIncome,
      plannedTotal,
      executedTotal,
      variance: plannedTotal - executedTotal,
      byType,
    };
  }

  private sumPlanned(expenses: Expense[]): number {
    return expenses.reduce(
      (sum, e) => sum + (e.plannedAmount != null ? Number(e.plannedAmount) : 0),
      0,
    );
  }

  private sumExecuted(expenses: Expense[]): number {
    return expenses.reduce(
      (sum, e) => sum + (e.amount != null ? Number(e.amount) : 0),
      0,
    );
  }

  private computeTypeBreakdown(
    expenses: Expense[],
    totalIncome: number,
  ): TypeBreakdown[] {
    const totals = new Map<
      ExpenseType,
      { planned: number; executed: number }
    >();

    for (const expense of expenses) {
      const current = totals.get(expense.type) ?? { planned: 0, executed: 0 };
      if (expense.plannedAmount != null)
        current.planned += Number(expense.plannedAmount);
      if (expense.amount != null) current.executed += Number(expense.amount);
      totals.set(expense.type, current);
    }

    return Array.from(totals.entries()).map(
      ([type, { planned, executed }]) => ({
        type,
        planned,
        executed,
        variance: planned - executed,
        plannedPct:
          totalIncome > 0
            ? Math.round((planned / totalIncome) * 10000) / 100
            : 0,
        executedPct:
          totalIncome > 0
            ? Math.round((executed / totalIncome) * 10000) / 100
            : 0,
      }),
    );
  }

  private computeCardTotals(expenses: Expense[]): CardTotal[] {
    const totals = new Map<
      string,
      { name: string; planned: number; executed: number }
    >();

    for (const expense of expenses) {
      if (!expense.creditCard) continue;
      const current = totals.get(expense.creditCard.id) ?? {
        name: expense.creditCard.name,
        planned: 0,
        executed: 0,
      };
      if (expense.plannedAmount != null)
        current.planned += Number(expense.plannedAmount);
      if (expense.amount != null) current.executed += Number(expense.amount);
      totals.set(expense.creditCard.id, current);
    }

    return Array.from(totals.entries())
      .map(([creditCardId, { name, planned, executed }]) => ({
        creditCardId,
        name,
        planned,
        executed,
      }))
      .sort((a, b) => b.executed - a.executed);
  }

  async update(id: string, dto: UpdateBudgetDto): Promise<Budget> {
    const budget = await this.getBudgetOrThrow(id);
    Object.assign(budget, dto);
    return this.budgetsRepository.save(budget);
  }

  /**
   * spec-035, decisión 12: borrar un presupuesto borra sus gastos en
   * cascada (ON DELETE CASCADE en `expenses.budgetId`, ver migración
   * 1787100000000). Incluye gastos ya ejecutados — el conteo y monto se
   * devuelven para que la UI advierta antes de confirmar (Fase 8).
   */
  async remove(id: string): Promise<RemoveBudgetResult> {
    const budget = await this.getBudgetOrThrow(id);

    const stats = await this.expensesRepository
      .createQueryBuilder('expense')
      .select('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(expense.amount), 0)', 'total')
      .where('expense.budgetId = :id', { id })
      .andWhere('expense.amount IS NOT NULL')
      .getRawOne();

    await this.budgetsRepository.remove(budget);

    return {
      executedExpensesRemoved: Number(stats.count),
      executedTotalRemoved: Number(stats.total),
    };
  }

  private async getBudgetOrThrow(id: string): Promise<Budget> {
    const budget = await this.budgetsRepository.findOneBy({ id });
    if (!budget) throw new NotFoundException(`Budget ${id} not found`);
    return budget;
  }

  async getMonthlySummary(
    year: number,
    month: number,
  ): Promise<MonthlySummary> {
    const budget = await this.budgetsRepository.findOneBy({ year, month });

    const totalIncome = await this.incomesRepository
      .createQueryBuilder('income')
      .select('COALESCE(SUM(income.amount), 0)', 'total')
      .where('EXTRACT(month FROM income.date) = :month', { month })
      .andWhere('EXTRACT(year FROM income.date) = :year', { year })
      .getRawOne()
      .then((r) => Number(r.total));

    const qb = this.expensesRepository
      .createQueryBuilder('expense')
      .leftJoinAndSelect('expense.creditCard', 'creditCard');
    await this.expensesService.applyMonthScope(qb, year, month);
    const expenses = await qb.getMany();

    const plannedTotal = this.sumPlanned(expenses);
    const executedTotal = this.sumExecuted(expenses);
    const pendingPlannedTotal = expenses
      .filter((e) => e.plannedAmount != null && e.amount == null)
      .reduce((sum, e) => sum + Number(e.plannedAmount), 0);
    const unplannedTotal = expenses
      .filter((e) => e.plannedAmount == null && e.amount != null)
      .reduce((sum, e) => sum + Number(e.amount), 0);

    return {
      year,
      month,
      budgetId: budget?.id ?? null,
      totalIncome,
      plannedTotal,
      executedTotal,
      variance: plannedTotal - executedTotal,
      pendingPlannedTotal,
      unplannedTotal,
      byType: this.computeTypeBreakdown(expenses, totalIncome),
      cardTotals: this.computeCardTotals(expenses),
    };
  }

  async duplicate(
    sourceId: string,
    dto: DuplicateBudgetDto,
  ): Promise<DuplicateBudgetResult> {
    const sourceBudget = await this.findOne(sourceId);

    const existingBudget = await this.budgetsRepository.findOne({
      where: { month: dto.month, year: dto.year },
    });
    if (existingBudget) {
      throw new ConflictException(
        `Budget already exists for month ${dto.month}/${dto.year}`,
      );
    }

    const incomes = await this.incomesRepository
      .createQueryBuilder('income')
      .where('EXTRACT(month FROM income.date) = :month', {
        month: sourceBudget.month,
      })
      .andWhere('EXTRACT(year FROM income.date) = :year', {
        year: sourceBudget.year,
      })
      .getMany();

    // spec-035, decisión 5: duplicar copia solo el plan. Se excluyen los
    // ítems de cuota de deuda (spec-026, decisión 9): ya están, o estarán,
    // materializados por la propia deuda en el mes destino.
    const plannedExpenses = (sourceBudget.expenses ?? []).filter(
      (expense) => expense.plannedAmount != null && expense.debt == null,
    );

    return this.dataSource.transaction(async (manager) => {
      const destBudget = manager.create(Budget, {
        name: dto.name ?? sourceBudget.name,
        month: dto.month,
        year: dto.year,
      });
      const savedBudget = await manager.save(destBudget);

      let copiedExpenses: Expense[] = [];
      if (plannedExpenses.length > 0) {
        const newExpenses = plannedExpenses.map((expense) =>
          manager.create(Expense, {
            description: expense.description,
            plannedAmount: expense.plannedAmount,
            type: expense.type,
            creditCard: expense.creditCard
              ? { id: expense.creditCard.id }
              : null,
            amount: null,
            date: null,
            budget: savedBudget,
          }),
        );
        copiedExpenses = (await manager.save(newExpenses)).map((e) =>
          withExecutionStatus(e),
        );
      }

      let incomesCopied = 0;
      if (incomes.length > 0) {
        const newIncomes = incomes.map((income) =>
          manager.create(Income, {
            description: income.description,
            amount: income.amount,
            type: income.type,
            date: this.shiftDate(
              income.date,
              sourceBudget.month,
              sourceBudget.year,
              dto.month,
              dto.year,
            ),
          }),
        );
        await manager.save(newIncomes);
        incomesCopied = newIncomes.length;
      }

      const totalIncome = incomes.reduce((sum, i) => sum + Number(i.amount), 0);
      const plannedTotal = this.sumPlanned(copiedExpenses);
      const byType = this.computeTypeBreakdown(copiedExpenses, totalIncome);

      const budgetDetail: BudgetDetail = {
        id: savedBudget.id,
        name: savedBudget.name,
        month: savedBudget.month,
        year: savedBudget.year,
        expenses: copiedExpenses,
        createdAt: savedBudget.createdAt,
        updatedAt: savedBudget.updatedAt,
        totalIncome,
        plannedTotal,
        executedTotal: 0,
        variance: plannedTotal,
        byType,
      };

      return {
        budget: budgetDetail,
        plannedExpensesCopied: copiedExpenses.length,
        incomesCopied,
      };
    });
  }

  private shiftDate(
    date: string,
    sourceMonth: number,
    sourceYear: number,
    destMonth: number,
    destYear: number,
  ): string {
    const [year, month, day] = date.split('-').map(Number);
    const destLastDay = this.getLastDayOfMonth(destYear, destMonth);
    const shiftedDay = Math.min(day, destLastDay);
    return `${destYear}-${String(destMonth).padStart(2, '0')}-${String(shiftedDay).padStart(2, '0')}`;
  }

  private getLastDayOfMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
  }
}
