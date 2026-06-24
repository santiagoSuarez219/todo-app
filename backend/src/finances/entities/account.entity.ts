import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AccountType } from '../../common/enums/account-type.enum';

@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'enum', enum: AccountType })
  type: AccountType;

  @Column({ type: 'varchar', length: 255 })
  bank: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  currentBalance: number;

  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true })
  interestRate: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
