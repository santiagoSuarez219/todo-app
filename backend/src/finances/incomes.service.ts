import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Income } from './entities/income.entity';
import { CreateIncomeDto } from './dto/create-income.dto';
import { UpdateIncomeDto } from './dto/update-income.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

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

  findAll({ page = 1, limit = 20 }: PaginationDto): Promise<Income[]> {
    return this.incomesRepository.find({
      order: { date: 'DESC', createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
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
