import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ActivityStatus } from '../../common/enums/activity-status.enum';

/**
 * spec-036: params de `GET /activities/mode/:mode`. Sin `status`, se aplican
 * los estados activos por defecto (ver `ActivitiesService.findByMode`).
 */
export class ActivitiesByModeQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: ActivityStatus,
    isArray: true,
    description:
      'Sustituye la lista de estados activos por defecto. Separado por comas.',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }): unknown =>
    Array.isArray(value)
      ? value
      : typeof value === 'string'
        ? value.split(',').filter(Boolean)
        : value,
  )
  @IsArray()
  @IsEnum(ActivityStatus, { each: true })
  status?: ActivityStatus[];

  @ApiPropertyOptional({ description: 'Acota a un proyecto' })
  @IsOptional()
  @IsUUID()
  projectId?: string;
}
