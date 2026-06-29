import apiClient from '../../lib/api-client';
import type {
  Debt,
  CreateDebtDto,
  UpdateDebtDto,
  DebtStatus,
  PayInstallmentResult,
} from '../../types';

export async function getDebts(status?: DebtStatus): Promise<Debt[]> {
  const { data } = await apiClient.get<{ data: Debt[] }>('/finances/debts', {
    params: status ? { status } : undefined,
  });
  return data.data;
}

export async function getDebt(id: string): Promise<Debt> {
  const { data } = await apiClient.get<{ data: Debt }>(`/finances/debts/${id}`);
  return data.data;
}

export async function createDebt(dto: CreateDebtDto): Promise<Debt> {
  const { data } = await apiClient.post<{ data: Debt }>('/finances/debts', dto);
  return data.data;
}

export async function updateDebt(id: string, dto: UpdateDebtDto): Promise<Debt> {
  const { data } = await apiClient.patch<{ data: Debt }>(`/finances/debts/${id}`, dto);
  return data.data;
}

export async function deleteDebt(id: string): Promise<void> {
  await apiClient.delete(`/finances/debts/${id}`);
}

export async function payInstallment(id: string): Promise<PayInstallmentResult> {
  const { data } = await apiClient.post<{ data: PayInstallmentResult }>(
    `/finances/debts/${id}/pay`,
  );
  return data.data;
}
