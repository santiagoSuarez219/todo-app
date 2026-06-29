import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPurchases,
  getPurchase,
  createPurchase,
  updatePurchase,
  deletePurchase,
} from '../../services/finances/purchases.service';
import type { CreatePurchaseDto, UpdatePurchaseDto, PaginationParams, PurchaseStatus } from '../../types';

export function usePurchases(params?: PaginationParams, status?: PurchaseStatus) {
  return useQuery({
    queryKey: ['purchases', params, status],
    queryFn: () => getPurchases(params, status),
  });
}

export function usePurchase(id: string) {
  return useQuery({
    queryKey: ['purchases', id],
    queryFn: () => getPurchase(id),
    enabled: !!id,
  });
}

export function useCreatePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreatePurchaseDto) => createPurchase(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchases'] }),
  });
}

export function useUpdatePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdatePurchaseDto }) => updatePurchase(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchases'] }),
  });
}

export function useDeletePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePurchase(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchases'] }),
  });
}
