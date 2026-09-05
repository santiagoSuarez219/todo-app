import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsOptional, IsUUID, ValidateIf } from 'class-validator';
import { CreateExpenseDto } from './create-expense.dto';

// spec-035: `budgetId` admite `null` explícito para desvincular un gasto de
// su presupuesto (decisión 3 — solo un budgetId explícito lo cambia una vez
// asignado, la fecha ya no re-ancla). El resto de campos hereda de
// CreateExpenseDto vía PartialType; `budgetId` se omite ahí para poder
// redeclararlo con un tipo distinto (string | null).
export class UpdateExpenseDto extends PartialType(
  OmitType(CreateExpenseDto, ['budgetId'] as const),
) {
  @ApiPropertyOptional({
    example: null,
    nullable: true,
    description:
      'Enviar `null` explícito para desvincular el gasto de su presupuesto.',
  })
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  @IsOptional()
  budgetId?: string | null;
}
