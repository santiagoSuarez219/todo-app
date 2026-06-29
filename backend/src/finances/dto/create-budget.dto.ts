import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateBudgetItemDto } from './create-budget-item.dto';

export class CreateBudgetDto {
  @ApiProperty({ example: 'Presupuesto junio 2026', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 6, description: 'Mes (1–12)' })
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @ApiProperty({ example: 2026, description: 'Año (>= 2020)' })
  @IsInt()
  @Min(2020)
  year: number;

  @ApiPropertyOptional({ type: [CreateBudgetItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBudgetItemDto)
  @IsOptional()
  items?: CreateBudgetItemDto[];
}
