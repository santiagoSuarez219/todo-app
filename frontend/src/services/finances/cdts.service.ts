import apiClient from '../../lib/api-client';
import type { Cdt, CreateCdtDto, UpdateCdtDto, PaginationParams } from '../../types';

export async function getCdts(params?: PaginationParams): Promise<Cdt[]> {
  const { data } = await apiClient.get<{ data: Cdt[] }>('/finances/cdts', { params });
  return data.data;
}

export async function getCdt(id: string): Promise<Cdt> {
  const { data } = await apiClient.get<{ data: Cdt }>(`/finances/cdts/${id}`);
  return data.data;
}

export async function getActiveCdts(): Promise<Cdt[]> {
  const { data } = await apiClient.get<{ data: Cdt[] }>('/finances/cdts/active');
  return data.data;
}

export async function createCdt(dto: CreateCdtDto): Promise<Cdt> {
  const { data } = await apiClient.post<{ data: Cdt }>('/finances/cdts', dto);
  return data.data;
}

export async function updateCdt(id: string, dto: UpdateCdtDto): Promise<Cdt> {
  const { data } = await apiClient.patch<{ data: Cdt }>(`/finances/cdts/${id}`, dto);
  return data.data;
}

export async function deleteCdt(id: string): Promise<void> {
  await apiClient.delete(`/finances/cdts/${id}`);
}
