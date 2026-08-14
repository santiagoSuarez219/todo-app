import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDebts,
  getDebt,
  createDebt,
  updateDebt,
  deleteDebt,
  payOffDebt,
  syncDebtBudgetItems,
} from '../../services/finances/debts.service';
import type { CreateDebtDto, UpdateDebtDto, DebtStatus } from '../../types';

export function useDebts(status?: DebtStatus) {
  return useQuery({
    queryKey: ['debts', status ?? 'all'],
    queryFn: () => getDebts(status),
    staleTime: 60_000,
  });
}

export function useDebt(id: string) {
  return useQuery({
    queryKey: ['debts', id],
    queryFn: () => getDebt(id),
    enabled: !!id,
  });
}

function invalidateDebtRelated(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['debts'] });
  qc.invalidateQueries({ queryKey: ['budgets'] });
}

export function useCreateDebt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateDebtDto) => createDebt(dto),
    onSuccess: () => invalidateDebtRelated(qc),
  });
}

export function useUpdateDebt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateDebtDto }) => updateDebt(id, dto),
    onSuccess: () => invalidateDebtRelated(qc),
  });
}

export function useDeleteDebt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDebt(id),
    onSuccess: () => invalidateDebtRelated(qc),
  });
}

export function usePayOffDebt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => payOffDebt(id),
    onSuccess: () => {
      invalidateDebtRelated(qc);
      qc.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

export function useSyncBudgetItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => syncDebtBudgetItems(id),
    onSuccess: () => invalidateDebtRelated(qc),
  });
}
