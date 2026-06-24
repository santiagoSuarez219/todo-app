import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreditCard } from './entities/credit-card.entity';
import { CreateCreditCardDto } from './dto/create-credit-card.dto';
import { UpdateCreditCardDto } from './dto/update-credit-card.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class CreditCardsService {
  constructor(
    @InjectRepository(CreditCard)
    private readonly creditCardsRepository: Repository<CreditCard>,
  ) {}

  create(dto: CreateCreditCardDto): Promise<CreditCard> {
    const card = this.creditCardsRepository.create(dto);
    return this.creditCardsRepository.save(card);
  }

  findAll({ page = 1, limit = 20 }: PaginationDto): Promise<CreditCard[]> {
    return this.creditCardsRepository.find({
      order: { name: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async findOne(id: string): Promise<CreditCard> {
    const card = await this.creditCardsRepository.findOneBy({ id });
    if (!card) throw new NotFoundException(`CreditCard ${id} not found`);
    return card;
  }

  async update(id: string, dto: UpdateCreditCardDto): Promise<CreditCard> {
    const card = await this.findOne(id);
    Object.assign(card, dto);
    return this.creditCardsRepository.save(card);
  }

  async remove(id: string): Promise<void> {
    const card = await this.findOne(id);
    await this.creditCardsRepository.remove(card);
  }
}
