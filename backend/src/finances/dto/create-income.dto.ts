import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { IncomeType } from '../../common/enums/income-type.enum';

export class CreateIncomeDto {
  @ApiProperty({ example: 'Salario junio', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  description: string;

  @ApiProperty({ example: 3500000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @ApiProperty({ example: '2026-06-24' })
  @IsDateString()
  date: string;

  @ApiProperty({ enum: IncomeType })
  @IsEnum(IncomeType)
  type: IncomeType;
}
