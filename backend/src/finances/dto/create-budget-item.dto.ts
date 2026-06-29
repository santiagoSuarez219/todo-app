import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { ExpenseType } from '../../common/enums/expense-type.enum';

export class CreateBudgetItemDto {
  @ApiProperty({ example: 'Arriendo', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  description: string;

  @ApiProperty({ example: 1200000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  plannedAmount: number;

  @ApiProperty({ enum: ExpenseType })
  @IsEnum(ExpenseType)
  type: ExpenseType;
}
