import apiClient from '../../lib/api-client';
import type {
  Budget,
  CreateBudgetDto,
  UpdateBudgetDto,
  DuplicateBudgetDto,
  DuplicateBudgetResult,
  RemoveBudgetResult,
  MonthlySummary,
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

// spec-034, decisión 12: borrar un presupuesto borra sus gastos en cascada,
// incluidos los ejecutados — el resultado indica cuántos y por qué monto
// para que la UI advierta antes de confirmar (ver useDeleteBudget).
export async function deleteBudget(id: string): Promise<RemoveBudgetResult> {
  const { data } = await apiClient.delete<{ data: RemoveBudgetResult }>(`/finances/budgets/${id}`);
  return data.data;
}

export async function getMonthlyExpenseSummary(year: number, month: number): Promise<MonthlySummary> {
  const { data } = await apiClient.get<{ data: MonthlySummary }>('/finances/budgets/monthly-summary', {
    params: { year, month },
  });
  return data.data;
}

export async function duplicateBudget(id: string, dto: DuplicateBudgetDto): Promise<DuplicateBudgetResult> {
  const { data } = await apiClient.post<{ data: DuplicateBudgetResult }>(`/finances/budgets/${id}/duplicate`, dto);
  return data.data;
}
