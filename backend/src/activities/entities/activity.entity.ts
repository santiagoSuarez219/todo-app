import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ActivityStatus } from '../../common/enums/activity-status.enum';
import { Priority } from '../../common/enums/priority.enum';
import { Energy } from '../../common/enums/energy.enum';
import { RecurrenceFrequency } from '../../common/enums/recurrence-frequency.enum';
import { Project } from '../../projects/entities/project.entity';

@Entity('activities')
export class Activity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ManyToOne(() => Project, (project) => project.activities, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  project: Project | null;

  @Column({ type: 'timestamptz', nullable: true })
  dueDate: Date | null;

  @Column({
    type: 'enum',
    enum: Priority,
    default: Priority.MEDIUM,
  })
  priority: Priority;

  @Column({
    type: 'enum',
    enum: ActivityStatus,
    default: ActivityStatus.PENDING,
  })
  status: ActivityStatus;

  @Column({
    type: 'enum',
    enum: Energy,
    default: Energy.MEDIUM,
  })
  energy: Energy;

  @Column({ type: 'boolean', default: false })
  scheduledForToday: boolean;

  @ManyToOne(() => Activity, (activity) => activity.subtasks, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  parent: Activity | null;

  @OneToMany(() => Activity, (activity) => activity.parent)
  subtasks: Activity[];

  // ─── Recurrence ─────────────────────────────────────────────────────────────

  @Column({ type: 'boolean', default: false })
  isTemplate: boolean;

  @Column({ type: 'uuid', nullable: true })
  templateId: string | null;

  @ManyToOne(() => Activity, (activity) => activity.instances, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'templateId' })
  template: Activity | null;

  @OneToMany(() => Activity, (activity) => activity.template, { eager: false })
  instances: Activity[];

  @Column({ type: 'varchar', nullable: true })
  recurrenceFrequency: RecurrenceFrequency | null;

  @Column({ type: 'integer', array: true, nullable: true })
  recurrenceDays: number[] | null;

  @Column({ type: 'integer', nullable: true })
  recurrenceDayOfMonth: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  recurrenceEndDate: Date | null;

  @Column({ type: 'date', nullable: true })
  instanceDate: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'integer', default: 0 })
  postponementCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
