import apiClient from '../../lib/api-client';
import type { Income, CreateIncomeDto, UpdateIncomeDto, PaginationParams } from '../../types';

export async function getIncomes(params?: PaginationParams): Promise<Income[]> {
  const { data } = await apiClient.get<{ data: Income[] }>('/finances/incomes', { params });
  return data.data;
}

export async function getIncome(id: string): Promise<Income> {
  const { data } = await apiClient.get<{ data: Income }>(`/finances/incomes/${id}`);
  return data.data;
}

export async function createIncome(dto: CreateIncomeDto): Promise<Income> {
  const { data } = await apiClient.post<{ data: Income }>('/finances/incomes', dto);
  return data.data;
}

export async function updateIncome(id: string, dto: UpdateIncomeDto): Promise<Income> {
  const { data } = await apiClient.patch<{ data: Income }>(`/finances/incomes/${id}`, dto);
  return data.data;
}

export async function deleteIncome(id: string): Promise<void> {
  await apiClient.delete(`/finances/incomes/${id}`);
}
