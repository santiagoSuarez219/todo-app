import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  getActivities, getActivity, createActivity, updateActivity, deleteActivity,
  getTodayActivities, getThisWeekActivities, getOverdueActivities,
  getActivitiesByProject, searchActivities, getActivitySubtasks, createSubtask,
  getWithoutProjectActivities, getActivityInstances, cancelFutureInstances,
  getScheduleActivities, getActivitiesSummary,
} from '../services/activities.service';
import type {
  CreateActivityDto, UpdateActivityDto, PaginationParams, ActivitySearchParams,
  ActivityListParams, ActivitiesSummaryParams,
} from '../types';

export function useActivities(params?: ActivityListParams) {
  return useQuery({
    queryKey: ['activities', params],
    queryFn: () => getActivities(params),
    // Evita el flash a skeleton al cambiar de tab o de página — mismo patrón
    // que useSearchActivities / useScheduleActivities.
    placeholderData: keepPreviousData,
  });
}

export function useActivitiesSummary(params?: ActivitiesSummaryParams) {
  return useQuery({
    queryKey: ['activities', 'summary', params],
    queryFn: () => getActivitiesSummary(params),
    placeholderData: keepPreviousData,
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

export function useActivitiesByProject(projectId: string, params?: ActivityListParams) {
  return useQuery({
    queryKey: ['activities', 'project', projectId, params],
    queryFn: () => getActivitiesByProject(projectId, params),
    enabled: !!projectId,
    placeholderData: keepPreviousData,
  });
}

export function useSearchActivities(query: string, params?: ActivitySearchParams) {
  return useQuery({
    queryKey: ['activities', 'search', query, params],
    queryFn: () => searchActivities(query, params),
    enabled: query.trim().length >= 2,
    // Mantiene los resultados previos mientras llega el nuevo set → evita el
    // flash a skeleton al escribir (búsqueda suave "as you type").
    placeholderData: keepPreviousData,
  });
}

export function useScheduleActivities(year: number, month: number) {
  return useQuery({
    queryKey: ['activities', 'schedule', year, month],
    queryFn: () => getScheduleActivities(year, month),
    // Evita el flash a skeleton al navegar entre meses — mismo patrón que
    // useSearchActivities.
    placeholderData: keepPreviousData,
  });
}

export function useBacklogActivities(params?: PaginationParams) {
  return useQuery({
    queryKey: ['activities', 'backlog', params],
    queryFn: () => getWithoutProjectActivities(params),
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

export function useActivitySubtasks(activityId: string) {
  return useQuery({
    queryKey: ['activities', activityId, 'subtasks'],
    queryFn: () => getActivitySubtasks(activityId),
    enabled: !!activityId,
  });
}

export function useCreateSubtask(parentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateActivityDto) => createSubtask(parentId, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['activities', parentId, 'subtasks'] });
      qc.invalidateQueries({ queryKey: ['activities'] });
    },
  });
}

export function useActivityInstances(templateId: string) {
  return useQuery({
    queryKey: ['activities', templateId, 'instances'],
    queryFn: () => getActivityInstances(templateId),
    enabled: !!templateId,
  });
}

export function useCancelFutureInstances() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string) => cancelFutureInstances(templateId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activities'] }),
  });
}
