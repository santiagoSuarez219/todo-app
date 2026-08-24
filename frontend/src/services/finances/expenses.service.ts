import apiClient from '../../lib/api-client';
import type { Expense, CreateExpenseDto, UpdateExpenseDto, DuplicateExpenseDto, PaginationParams } from '../../types';

export interface GetExpensesFilters {
  year?: number;
  month?: number;
  search?: string;
  /** spec-034: gastos de un presupuesto puntual. */
  budgetId?: string;
  /** spec-034: solo planeados sin ejecutar (amount IS NULL). */
  planned?: boolean;
  /** spec-034: solo ejecutados (amount IS NOT NULL). */
  executed?: boolean;
}

export async function getExpenses(
  params?: PaginationParams,
  year?: number,
  month?: number,
  search?: string,
  filters?: Pick<GetExpensesFilters, 'budgetId' | 'planned' | 'executed'>,
): Promise<Expense[]> {
  const { data } = await apiClient.get<{ data: Expense[] }>('/finances/expenses', {
    params: {
      ...params,
      ...(year ? { year } : {}),
      ...(month ? { month } : {}),
      ...(search ? { search } : {}),
      ...(filters?.budgetId ? { budgetId: filters.budgetId } : {}),
      ...(filters?.planned ? { planned: true } : {}),
      ...(filters?.executed ? { executed: true } : {}),
    },
  });
  return data.data;
}

export async function getExpense(id: string): Promise<Expense> {
  const { data } = await apiClient.get<{ data: Expense }>(`/finances/expenses/${id}`);
  return data.data;
}

export async function createExpense(dto: CreateExpenseDto): Promise<Expense> {
  const { data } = await apiClient.post<{ data: Expense }>('/finances/expenses', dto);
  return data.data;
}

export async function updateExpense(id: string, dto: UpdateExpenseDto): Promise<Expense> {
  const { data } = await apiClient.patch<{ data: Expense }>(`/finances/expenses/${id}`, dto);
  return data.data;
}

export async function deleteExpense(id: string): Promise<void> {
  await apiClient.delete(`/finances/expenses/${id}`);
}

export async function duplicateExpense(id: string, dto: DuplicateExpenseDto): Promise<Expense> {
  const { data } = await apiClient.post<{ data: Expense }>(`/finances/expenses/${id}/duplicate`, dto);
  return data.data;
}
