import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { ActivityStatus } from '../../common/enums/activity-status.enum';
import { ActivityType } from '../../common/enums/activity-type.enum';
import { Device } from '../../common/enums/device.enum';
import { DurationUnit } from '../../common/enums/duration-unit.enum';
import { Energy } from '../../common/enums/energy.enum';
import { Priority } from '../../common/enums/priority.enum';

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

  @ApiPropertyOptional({ example: '2026-04-13T09:00:00Z' })
  @IsDateString()
  @IsOptional()
  actionDate?: string;

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
}
