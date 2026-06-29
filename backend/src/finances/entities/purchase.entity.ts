import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PurchasePriority } from '../../common/enums/purchase-priority.enum';
import { PurchaseStore } from '../../common/enums/purchase-store.enum';
import { PurchaseStatus } from '../../common/enums/purchase-status.enum';

@Entity('purchases')
export class Purchase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  estimatedPrice: number | null;

  @Column({ type: 'enum', enum: PurchasePriority, default: PurchasePriority.MEDIA })
  priority: PurchasePriority;

  @Column({ type: 'enum', enum: PurchaseStore, default: PurchaseStore.OTRA })
  store: PurchaseStore;

  @Column({ type: 'enum', enum: PurchaseStatus, default: PurchaseStatus.PENDIENTE })
  status: PurchaseStatus;

  @Column({ type: 'varchar', nullable: true })
  url: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
