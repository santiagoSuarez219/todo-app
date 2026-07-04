import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class DuplicateBudgetDto {
  @ApiProperty({ example: 7, description: 'Mes destino (1–12)' })
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @ApiProperty({ example: 2026, description: 'Año destino (>= 2020)' })
  @IsInt()
  @Min(2020)
  year: number;

  @ApiPropertyOptional({
    example: 'Presupuesto julio 2026',
    description: 'Nombre del presupuesto destino. Si se omite, usa el nombre del origen',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;
}
