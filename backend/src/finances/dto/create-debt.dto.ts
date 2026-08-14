import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateDebtDto {
  @ApiProperty({ example: 'Nevera Samsung', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  description: string;

  @ApiProperty({ example: 2500000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  productValue: number;

  @ApiProperty({ example: 208333 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  installmentValue: number;

  @ApiProperty({ example: 12 })
  @IsInt()
  @Min(1)
  totalInstallments: number;

  @ApiPropertyOptional({ example: 500000 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  initialPayment?: number;

  @ApiProperty({
    example: 9,
    description:
      'Mes (1-12) en el que cae la primera cuota. Determina el calendario completo de cuotas materializadas en presupuestos.',
  })
  @IsInt()
  @Min(1)
  @Max(12)
  startMonth: number;

  @ApiProperty({
    example: 2026,
    description: 'Año en el que cae la primera cuota.',
  })
  @IsInt()
  @Min(2000)
  startYear: number;
}
