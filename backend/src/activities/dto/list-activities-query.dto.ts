import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ActivityStatus } from '../../common/enums/activity-status.enum';

export enum DueFilter {
  OVERDUE = 'overdue',
  NO_DATE = 'no_date',
}

/**
 * spec-034: filtros server-side compartidos por `GET /activities` y
 * `GET /activities/project/:projectId` — ver `applyListFilters()` en
 * `activities.service.ts`.
 */
export class ListActivitiesQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: ActivityStatus,
    isArray: true,
    description:
      'Filtra por uno o varios estados (unión). Se envía separado por comas ' +
      '(ej. "waiting,on_hold"). Omitido: incluye todos los estados.',
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

  @ApiPropertyOptional({
    enum: DueFilter,
    description:
      "'overdue': dueDate en el pasado y status != completed (mismo " +
      "criterio que /activities/overdue). 'no_date': dueDate = null.",
  })
  @IsOptional()
  @IsEnum(DueFilter)
  dueFilter?: DueFilter;

  @ApiPropertyOptional({
    default: false,
    description:
      'Incluye plantillas de recurrencia (isTemplate = true) en el ' +
      'resultado. Por defecto se excluyen.',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value === 'true' : value,
  )
  @IsBoolean()
  includeTemplates?: boolean;

  @ApiPropertyOptional({
    default: false,
    description:
      'Incluye subtareas (parent != null) como filas de primer nivel. Por ' +
      'defecto se excluyen.',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value === 'true' : value,
  )
  @IsBoolean()
  includeSubtasks?: boolean;
}
