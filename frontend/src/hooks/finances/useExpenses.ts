import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  getExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
} from '../../services/finances/expenses.service';
import type { CreateExpenseDto, UpdateExpenseDto, PaginationParams } from '../../types';

export function useExpenses(params?: PaginationParams, year?: number, month?: number, search?: string) {
  return useQuery({
    queryKey: ['expenses', params, year, month, search],
    queryFn: () => getExpenses(params, year, month, search),
    // Mantiene la lista previa mientras se refina por texto o cambia mes/año →
    // evita el flash al escribir en la búsqueda.
    placeholderData: keepPreviousData,
  });
}

export function useExpense(id: string) {
  return useQuery({
    queryKey: ['expenses', id],
    queryFn: () => getExpense(id),
    enabled: !!id,
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateExpenseDto) => createExpense(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateExpenseDto }) => updateExpense(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}
