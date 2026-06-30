import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Income } from './entities/income.entity';
import { CreateIncomeDto } from './dto/create-income.dto';
import { UpdateIncomeDto } from './dto/update-income.dto';
import { IncomesQueryDto } from './dto/incomes-query.dto';

@Injectable()
export class IncomesService {
  constructor(
    @InjectRepository(Income)
    private readonly incomesRepository: Repository<Income>,
  ) {}

  create(dto: CreateIncomeDto): Promise<Income> {
    const income = this.incomesRepository.create(dto);
    return this.incomesRepository.save(income);
  }

  findAll({ page = 1, limit = 20, year, month }: IncomesQueryDto): Promise<Income[]> {
    const qb = this.incomesRepository
      .createQueryBuilder('income')
      .orderBy('income.date', 'DESC')
      .addOrderBy('income.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (year) qb.andWhere('EXTRACT(year FROM income.date) = :year', { year });
    if (month) qb.andWhere('EXTRACT(month FROM income.date) = :month', { month });

    return qb.getMany();
  }

  async findOne(id: string): Promise<Income> {
    const income = await this.incomesRepository.findOneBy({ id });
    if (!income) throw new NotFoundException(`Income ${id} not found`);
    return income;
  }

  async update(id: string, dto: UpdateIncomeDto): Promise<Income> {
    const income = await this.findOne(id);
    Object.assign(income, dto);
    return this.incomesRepository.save(income);
  }

  async remove(id: string): Promise<void> {
    const income = await this.findOne(id);
    await this.incomesRepository.remove(income);
  }
}
