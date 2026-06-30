import apiClient from '../../lib/api-client';
import type { Expense, CreateExpenseDto, UpdateExpenseDto, PaginationParams } from '../../types';

export async function getExpenses(
  params?: PaginationParams,
  year?: number,
  month?: number,
): Promise<Expense[]> {
  const { data } = await apiClient.get<{ data: Expense[] }>('/finances/expenses', {
    params: { ...params, ...(year ? { year } : {}), ...(month ? { month } : {}) },
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
