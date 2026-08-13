import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from './entities/expense.entity';
import { CreditCard } from './entities/credit-card.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpensesQueryDto } from './dto/expenses-query.dto';
import { DuplicateExpenseDto } from './dto/duplicate-expense.dto';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private readonly expensesRepository: Repository<Expense>,
    @InjectRepository(CreditCard)
    private readonly creditCardsRepository: Repository<CreditCard>,
  ) {}

  async create(dto: CreateExpenseDto): Promise<Expense> {
    let expense = this.expensesRepository.create(dto);

    if (dto.creditCardId) {
      const creditCard = await this.creditCardsRepository.findOneBy({ id: dto.creditCardId });
      if (!creditCard) throw new NotFoundException(`CreditCard ${dto.creditCardId} not found`);
      expense.creditCard = creditCard;
    } else {
      expense.creditCard = null;
    }

    return this.expensesRepository.save(expense);
  }

  findAll({ page = 1, limit = 20, year, month, creditCardId, search }: ExpensesQueryDto): Promise<Expense[]> {
    const qb = this.expensesRepository
      .createQueryBuilder('expense')
      .leftJoinAndSelect('expense.creditCard', 'creditCard')
      .orderBy('expense.date', 'DESC')
      .addOrderBy('expense.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (year) qb.andWhere('EXTRACT(year FROM expense.date) = :year', { year });
    if (month) qb.andWhere('EXTRACT(month FROM expense.date) = :month', { month });
    if (creditCardId) qb.andWhere('expense.creditCardId = :creditCardId', { creditCardId });
    if (search) qb.andWhere('expense.description ILIKE :search', { search: `%${search.trim()}%` });

    return qb.getMany();
  }

  async findOne(id: string): Promise<Expense> {
    const expense = await this.expensesRepository
      .createQueryBuilder('expense')
      .leftJoinAndSelect('expense.creditCard', 'creditCard')
      .where('expense.id = :id', { id })
      .getOne();
    if (!expense) throw new NotFoundException(`Expense ${id} not found`);
    return expense;
  }

  async update(id: string, dto: UpdateExpenseDto): Promise<Expense> {
    const expense = await this.findOne(id);

    if (dto.creditCardId !== undefined) {
      if (dto.creditCardId) {
        const creditCard = await this.creditCardsRepository.findOneBy({ id: dto.creditCardId });
        if (!creditCard) throw new NotFoundException(`CreditCard ${dto.creditCardId} not found`);
        expense.creditCard = creditCard;
      } else {
        expense.creditCard = null;
      }
    }

    Object.assign(expense, dto);
    return this.expensesRepository.save(expense);
  }

  async remove(id: string): Promise<void> {
    const expense = await this.findOne(id);
    await this.expensesRepository.remove(expense);
  }

  async duplicate(sourceId: string, dto: DuplicateExpenseDto): Promise<Expense> {
    const sourceExpense = await this.findOne(sourceId);

    const [sourceYear, sourceMonth, sourceDay] = sourceExpense.date.split('-').map(Number);
    const destDate = this.shiftDate(sourceExpense.date, sourceMonth, sourceYear, dto.month, dto.year);

    const newExpense = this.expensesRepository.create({
      description: sourceExpense.description,
      amount: sourceExpense.amount,
      type: sourceExpense.type,
      date: destDate,
      creditCard: sourceExpense.creditCard ? { id: sourceExpense.creditCard.id } : null,
    });

    const savedExpense = await this.expensesRepository.save(newExpense);
    return this.findOne(savedExpense.id);
  }

  private shiftDate(date: string, sourceMonth: number, sourceYear: number, destMonth: number, destYear: number): string {
    const [year, month, day] = date.split('-').map(Number);
    const destLastDay = this.getLastDayOfMonth(destYear, destMonth);
    const shiftedDay = Math.min(day, destLastDay);
    return `${destYear}-${String(destMonth).padStart(2, '0')}-${String(shiftedDay).padStart(2, '0')}`;
  }

  private getLastDayOfMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
  }
}
