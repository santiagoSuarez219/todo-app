import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Budget } from './entities/budget.entity';
import { BudgetItem } from './entities/budget-item.entity';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { CreateBudgetItemDto } from './dto/create-budget-item.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class BudgetsService {
  constructor(
    @InjectRepository(Budget)
    private readonly budgetsRepository: Repository<Budget>,
    @InjectRepository(BudgetItem)
    private readonly budgetItemsRepository: Repository<BudgetItem>,
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
      .orderBy('budget.year', 'DESC')
      .addOrderBy('budget.month', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (year) qb.andWhere('budget.year = :year', { year });
    if (month) qb.andWhere('budget.month = :month', { month });

    return qb.getMany();
  }

  async findOne(id: string): Promise<Budget> {
    const budget = await this.budgetsRepository
      .createQueryBuilder('budget')
      .leftJoinAndSelect('budget.items', 'items')
      .where('budget.id = :id', { id })
      .getOne();

    if (!budget) throw new NotFoundException(`Budget ${id} not found`);
    return budget;
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

  async removeItem(budgetId: string, itemId: string): Promise<void> {
    const item = await this.budgetItemsRepository.findOne({
      where: { id: itemId, budget: { id: budgetId } },
    });
    if (!item) throw new NotFoundException(`BudgetItem ${itemId} not found in budget ${budgetId}`);
    await this.budgetItemsRepository.remove(item);
  }
}
