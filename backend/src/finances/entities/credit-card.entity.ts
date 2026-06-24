import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('credit_cards')
export class CreditCard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  bank: string;

  @Column({ type: 'decimal', precision: 5, scale: 4 })
  interestRate: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  monthlyFee: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  totalLimit: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  availableLimit: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
