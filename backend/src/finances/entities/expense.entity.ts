import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ExpenseType } from '../../common/enums/expense-type.enum';
import { CreditCard } from './credit-card.entity';

@Entity('expenses')
export class Expense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'enum', enum: ExpenseType })
  type: ExpenseType;

  @ManyToOne(() => CreditCard, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'creditCardId' })
  creditCard: CreditCard | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
