import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Expense } from './expense.entity';

// spec-035: Budget deja de tener ítems propios (BudgetItem eliminada). Su
// contenido son los Expense que lo referencian por `budgetId`. Sin
// `cascade: true`: el borrado en cascada de sus gastos es una decisión de
// negocio explícita en BudgetsService.remove(), no un efecto de TypeORM.
@Entity('budgets')
@Index('UQ_budgets_month_year', ['month', 'year'], { unique: true })
export class Budget {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'integer' })
  month: number;

  @Column({ type: 'integer' })
  year: number;

  @OneToMany(() => Expense, (expense) => expense.budget)
  expenses: Expense[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
