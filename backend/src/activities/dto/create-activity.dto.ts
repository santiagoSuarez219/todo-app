import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
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
import { Device } from '../../common/enums/device.enum';
import { DurationUnit } from '../../common/enums/duration-unit.enum';
import { Energy } from '../../common/enums/energy.enum';
import { Priority } from '../../common/enums/priority.enum';
import { Automatizacion } from '../../common/enums/automatizacion.enum';
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
   * - TASK: fecha de acción (hora truncada a medianoche)
   * - REMINDER: fecha y hora del recordatorio
   * - EVENT: fecha y hora de inicio
   */
  @ApiPropertyOptional({ example: '2026-04-13T09:00:00Z' })
  @IsDateString()
  @IsOptional()
  actionDate?: string;

  /**
   * Semántica según tipo:
   * - TASK: fecha límite (hora truncada a medianoche)
   * - REMINDER: ignorado (se fuerza a null en el servicio)
   * - EVENT: fecha y hora de fin
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

  @ApiPropertyOptional({ example: 2 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  duration?: number;

  @ApiPropertyOptional({ enum: DurationUnit })
  @IsEnum(DurationUnit)
  @IsOptional()
  durationUnit?: DurationUnit;

  @ApiPropertyOptional({ enum: Device })
  @IsEnum(Device)
  @IsOptional()
  device?: Device;

  @ApiPropertyOptional({ enum: ActivityType, default: ActivityType.TASK })
  @IsEnum(ActivityType)
  @IsOptional()
  type?: ActivityType;

  @ApiPropertyOptional({ example: 'Oficina', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ description: 'UUID de la actividad padre (subtarea)' })
  @IsUUID()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({ enum: Automatizacion })
  @IsEnum(Automatizacion)
  @IsOptional()
  automatizacion?: Automatizacion;

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
