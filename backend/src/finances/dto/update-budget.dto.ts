import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateBudgetDto {
  @ApiPropertyOptional({ example: 'Presupuesto junio 2026 revisado', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 6 })
  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  month?: number;

  @ApiPropertyOptional({ example: 2026 })
  @IsInt()
  @Min(2020)
  @IsOptional()
  year?: number;
}
