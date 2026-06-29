import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateCdtDto {
  @ApiProperty({ example: 'Davivienda', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  bank: string;

  @ApiProperty({ example: 5000000, description: 'Monto invertido en COP' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  investedAmount: number;

  @ApiProperty({ example: 0.125, description: 'Tasa anual (ej. 0.125 = 12.5%)' })
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  interestRate: number;

  @ApiProperty({ example: '2026-01-15' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-07-15' })
  @IsDateString()
  endDate: string;
}
