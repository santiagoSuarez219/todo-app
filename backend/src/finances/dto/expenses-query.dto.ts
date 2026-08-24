import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class ExpensesQueryDto extends PaginationDto {
  // spec-034: el mes/año lo determina ahora el presupuesto del gasto, no
  // solo su `date` — ver ExpensesService.applyMonthScope().
  @ApiPropertyOptional({ example: 2026 })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  @IsOptional()
  year?: number;

  @ApiPropertyOptional({ example: 6, minimum: 1, maximum: 12 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  month?: number;

  @ApiPropertyOptional({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @IsUUID()
  @IsOptional()
  creditCardId?: string;

  @ApiPropertyOptional({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @IsUUID()
  @IsOptional()
  budgetId?: string;

  @ApiPropertyOptional({
    description: 'Filtra solo gastos planeados sin ejecutar (amount IS NULL).',
  })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  planned?: boolean;

  @ApiPropertyOptional({
    description: 'Filtra solo gastos ejecutados (amount IS NOT NULL).',
  })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  executed?: boolean;

  @ApiPropertyOptional({ example: 'groceries' })
  @IsString()
  @IsOptional()
  search?: string;
}
