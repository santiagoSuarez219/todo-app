import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

export class DuplicateExpenseDto {
  @ApiProperty({ example: 7, description: 'Mes destino (1–12)' })
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @ApiProperty({ example: 2026, description: 'Año destino (>= 2020)' })
  @IsInt()
  @Min(2020)
  year: number;
}
