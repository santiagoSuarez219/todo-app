import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from './entities/account.entity';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account)
    private readonly accountsRepository: Repository<Account>,
  ) {}

  create(dto: CreateAccountDto): Promise<Account> {
    const account = this.accountsRepository.create(dto);
    return this.accountsRepository.save(account);
  }

  findAll({ page = 1, limit = 20 }: PaginationDto): Promise<Account[]> {
    return this.accountsRepository.find({
      order: { name: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async findOne(id: string): Promise<Account> {
    const account = await this.accountsRepository.findOneBy({ id });
    if (!account) throw new NotFoundException(`Account ${id} not found`);
    return account;
  }

  async update(id: string, dto: UpdateAccountDto): Promise<Account> {
    const account = await this.findOne(id);
    Object.assign(account, dto);
    return this.accountsRepository.save(account);
  }

  async remove(id: string): Promise<void> {
    const account = await this.findOne(id);
    await this.accountsRepository.remove(account);
  }
}
