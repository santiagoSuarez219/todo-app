import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCdts, getCdt, getActiveCdts, createCdt, updateCdt, deleteCdt } from '../../services/finances/cdts.service';
import type { CreateCdtDto, UpdateCdtDto, PaginationParams } from '../../types';

export function useCdts(params?: PaginationParams) {
  return useQuery({
    queryKey: ['cdts', params],
    queryFn: () => getCdts(params),
  });
}

export function useCdt(id: string) {
  return useQuery({
    queryKey: ['cdts', id],
    queryFn: () => getCdt(id),
    enabled: !!id,
  });
}

export function useActiveCdts() {
  return useQuery({
    queryKey: ['cdts', 'active'],
    queryFn: () => getActiveCdts(),
  });
}

export function useCreateCdt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateCdtDto) => createCdt(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cdts'] }),
  });
}

export function useUpdateCdt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateCdtDto }) => updateCdt(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cdts'] }),
  });
}

export function useDeleteCdt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCdt(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cdts'] }),
  });
}
