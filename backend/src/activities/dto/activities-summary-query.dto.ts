import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

/**
 * spec-034: params de `GET /activities/summary` — mismos flags de inclusión
 * que `ListActivitiesQueryDto`, sin paginación (es una agregación, no una
 * lista) ni `status`/`dueFilter` (el summary siempre agrupa por los 7
 * estados a la vez).
 */
export class ActivitiesSummaryQueryDto {
  @ApiPropertyOptional({
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    description: 'Acota los conteos a un proyecto específico',
  })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({
    default: false,
    description:
      'Incluye plantillas de recurrencia (isTemplate = true) en los conteos.',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value === 'true' : value,
  )
  @IsBoolean()
  includeTemplates?: boolean;

  @ApiPropertyOptional({
    default: false,
    description: 'Incluye subtareas (parent != null) en los conteos.',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value === 'true' : value,
  )
  @IsBoolean()
  includeSubtasks?: boolean;
}
