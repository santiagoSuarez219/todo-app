import apiClient from '../../lib/api-client';
import type { Purchase, CreatePurchaseDto, UpdatePurchaseDto, PaginationParams, PurchaseStatus } from '../../types';

export async function getPurchases(params?: PaginationParams, status?: PurchaseStatus): Promise<Purchase[]> {
  const { data } = await apiClient.get<{ data: Purchase[] }>('/finances/purchases', {
    params: { ...params, ...(status ? { status } : {}) },
  });
  return data.data;
}

export async function getPurchase(id: string): Promise<Purchase> {
  const { data } = await apiClient.get<{ data: Purchase }>(`/finances/purchases/${id}`);
  return data.data;
}

export async function createPurchase(dto: CreatePurchaseDto): Promise<Purchase> {
  const { data } = await apiClient.post<{ data: Purchase }>('/finances/purchases', dto);
  return data.data;
}

export async function updatePurchase(id: string, dto: UpdatePurchaseDto): Promise<Purchase> {
  const { data } = await apiClient.patch<{ data: Purchase }>(`/finances/purchases/${id}`, dto);
  return data.data;
}

export async function deletePurchase(id: string): Promise<void> {
  await apiClient.delete(`/finances/purchases/${id}`);
}
