import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { AccountType } from '../../common/enums/account-type.enum';

export class CreateAccountDto {
  @ApiProperty({ example: 'Cuenta de ahorros principal', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ enum: AccountType })
  @IsEnum(AccountType)
  type: AccountType;

  @ApiProperty({ example: 'Bancolombia', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  bank: string;

  @ApiProperty({ example: 1500000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  currentBalance: number;

  @ApiPropertyOptional({ example: 0.045, description: 'Tasa anual (ej. 0.045 = 4.5%)' })
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsOptional()
  interestRate?: number;
}
