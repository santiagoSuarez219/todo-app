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

  // spec-031: reemplaza al booleano scheduledForToday — una fecha caduca
  // sola (mañana ya no es hoy), el booleano necesitaba un job de limpieza
  // que nunca existió.
  @Column({ type: 'date', nullable: true })
  scheduledFor: string | null;

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

  // spec-030: fecha de calendario (no timestamptz) — diferir es una decisión
  // de día, no de instante; ver justificación en el spec.
  @Column({ type: 'date', nullable: true })
  deferUntil: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'integer', default: 0 })
  postponementCount: number;

  // spec-032: solo tienen sentido con status === 'waiting'; el servicio los
  // limpia a null en cualquier otro estado.
  @Column({ type: 'varchar', length: 255, nullable: true })
  waitingFor: string | null;

  @Column({ type: 'date', nullable: true })
  waitingSince: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
