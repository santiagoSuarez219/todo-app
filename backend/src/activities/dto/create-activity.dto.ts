import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { ActivityStatus } from '../../common/enums/activity-status.enum';
import { Energy } from '../../common/enums/energy.enum';
import { Priority } from '../../common/enums/priority.enum';
import { RecurrenceFrequency } from '../../common/enums/recurrence-frequency.enum';

export class CreateActivityDto {
  @ApiProperty({ example: 'Revisar PRs', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Descripcion detallada de la actividad' })
  @IsString()
  @MaxLength(5000)
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'UUID del proyecto asociado' })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({
    example: '2026-04-13T18:00:00Z',
    description: 'Fecha límite de la actividad',
  })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({ enum: Priority, default: Priority.MEDIUM })
  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @ApiPropertyOptional({
    enum: ActivityStatus,
    default: ActivityStatus.PENDING,
  })
  @IsEnum(ActivityStatus)
  @IsOptional()
  status?: ActivityStatus;

  @ApiPropertyOptional({ enum: Energy, default: Energy.MEDIUM })
  @IsEnum(Energy)
  @IsOptional()
  energy?: Energy;

  @ApiPropertyOptional({ description: 'UUID de la actividad padre (subtarea)' })
  @IsUUID()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({
    example: '2026-04-14',
    description:
      'Schedule this activity to appear in the Today view on this date. null clears it — expires on its own the day after, no cleanup job needed.',
  })
  @IsDateString()
  @IsOptional()
  scheduledFor?: string | null;

  @ApiPropertyOptional({
    example: '2026-04-20',
    description:
      'Hide this activity from active views (Today, Tomorrow, This Week, Overdue, Backlog) until this date. null clears it.',
  })
  @IsDateString()
  @IsOptional()
  deferUntil?: string | null;

  @ApiPropertyOptional({
    example: 'Contador',
    description:
      "Who/what this activity is blocked on — only meaningful when status is 'waiting'. Ignored (not saved) for any other status.",
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  waitingFor?: string | null;

  @ApiPropertyOptional({
    example: '2026-04-10',
    description:
      "Date since when this activity has been waiting — only meaningful when status is 'waiting'. Defaults to today if omitted when entering waiting.",
  })
  @IsDateString()
  @IsOptional()
  waitingSince?: string | null;

  // ─── Recurrence ─────────────────────────────────────────────────────────────

  @ApiPropertyOptional({
    enum: RecurrenceFrequency,
    description:
      'Marca esta actividad como plantilla recurrente (isTemplate se deriva de este campo)',
  })
  @IsEnum(RecurrenceFrequency)
  @IsOptional()
  recurrenceFrequency?: RecurrenceFrequency;

  @ApiPropertyOptional({
    type: [Number],
    description: 'Days of week (0=Sun…6=Sat). Required for weekly/biweekly.',
  })
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  @ValidateIf(
    (o) =>
      o.recurrenceFrequency === RecurrenceFrequency.WEEKLY ||
      o.recurrenceFrequency === RecurrenceFrequency.BIWEEKLY,
  )
  @IsOptional()
  recurrenceDays?: number[];

  @ApiPropertyOptional({
    description: 'Day of month (1-31). Required for monthly frequency.',
  })
  @IsInt()
  @Min(1)
  @Max(31)
  @ValidateIf((o) => o.recurrenceFrequency === RecurrenceFrequency.MONTHLY)
  @IsOptional()
  recurrenceDayOfMonth?: number;

  @ApiPropertyOptional({
    description: 'Date until which instances are generated (null = indefinite)',
  })
  @IsDateString()
  @IsOptional()
  recurrenceEndDate?: string;
}
