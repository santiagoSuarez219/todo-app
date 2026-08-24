import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Expense } from './entities/expense.entity';
import { CreditCard } from './entities/credit-card.entity';
import { Budget } from './entities/budget.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpensesQueryDto } from './dto/expenses-query.dto';
import { DuplicateExpenseDto } from './dto/duplicate-expense.dto';
import { withExecutionStatus } from './expense-execution-status.util';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private readonly expensesRepository: Repository<Expense>,
    @InjectRepository(CreditCard)
    private readonly creditCardsRepository: Repository<CreditCard>,
    @InjectRepository(Budget)
    private readonly budgetsRepository: Repository<Budget>,
  ) {}

  async create(dto: CreateExpenseDto): Promise<Expense> {
    this.assertConsistent(dto.plannedAmount, dto.amount, dto.date);

    const expense = this.expensesRepository.create(dto);

    if (dto.creditCardId) {
      const creditCard = await this.creditCardsRepository.findOneBy({
        id: dto.creditCardId,
      });
      if (!creditCard)
        throw new NotFoundException(`CreditCard ${dto.creditCardId} not found`);
      expense.creditCard = creditCard;
    } else {
      expense.creditCard = null;
    }

    if (dto.budgetId) {
      expense.budget = await this.getBudgetOrThrow(dto.budgetId);
    } else if (dto.date) {
      // spec-034, decisión 4: auto-vínculo si el mes de `date` ya tiene
      // presupuesto. Nunca se auto-crea uno.
      expense.budget = await this.findBudgetForDate(dto.date);
    }

    return withExecutionStatus(await this.expensesRepository.save(expense));
  }

  async findAll({
    page = 1,
    limit = 20,
    year,
    month,
    creditCardId,
    budgetId,
    planned,
    executed,
    search,
  }: ExpensesQueryDto): Promise<Expense[]> {
    const qb = this.expensesRepository
      .createQueryBuilder('expense')
      .leftJoinAndSelect('expense.creditCard', 'creditCard')
      .leftJoinAndSelect('expense.budget', 'budget')
      .orderBy('expense.date', 'DESC', 'NULLS LAST')
      .addOrderBy('expense.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (year && month) {
      await this.applyMonthScope(qb, year, month);
    }
    if (creditCardId)
      qb.andWhere('expense.creditCardId = :creditCardId', { creditCardId });
    if (budgetId) qb.andWhere('expense.budgetId = :budgetId', { budgetId });
    if (planned) qb.andWhere('expense.amount IS NULL');
    if (executed) qb.andWhere('expense.amount IS NOT NULL');
    if (search)
      qb.andWhere('expense.description ILIKE :search', {
        search: `%${search.trim()}%`,
      });

    const expenses = await qb.getMany();
    return expenses.map((e) => withExecutionStatus(e));
  }

  async findOne(id: string): Promise<Expense> {
    const expense = await this.expensesRepository
      .createQueryBuilder('expense')
      .leftJoinAndSelect('expense.creditCard', 'creditCard')
      .leftJoinAndSelect('expense.budget', 'budget')
      .where('expense.id = :id', { id })
      .getOne();
    if (!expense) throw new NotFoundException(`Expense ${id} not found`);
    return withExecutionStatus(expense);
  }

  async update(id: string, dto: UpdateExpenseDto): Promise<Expense> {
    const expense = await this.findOne(id);

    const resultingPlanned =
      dto.plannedAmount !== undefined
        ? dto.plannedAmount
        : expense.plannedAmount;
    const resultingAmount =
      dto.amount !== undefined ? dto.amount : expense.amount;
    const resultingDate = dto.date !== undefined ? dto.date : expense.date;
    this.assertConsistent(
      resultingPlanned ?? undefined,
      resultingAmount ?? undefined,
      resultingDate ?? undefined,
    );

    if (dto.creditCardId !== undefined) {
      if (dto.creditCardId) {
        const creditCard = await this.creditCardsRepository.findOneBy({
          id: dto.creditCardId,
        });
        if (!creditCard)
          throw new NotFoundException(
            `CreditCard ${dto.creditCardId} not found`,
          );
        expense.creditCard = creditCard;
      } else {
        expense.creditCard = null;
      }
    }

    if (dto.budgetId !== undefined) {
      // budgetId explícito (incluido `null`) siempre gana — decisión 3.
      expense.budget = dto.budgetId
        ? await this.getBudgetOrThrow(dto.budgetId)
        : null;
    } else if (dto.date !== undefined && !expense.budget) {
      // Solo se reintenta el auto-vínculo si el gasto no tenía presupuesto:
      // un budgetId ya asignado manda sobre la fecha (decisión 3).
      expense.budget = dto.date ? await this.findBudgetForDate(dto.date) : null;
    }

    const { budgetId: _budgetId, creditCardId: _creditCardId, ...rest } = dto;
    Object.assign(expense, rest);
    return withExecutionStatus(await this.expensesRepository.save(expense));
  }

  async remove(id: string): Promise<void> {
    const expense = await this.findOne(id);
    await this.expensesRepository.remove(expense);
  }

  async duplicate(
    sourceId: string,
    dto: DuplicateExpenseDto,
  ): Promise<Expense> {
    const sourceExpense = await this.findOne(sourceId);

    let destDate: string | null = null;
    if (sourceExpense.date) {
      const [, sourceMonth, ,] = sourceExpense.date.split('-').map(Number);
      destDate = this.shiftDate(
        sourceExpense.date,
        sourceMonth,
        dto.month,
        dto.year,
      );
    }

    const newExpense = this.expensesRepository.create({
      description: sourceExpense.description,
      plannedAmount: sourceExpense.plannedAmount,
      amount: sourceExpense.amount,
      type: sourceExpense.type,
      date: destDate,
      creditCard: sourceExpense.creditCard
        ? { id: sourceExpense.creditCard.id }
        : null,
    });

    if (destDate) {
      newExpense.budget = await this.findBudgetForDate(destDate);
    }

    const savedExpense = await this.expensesRepository.save(newExpense);
    return this.findOne(savedExpense.id);
  }

  /**
   * spec-034: un gasto pertenece al mes de su presupuesto, no de su `date`
   * (decisión 3). Un gasto sin presupuesto se ubica por su `date`.
   * Compartido por findAll() y por los agregados de BudgetsService.
   */
  async applyMonthScope(
    qb: SelectQueryBuilder<Expense>,
    year: number,
    month: number,
  ): Promise<void> {
    const budget = await this.budgetsRepository.findOneBy({ month, year });
    if (budget) {
      qb.andWhere(
        '(expense.budgetId = :scopeBudgetId OR (expense.budgetId IS NULL AND EXTRACT(YEAR FROM expense.date) = :scopeYear AND EXTRACT(MONTH FROM expense.date) = :scopeMonth))',
        { scopeBudgetId: budget.id, scopeYear: year, scopeMonth: month },
      );
    } else {
      qb.andWhere(
        'expense.budgetId IS NULL AND EXTRACT(YEAR FROM expense.date) = :scopeYear AND EXTRACT(MONTH FROM expense.date) = :scopeMonth',
        { scopeYear: year, scopeMonth: month },
      );
    }
  }

  private async findBudgetForDate(date: string): Promise<Budget | null> {
    const [year, month] = date.split('-').map(Number);
    return this.budgetsRepository.findOneBy({ month, year });
  }

  private async getBudgetOrThrow(budgetId: string): Promise<Budget> {
    const budget = await this.budgetsRepository.findOneBy({ id: budgetId });
    if (!budget) throw new NotFoundException(`Budget ${budgetId} not found`);
    return budget;
  }

  /**
   * Replica en el servicio las dos invariantes protegidas por CHECK en la
   * base de datos (ver spec-034, "Semántica derivada"), para devolver un
   * 400 legible en vez de un error crudo de Postgres.
   */
  private assertConsistent(
    plannedAmount: number | undefined,
    amount: number | undefined,
    date: string | undefined,
  ): void {
    if (plannedAmount == null && amount == null) {
      throw new BadRequestException(
        'Un gasto debe tener al menos plannedAmount o (amount y date).',
      );
    }
    if ((amount == null) !== (date == null)) {
      throw new BadRequestException(
        'amount y date deben enviarse juntos: un gasto ejecutado siempre tiene fecha.',
      );
    }
  }

  private shiftDate(
    date: string,
    sourceMonth: number,
    destMonth: number,
    destYear: number,
  ): string {
    const [, , day] = date.split('-').map(Number);
    const destLastDay = this.getLastDayOfMonth(destYear, destMonth);
    const shiftedDay = Math.min(day, destLastDay);
    return `${destYear}-${String(destMonth).padStart(2, '0')}-${String(shiftedDay).padStart(2, '0')}`;
  }

  private getLastDayOfMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
  }
}
