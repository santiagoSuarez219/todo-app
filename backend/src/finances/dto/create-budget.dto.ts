import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

// spec-034, decisión 11: el presupuesto nace vacío. Los gastos se agregan
// después vía POST /finances/expenses con `budgetId`.
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
}
