import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

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
}
