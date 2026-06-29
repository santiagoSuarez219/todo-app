import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAccounts, getAccount, createAccount, updateAccount, deleteAccount } from '../../services/finances/accounts.service';
import type { CreateAccountDto, UpdateAccountDto, PaginationParams } from '../../types';

export function useAccounts(params?: PaginationParams) {
  return useQuery({
    queryKey: ['accounts', params],
    queryFn: () => getAccounts(params),
  });
}

export function useAccount(id: string) {
  return useQuery({
    queryKey: ['accounts', id],
    queryFn: () => getAccount(id),
    enabled: !!id,
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateAccountDto) => createAccount(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateAccountDto }) => updateAccount(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAccount(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  });
}
