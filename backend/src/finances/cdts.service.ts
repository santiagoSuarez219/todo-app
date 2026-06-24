import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cdt } from './entities/cdt.entity';
import { CreateCdtDto } from './dto/create-cdt.dto';
import { UpdateCdtDto } from './dto/update-cdt.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class CdtsService {
  constructor(
    @InjectRepository(Cdt)
    private readonly cdtsRepository: Repository<Cdt>,
  ) {}

  create(dto: CreateCdtDto): Promise<Cdt> {
    const cdt = this.cdtsRepository.create(dto);
    return this.cdtsRepository.save(cdt);
  }

  findAll({ page = 1, limit = 20 }: PaginationDto): Promise<Cdt[]> {
    return this.cdtsRepository.find({
      order: { endDate: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  findActive(): Promise<Cdt[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.cdtsRepository
      .createQueryBuilder('cdt')
      .where('cdt.endDate >= :today', { today })
      .orderBy('cdt.endDate', 'ASC')
      .getMany();
  }

  async findOne(id: string): Promise<Cdt> {
    const cdt = await this.cdtsRepository.findOneBy({ id });
    if (!cdt) throw new NotFoundException(`CDT ${id} not found`);
    return cdt;
  }

  async update(id: string, dto: UpdateCdtDto): Promise<Cdt> {
    const cdt = await this.findOne(id);
    Object.assign(cdt, dto);
    return this.cdtsRepository.save(cdt);
  }

  async remove(id: string): Promise<void> {
    const cdt = await this.findOne(id);
    await this.cdtsRepository.remove(cdt);
  }
}
