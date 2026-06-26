import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCreditCards, getCreditCard, createCreditCard, updateCreditCard, deleteCreditCard } from '../../services/finances/credit-cards.service';
import type { CreateCreditCardDto, UpdateCreditCardDto, PaginationParams } from '../../types';

export function useCreditCards(params?: PaginationParams) {
  return useQuery({
    queryKey: ['credit-cards', params],
    queryFn: () => getCreditCards(params),
  });
}

export function useCreditCard(id: string) {
  return useQuery({
    queryKey: ['credit-cards', id],
    queryFn: () => getCreditCard(id),
    enabled: !!id,
  });
}

export function useCreateCreditCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateCreditCardDto) => createCreditCard(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['credit-cards'] }),
  });
}

export function useUpdateCreditCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateCreditCardDto }) => updateCreditCard(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['credit-cards'] }),
  });
}

export function useDeleteCreditCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCreditCard(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['credit-cards'] }),
  });
}
