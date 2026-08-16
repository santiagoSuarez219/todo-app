import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ProjectStatus } from '../../common/enums/project-status.enum';
import { ProjectHorizon } from '../../common/enums/project-horizon.enum';

export class CreateProjectDto {
  @ApiProperty({ example: 'Mi proyecto', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ enum: ProjectStatus, default: ProjectStatus.ACTIVE })
  @IsEnum(ProjectStatus)
  @IsOptional()
  status?: ProjectStatus;

  @ApiPropertyOptional({
    enum: ProjectHorizon,
    default: ProjectHorizon.NEXT,
    description: 'Horizonte temporal/estratégico del proyecto',
  })
  @IsEnum(ProjectHorizon)
  @IsOptional()
  horizon?: ProjectHorizon;

  @ApiProperty({ example: '2026-04-13' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}
