import apiClient from '../../lib/api-client';
import type { CreditCard, CreateCreditCardDto, UpdateCreditCardDto, PaginationParams } from '../../types';

export async function getCreditCards(params?: PaginationParams): Promise<CreditCard[]> {
  const { data } = await apiClient.get<{ data: CreditCard[] }>('/finances/credit-cards', { params });
  return data.data;
}

export async function getCreditCard(id: string): Promise<CreditCard> {
  const { data } = await apiClient.get<{ data: CreditCard }>(`/finances/credit-cards/${id}`);
  return data.data;
}

export async function createCreditCard(dto: CreateCreditCardDto): Promise<CreditCard> {
  const { data } = await apiClient.post<{ data: CreditCard }>('/finances/credit-cards', dto);
  return data.data;
}

export async function updateCreditCard(id: string, dto: UpdateCreditCardDto): Promise<CreditCard> {
  const { data } = await apiClient.patch<{ data: CreditCard }>(`/finances/credit-cards/${id}`, dto);
  return data.data;
}

export async function deleteCreditCard(id: string): Promise<void> {
  await apiClient.delete(`/finances/credit-cards/${id}`);
}
