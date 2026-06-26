import apiClient from '../../lib/api-client';
import type { Account, CreateAccountDto, UpdateAccountDto, PaginationParams } from '../../types';

export async function getAccounts(params?: PaginationParams): Promise<Account[]> {
  const { data } = await apiClient.get<{ data: Account[] }>('/finances/accounts', { params });
  return data.data;
}

export async function getAccount(id: string): Promise<Account> {
  const { data } = await apiClient.get<{ data: Account }>(`/finances/accounts/${id}`);
  return data.data;
}

export async function createAccount(dto: CreateAccountDto): Promise<Account> {
  const { data } = await apiClient.post<{ data: Account }>('/finances/accounts', dto);
  return data.data;
}

export async function updateAccount(id: string, dto: UpdateAccountDto): Promise<Account> {
  const { data } = await apiClient.patch<{ data: Account }>(`/finances/accounts/${id}`, dto);
  return data.data;
}

export async function deleteAccount(id: string): Promise<void> {
  await apiClient.delete(`/finances/accounts/${id}`);
}
