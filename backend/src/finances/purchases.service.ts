import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Purchase } from './entities/purchase.entity';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PurchaseStatus } from '../common/enums/purchase-status.enum';

@Injectable()
export class PurchasesService {
  constructor(
    @InjectRepository(Purchase)
    private readonly purchasesRepository: Repository<Purchase>,
  ) {}

  create(dto: CreatePurchaseDto): Promise<Purchase> {
    const purchase = this.purchasesRepository.create(dto);
    return this.purchasesRepository.save(purchase);
  }

  findAll({ page = 1, limit = 20 }: PaginationDto, status?: PurchaseStatus): Promise<Purchase[]> {
    const where = status ? { status } : {};
    return this.purchasesRepository.find({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async findOne(id: string): Promise<Purchase> {
    const purchase = await this.purchasesRepository.findOneBy({ id });
    if (!purchase) throw new NotFoundException(`Purchase ${id} not found`);
    return purchase;
  }

  async update(id: string, dto: UpdatePurchaseDto): Promise<Purchase> {
    const purchase = await this.findOne(id);
    Object.assign(purchase, dto);
    return this.purchasesRepository.save(purchase);
  }

  async remove(id: string): Promise<void> {
    const purchase = await this.findOne(id);
    await this.purchasesRepository.remove(purchase);
  }
}
