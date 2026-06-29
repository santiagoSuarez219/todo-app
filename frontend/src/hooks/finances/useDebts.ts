import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDebts,
  getDebt,
  createDebt,
  updateDebt,
  deleteDebt,
  payInstallment,
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

export function useCreateDebt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateDebtDto) => createDebt(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['debts'] }),
  });
}

export function useUpdateDebt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateDebtDto }) => updateDebt(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['debts'] }),
  });
}

export function useDeleteDebt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDebt(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['debts'] }),
  });
}

export function usePayInstallment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => payInstallment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['debts'] });
      qc.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}
