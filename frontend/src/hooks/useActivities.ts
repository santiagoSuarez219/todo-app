import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getActivities, getActivity, createActivity, updateActivity, deleteActivity,
  getTodayActivities, getThisWeekActivities, getOverdueActivities,
  getActivitiesByProject, searchActivities, getActivitySubtasks, createSubtask,
  getWithoutProjectActivities, getActivityInstances, cancelFutureInstances,
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

export function useSearchActivities(query: string, params?: PaginationParams) {
  return useQuery({
    queryKey: ['activities', 'search', query, params],
    queryFn: () => searchActivities(query, params),
    enabled: query.trim().length > 0,
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
