import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  getExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
  duplicateExpense,
  type GetExpensesFilters,
} from '../../services/finances/expenses.service';
import type { CreateExpenseDto, UpdateExpenseDto, DuplicateExpenseDto, PaginationParams } from '../../types';

export function useExpenses(
  params?: PaginationParams,
  year?: number,
  month?: number,
  search?: string,
  filters?: Pick<GetExpensesFilters, 'budgetId' | 'planned' | 'executed'>,
) {
  return useQuery({
    queryKey: ['expenses', params, year, month, search, filters],
    queryFn: () => getExpenses(params, year, month, search, filters),
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

// spec-034: todas las mutations de gastos invalidan también ['budgets'] —
// un gasto (plan o ejecución) es ahora contenido directo del presupuesto,
// no una entidad independiente que solo se sumaba al final.
export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateExpenseDto) => createExpense(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateExpenseDto }) => updateExpense(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}

export function useDuplicateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: DuplicateExpenseDto }) => duplicateExpense(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}
