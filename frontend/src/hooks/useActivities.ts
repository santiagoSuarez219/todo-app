import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getActivities, getActivity, createActivity, updateActivity, deleteActivity,
  getTodayActivities, getThisWeekActivities, getOverdueActivities,
  getActivitiesByProject,
} from '../services/activities.service';
import type { CreateActivityDto, UpdateActivityDto, PaginationParams } from '../types';

export function useActivities(params?: PaginationParams) {
  return useQuery({
    queryKey: ['activities', params],
    queryFn: () => getActivities(params),
  });
}

export function useActivity(id: string) {
  return useQuery({
    queryKey: ['activities', id],
    queryFn: () => getActivity(id),
    enabled: !!id,
  });
}

export function useTodayActivities(params?: PaginationParams) {
  return useQuery({
    queryKey: ['activities', 'today', params],
    queryFn: () => getTodayActivities(params),
  });
}

export function useThisWeekActivities(params?: PaginationParams) {
  return useQuery({
    queryKey: ['activities', 'this-week', params],
    queryFn: () => getThisWeekActivities(params),
  });
}

export function useOverdueActivities(params?: PaginationParams) {
  return useQuery({
    queryKey: ['activities', 'overdue', params],
    queryFn: () => getOverdueActivities(params),
  });
}

export function useActivitiesByProject(projectId: string, params?: PaginationParams) {
  return useQuery({
    queryKey: ['activities', 'project', projectId, params],
    queryFn: () => getActivitiesByProject(projectId, params),
    enabled: !!projectId,
  });
}

export function useCreateActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateActivityDto) => createActivity(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activities'] }),
  });
}

export function useUpdateActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateActivityDto }) => updateActivity(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activities'] }),
  });
}

export function useDeleteActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteActivity(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activities'] }),
  });
}
