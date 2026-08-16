import apiClient from '../../lib/api-client';
import type {
  Debt,
  CreateDebtDto,
  UpdateDebtDto,
  DebtStatus,
  PayOffDebtResult,
  SyncBudgetItemsResult,
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

export async function payOffDebt(id: string): Promise<PayOffDebtResult> {
  const { data } = await apiClient.post<{ data: PayOffDebtResult }>(
    `/finances/debts/${id}/pay-off`,
  );
  return data.data;
}

export async function syncDebtBudgetItems(id: string): Promise<SyncBudgetItemsResult> {
  const { data } = await apiClient.post<{ data: SyncBudgetItemsResult }>(
    `/finances/debts/${id}/sync-budget-items`,
  );
  return data.data;
}
