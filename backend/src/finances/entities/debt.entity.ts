import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DebtStatus } from '../../common/enums/debt-status.enum';

@Entity('debts')
export class Debt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  productValue: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  installmentValue: number;

  @Column({ type: 'int' })
  totalInstallments: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  initialPayment: number | null;

  @Column({ type: 'enum', enum: DebtStatus, default: DebtStatus.ACTIVE })
  status: DebtStatus;

  @Column({ type: 'int' })
  startMonth: number;

  @Column({ type: 'int' })
  startYear: number;

  @Column({ type: 'timestamptz', nullable: true })
  paidOffAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
