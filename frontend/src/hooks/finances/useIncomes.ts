import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getIncomes,
  getIncome,
  createIncome,
  updateIncome,
  deleteIncome,
} from '../../services/finances/incomes.service';
import type { CreateIncomeDto, UpdateIncomeDto, PaginationParams } from '../../types';

export function useIncomes(params?: PaginationParams, year?: number, month?: number) {
  return useQuery({
    queryKey: ['incomes', params, year, month],
    queryFn: () => getIncomes(params, year, month),
  });
}

export function useIncome(id: string) {
  return useQuery({
    queryKey: ['incomes', id],
    queryFn: () => getIncome(id),
    enabled: !!id,
  });
}

export function useCreateIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateIncomeDto) => createIncome(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incomes'] }),
  });
}

export function useUpdateIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateIncomeDto }) => updateIncome(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incomes'] }),
  });
}

export function useDeleteIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteIncome(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incomes'] }),
  });
}
