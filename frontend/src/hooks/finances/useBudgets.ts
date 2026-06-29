import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getBudgets,
  getBudget,
  createBudget,
  updateBudget,
  deleteBudget,
  addBudgetItem,
  updateBudgetItem,
  deleteBudgetItem,
  getMonthlyExpenseSummary,
} from '../../services/finances/budgets.service';
import type { CreateBudgetDto, UpdateBudgetDto, CreateBudgetItemDto, UpdateBudgetItemDto, PaginationParams } from '../../types';

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

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBudget(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  });
}

export function useAddBudgetItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ budgetId, dto }: { budgetId: string; dto: CreateBudgetItemDto }) =>
      addBudgetItem(budgetId, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  });
}

export function useMonthlyExpenseSummary(year: number, month: number) {
  return useQuery({
    queryKey: ['budgets', 'monthly-summary', year, month],
    queryFn: () => getMonthlyExpenseSummary(year, month),
    enabled: !!year && !!month,
  });
}

export function useUpdateBudgetItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ budgetId, itemId, dto }: { budgetId: string; itemId: string; dto: UpdateBudgetItemDto }) =>
      updateBudgetItem(budgetId, itemId, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  });
}

export function useDeleteBudgetItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ budgetId, itemId }: { budgetId: string; itemId: string }) =>
      deleteBudgetItem(budgetId, itemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  });
}
