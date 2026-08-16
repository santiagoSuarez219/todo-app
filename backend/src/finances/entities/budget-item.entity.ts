import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Budget } from './budget.entity';
import { Debt } from './debt.entity';
import { ExpenseType } from '../../common/enums/expense-type.enum';

@Entity('budget_items')
@Index('UQ_budget_items_debt_installment', ['debt', 'installmentNumber'], {
  unique: true,
  where: '"debtId" IS NOT NULL',
})
export class BudgetItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Budget, (budget) => budget.items, { onDelete: 'CASCADE' })
  budget: Budget;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  plannedAmount: number;

  @Column({ type: 'enum', enum: ExpenseType })
  type: ExpenseType;

  @ManyToOne(() => Debt, { nullable: true, onDelete: 'CASCADE' })
  debt: Debt | null;

  @Column({ type: 'int', nullable: true })
  installmentNumber: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
