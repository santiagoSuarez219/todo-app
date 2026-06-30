import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from './entities/expense.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpensesQueryDto } from './dto/expenses-query.dto';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private readonly expensesRepository: Repository<Expense>,
  ) {}

  create(dto: CreateExpenseDto): Promise<Expense> {
    const expense = this.expensesRepository.create(dto);
    return this.expensesRepository.save(expense);
  }

  findAll({ page = 1, limit = 20, year, month }: ExpensesQueryDto): Promise<Expense[]> {
    const qb = this.expensesRepository
      .createQueryBuilder('expense')
      .orderBy('expense.date', 'DESC')
      .addOrderBy('expense.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (year) qb.andWhere('EXTRACT(year FROM expense.date) = :year', { year });
    if (month) qb.andWhere('EXTRACT(month FROM expense.date) = :month', { month });

    return qb.getMany();
  }

  async findOne(id: string): Promise<Expense> {
    const expense = await this.expensesRepository.findOneBy({ id });
    if (!expense) throw new NotFoundException(`Expense ${id} not found`);
    return expense;
  }

  async update(id: string, dto: UpdateExpenseDto): Promise<Expense> {
    const expense = await this.findOne(id);
    Object.assign(expense, dto);
    return this.expensesRepository.save(expense);
  }

  async remove(id: string): Promise<void> {
    const expense = await this.findOne(id);
    await this.expensesRepository.remove(expense);
  }
}
