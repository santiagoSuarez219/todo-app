import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Budget } from './budget.entity';
import { ExpenseType } from '../../common/enums/expense-type.enum';

@Entity('budget_items')
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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
