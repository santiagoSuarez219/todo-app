import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ExpenseType } from '../../common/enums/expense-type.enum';

// spec-034: amount/date dejan de ser obligatorios — un gasto puede nacer
// solo planeado (plannedAmount, sin amount/date). La validación cruzada
// (al menos uno de los dos; amount y date siempre juntos) se hace en
// ExpensesService, no aquí, porque depende del estado combinado del dto
// (ver "Semántica derivada" en spec-034).
export class CreateExpenseDto {
  @ApiProperty({ example: 'Mercado semanal', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  description: string;

  @ApiPropertyOptional({
    example: 150000,
    description: 'Monto real ya ejecutado. Requiere `date` si se envía.',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({
    example: '2026-06-24',
    description: 'Fecha real de ejecución. Requiere `amount` si se envía.',
  })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({
    example: 150000,
    description: 'Monto planeado del presupuesto.',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @IsOptional()
  plannedAmount?: number;

  @ApiProperty({ enum: ExpenseType })
  @IsEnum(ExpenseType)
  type: ExpenseType;

  @ApiPropertyOptional({
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    description:
      'Presupuesto al que pertenece. Si se omite y `date` cae en un mes con presupuesto, se asigna automáticamente.',
  })
  @IsUUID()
  @IsOptional()
  budgetId?: string;

  @ApiPropertyOptional({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @IsUUID()
  @IsOptional()
  creditCardId?: string;
}
