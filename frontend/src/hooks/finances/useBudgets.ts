import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getBudgets,
  getBudget,
  createBudget,
  updateBudget,
  deleteBudget,
  getMonthlyExpenseSummary,
  duplicateBudget,
} from '../../services/finances/budgets.service';
import type { CreateBudgetDto, UpdateBudgetDto, DuplicateBudgetDto, PaginationParams } from '../../types';

export function useBudgets(params?: PaginationParams, year?: number, month?: number) {
  return useQuery({
    queryKey: ['budgets', params, year, month],
    queryFn: () => getBudgets(params, year, month),
  });
}

export function useBudget(id: string) {
  return useQuery({
    queryKey: ['budgets', id],
    queryFn: () => getBudget(id),
    enabled: !!id,
  });
}

export function useCreateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateBudgetDto) => createBudget(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  });
}

export function useUpdateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateBudgetDto }) => updateBudget(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  });
}

// spec-035, decisión 12: el resultado indica cuántos gastos ejecutados se
// perdieron en cascada — el caller (BudgetDetailView) lo usa para el
// ConfirmDialog. Sigue invalidando ['expenses']: los gastos del presupuesto
// desaparecieron de verdad.
export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBudget(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] });
      qc.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

export function useMonthlyExpenseSummary(year: number, month: number) {
  return useQuery({
    queryKey: ['budgets', 'monthly-summary', year, month],
    queryFn: () => getMonthlyExpenseSummary(year, month),
    enabled: !!year && !!month,
  });
}

export function useDuplicateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: DuplicateBudgetDto }) => duplicateBudget(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] });
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['incomes'] });
    },
  });
}
