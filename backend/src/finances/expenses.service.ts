import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from './entities/expense.entity';
import { CreditCard } from './entities/credit-card.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpensesQueryDto } from './dto/expenses-query.dto';

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

  findAll({ page = 1, limit = 20, year, month, creditCardId }: ExpensesQueryDto): Promise<Expense[]> {
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
}
