import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCreditCardDto {
  @ApiProperty({ example: 'Visa Platinum', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'Bancolombia', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  bank: string;

  @ApiProperty({ example: 0.2799, description: 'Tasa de interés anual (ej. 0.2799 = 27.99%)' })
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  interestRate: number;

  @ApiProperty({ example: 25000, description: 'Cuota de manejo mensual en COP' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  monthlyFee: number;

  @ApiProperty({ example: 10000000, description: 'Cupo total en COP' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  totalLimit: number;

  @ApiProperty({ example: 7500000, description: 'Cupo disponible en COP' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  availableLimit: number;
}
