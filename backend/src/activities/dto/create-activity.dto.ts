import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { ActivityStatus } from '../../common/enums/activity-status.enum';
import { ActivityType } from '../../common/enums/activity-type.enum';
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

  /**
   * Semántica según tipo:
   * - TASK: fecha límite (hora truncada a medianoche)
   * - REMINDER: fecha y hora del recordatorio
   */
  @ApiPropertyOptional({ example: '2026-04-13T18:00:00Z' })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({ enum: Priority, default: Priority.MEDIUM })
  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @ApiPropertyOptional({ enum: ActivityStatus, default: ActivityStatus.PENDING })
  @IsEnum(ActivityStatus)
  @IsOptional()
  status?: ActivityStatus;

  @ApiPropertyOptional({ enum: Energy, default: Energy.MEDIUM })
  @IsEnum(Energy)
  @IsOptional()
  energy?: Energy;

  @ApiPropertyOptional({ enum: ActivityType, default: ActivityType.TASK })
  @IsEnum(ActivityType)
  @IsOptional()
  type?: ActivityType;

  @ApiPropertyOptional({ description: 'UUID de la actividad padre (subtarea)' })
  @IsUUID()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({ description: 'Schedule this activity to appear in the Today view' })
  @IsBoolean()
  @IsOptional()
  scheduledForToday?: boolean;

  @ApiPropertyOptional({ description: 'URL of an associated Notion page' })
  @IsString()
  @IsUrl()
  @IsOptional()
  notionUrl?: string | null;

  // ─── Recurrence ─────────────────────────────────────────────────────────────

  @ApiPropertyOptional({ description: 'Mark this activity as a recurring template' })
  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;

  @ApiPropertyOptional({ enum: RecurrenceFrequency, description: 'Required when isRecurring is true' })
  @IsEnum(RecurrenceFrequency)
  @ValidateIf((o) => o.isRecurring === true)
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

  @ApiPropertyOptional({ description: 'Day of month (1-31). Required for monthly frequency.' })
  @IsInt()
  @Min(1)
  @Max(31)
  @ValidateIf((o) => o.recurrenceFrequency === RecurrenceFrequency.MONTHLY)
  @IsOptional()
  recurrenceDayOfMonth?: number;

  @ApiPropertyOptional({ description: 'Date until which instances are generated (null = indefinite)' })
  @IsDateString()
  @IsOptional()
  recurrenceEndDate?: string;
}
