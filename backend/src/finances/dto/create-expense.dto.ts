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
import { ExpenseType } from '../../common/enums/expense-type.enum';

export class CreateExpenseDto {
  @ApiProperty({ example: 'Mercado semanal', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  description: string;

  @ApiProperty({ example: 150000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @ApiProperty({ example: '2026-06-24' })
  @IsDateString()
  date: string;

  @ApiProperty({ enum: ExpenseType })
  @IsEnum(ExpenseType)
  type: ExpenseType;
}
