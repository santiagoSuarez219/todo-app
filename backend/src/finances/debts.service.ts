import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Debt } from './entities/debt.entity';
import { Expense } from './entities/expense.entity';
import { CreateDebtDto } from './dto/create-debt.dto';
import { UpdateDebtDto } from './dto/update-debt.dto';
import { DebtStatus } from '../common/enums/debt-status.enum';
import { ExpenseType } from '../common/enums/expense-type.enum';

export interface DebtWithRemaining extends Omit<Debt, never> {
  remainingValue: number;
}

@Injectable()
export class DebtsService {
  constructor(
    @InjectRepository(Debt)
    private readonly debtsRepository: Repository<Debt>,
    @InjectRepository(Expense)
    private readonly expensesRepository: Repository<Expense>,
  ) {}

  private withRemaining(debt: Debt): DebtWithRemaining {
    const remaining =
      (debt.totalInstallments - debt.paidInstallments) * debt.installmentValue;
    return { ...debt, remainingValue: Math.max(0, remaining) };
  }

  async findAll(status?: DebtStatus): Promise<DebtWithRemaining[]> {
    const where = status ? { status } : {};
    const debts = await this.debtsRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
    return debts.map((d) => this.withRemaining(d));
  }

  async findOne(id: string): Promise<DebtWithRemaining> {
    const debt = await this.debtsRepository.findOneBy({ id });
    if (!debt) throw new NotFoundException(`Debt ${id} not found`);
    return this.withRemaining(debt);
  }

  async create(dto: CreateDebtDto): Promise<DebtWithRemaining> {
    const debt = this.debtsRepository.create(dto);
    const saved = await this.debtsRepository.save(debt);
    return this.withRemaining(saved);
  }

  async update(id: string, dto: UpdateDebtDto): Promise<DebtWithRemaining> {
    const debt = await this.debtsRepository.findOneBy({ id });
    if (!debt) throw new NotFoundException(`Debt ${id} not found`);
    Object.assign(debt, dto);
    const saved = await this.debtsRepository.save(debt);
    return this.withRemaining(saved);
  }

  async remove(id: string): Promise<void> {
    const debt = await this.debtsRepository.findOneBy({ id });
    if (!debt) throw new NotFoundException(`Debt ${id} not found`);
    await this.debtsRepository.remove(debt);
  }

  async payInstallment(
    id: string,
  ): Promise<{ debt: DebtWithRemaining; expenseId: string }> {
    const debt = await this.debtsRepository.findOneBy({ id });
    if (!debt) throw new NotFoundException(`Debt ${id} not found`);
    if (debt.status === DebtStatus.PAID) {
      throw new BadRequestException(`Debt ${id} is already fully paid`);
    }

    const today = new Date().toISOString().split('T')[0];
    const expense = this.expensesRepository.create({
      description: `Cuota: ${debt.description}`,
      amount: debt.installmentValue,
      date: today,
      type: ExpenseType.PAGO_DEUDA,
    });
    const savedExpense = await this.expensesRepository.save(expense);

    debt.paidInstallments += 1;
    if (debt.paidInstallments >= debt.totalInstallments) {
      debt.status = DebtStatus.PAID;
    }
    const savedDebt = await this.debtsRepository.save(debt);

    return { debt: this.withRemaining(savedDebt), expenseId: savedExpense.id };
  }
}
