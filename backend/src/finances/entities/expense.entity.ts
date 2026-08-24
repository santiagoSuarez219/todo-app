import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ExpenseType } from '../../common/enums/expense-type.enum';
import { CreditCard } from './credit-card.entity';
import { Budget } from './budget.entity';
import { Debt } from './debt.entity';

// spec-034: Expense absorbe a BudgetItem — una sola entidad para gastos
// planeados (`plannedAmount`) y ejecutados (`amount` + `date`), que pueden
// coexistir en la misma fila. Ver "Semántica derivada" en spec-034 para el
// estado calculado (planned | executed | settled).
@Entity('expenses')
@Index('UQ_expenses_debt_installment', ['debt', 'installmentNumber'], {
  unique: true,
  where: '"debtId" IS NOT NULL',
})
@Index('IDX_expenses_budgetId', ['budget'])
@Check(
  'CHK_expenses_has_amount',
  '"amount" IS NOT NULL OR "plannedAmount" IS NOT NULL',
)
@Check(
  'CHK_expenses_amount_date_together',
  '("amount" IS NULL) = ("date" IS NULL)',
)
export class Expense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  // Monto real ya ejecutado. Nullable: un gasto solo planeado no lo tiene.
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  amount: number | null;

  // Fecha real de ejecución. Nullable en conjunto con `amount` (siempre
  // van juntos — ver CHK_expenses_amount_date_together).
  @Column({ type: 'date', nullable: true })
  date: string | null;

  // Monto planeado del presupuesto. Nullable: un gasto ejecutado sin plan
  // previo no lo tiene.
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  plannedAmount: number | null;

  @Column({ type: 'enum', enum: ExpenseType })
  type: ExpenseType;

  // Presupuesto al que pertenece. Nullable: un gasto suelto (sin
  // presupuesto para su mes) se ubica por `date` — ver spec-034, decisión 3.
  @ManyToOne(() => Budget, (budget) => budget.expenses, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'budgetId' })
  budget: Budget | null;

  @ManyToOne(() => CreditCard, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'creditCardId' })
  creditCard: CreditCard | null;

  // Heredados de BudgetItem (spec-026): presentes cuando el gasto es una
  // cuota de deuda materializada automáticamente.
  @ManyToOne(() => Debt, { nullable: true, onDelete: 'CASCADE' })
  debt: Debt | null;

  @Column({ type: 'int', nullable: true })
  installmentNumber: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // No persistido — calculado por ExpensesService al serializar la
  // respuesta (ver "Semántica derivada" en spec-034). Sin @Column: TypeORM
  // lo ignora para persistencia, solo vive en memoria.
  executionStatus?: 'planned' | 'executed' | 'settled';
}
