import { Expense } from './entities/expense.entity';

// spec-034: estado derivado, no persistido — ver "Semántica derivada" del
// spec. Compartido por ExpensesService y BudgetsService para no duplicar la
// regla en dos lugares.
export function withExecutionStatus(expense: Expense): Expense {
  if (expense.plannedAmount != null && expense.amount == null) {
    expense.executionStatus = 'planned';
  } else if (expense.plannedAmount == null && expense.amount != null) {
    expense.executionStatus = 'executed';
  } else {
    expense.executionStatus = 'settled';
  }
  return expense;
}
