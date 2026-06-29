import apiClient from '../../lib/api-client';
import type {
  Budget,
  BudgetItem,
  CreateBudgetDto,
  UpdateBudgetDto,
  CreateBudgetItemDto,
  PaginationParams,
} from '../../types';

export async function getBudgets(
  params?: PaginationParams,
  year?: number,
  month?: number,
): Promise<Budget[]> {
  const { data } = await apiClient.get<{ data: Budget[] }>('/finances/budgets', {
    params: { ...params, ...(year ? { year } : {}), ...(month ? { month } : {}) },
  });
  return data.data;
}

export async function getBudget(id: string): Promise<Budget> {
  const { data } = await apiClient.get<{ data: Budget }>(`/finances/budgets/${id}`);
  return data.data;
}

export async function createBudget(dto: CreateBudgetDto): Promise<Budget> {
  const { data } = await apiClient.post<{ data: Budget }>('/finances/budgets', dto);
  return data.data;
}

export async function updateBudget(id: string, dto: UpdateBudgetDto): Promise<Budget> {
  const { data } = await apiClient.patch<{ data: Budget }>(`/finances/budgets/${id}`, dto);
  return data.data;
}

export async function deleteBudget(id: string): Promise<void> {
  await apiClient.delete(`/finances/budgets/${id}`);
}

export async function addBudgetItem(budgetId: string, dto: CreateBudgetItemDto): Promise<BudgetItem> {
  const { data } = await apiClient.post<{ data: BudgetItem }>(`/finances/budgets/${budgetId}/items`, dto);
  return data.data;
}

export async function deleteBudgetItem(budgetId: string, itemId: string): Promise<void> {
  await apiClient.delete(`/finances/budgets/${budgetId}/items/${itemId}`);
}
