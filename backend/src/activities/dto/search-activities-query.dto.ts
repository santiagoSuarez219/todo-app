import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class SearchActivitiesQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    description: 'Filtra los resultados de búsqueda a un proyecto específico',
  })
  @IsUUID()
  @IsOptional()
  projectId?: string;
}
