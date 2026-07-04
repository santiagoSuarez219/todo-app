const BUDGET_CONFLICT_PATTERN = /^Budget already exists for month (\d{1,2})\/(\d{4})$/;

export function translateBudgetError(message: string): string {
  const match = message.match(BUDGET_CONFLICT_PATTERN);
  if (match) {
    const [, month, year] = match;
    return `Ya existe un presupuesto para el mes ${month}/${year}`;
  }
  return message;
}
