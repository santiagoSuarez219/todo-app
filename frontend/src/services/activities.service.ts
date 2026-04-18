import apiClient from '../lib/api-client';
import type {
  Activity,
  CreateActivityDto,
  UpdateActivityDto,
  PaginatedResponse,
  PaginationParams,
  ActivityStatus,
  ActivityType,
  Priority,
} from '../types';

async function getPaginated(url: string, params?: PaginationParams): Promise<PaginatedResponse<Activity>> {
  const { data } = await apiClient.get<{ data: PaginatedResponse<Activity> }>(url, { params });
  return data.data;
}

export async function getActivities(params?: PaginationParams): Promise<PaginatedResponse<Activity>> {
  return getPaginated('/activities', params);
}

export async function getActivity(id: string): Promise<Activity> {
  const { data } = await apiClient.get<{ data: Activity }>(`/activities/${id}`);
  return data.data;
}

export async function createActivity(dto: CreateActivityDto): Promise<Activity> {
  const { data } = await apiClient.post<{ data: Activity }>('/activities', dto);
  return data.data;
}

export async function updateActivity(id: string, dto: UpdateActivityDto): Promise<Activity> {
  const { data } = await apiClient.patch<{ data: Activity }>(`/activities/${id}`, dto);
  return data.data;
}

export async function deleteActivity(id: string): Promise<void> {
  await apiClient.delete(`/activities/${id}`);
}

export async function getTodayActivities(params?: PaginationParams): Promise<PaginatedResponse<Activity>> {
  return getPaginated('/activities/today', params);
}

export async function getTomorrowActivities(params?: PaginationParams): Promise<PaginatedResponse<Activity>> {
  return getPaginated('/activities/tomorrow', params);
}

export async function getThisWeekActivities(params?: PaginationParams): Promise<PaginatedResponse<Activity>> {
  return getPaginated('/activities/this-week', params);
}

export async function getOverdueActivities(params?: PaginationParams): Promise<PaginatedResponse<Activity>> {
  return getPaginated('/activities/overdue', params);
}

export async function getActivitiesByProject(
  projectId: string,
  params?: PaginationParams,
): Promise<PaginatedResponse<Activity>> {
  return getPaginated(`/activities/project/${projectId}`, params);
}

export async function getActivitiesByType(
  type: ActivityType,
  params?: PaginationParams,
): Promise<PaginatedResponse<Activity>> {
  return getPaginated(`/activities/type/${type}`, params);
}

export async function getActivitiesByPriority(
  priority: Priority,
  params?: PaginationParams,
): Promise<PaginatedResponse<Activity>> {
  return getPaginated(`/activities/priority/${priority}`, params);
}

export async function getActivitiesByStatus(
  status: ActivityStatus,
  params?: PaginationParams,
): Promise<PaginatedResponse<Activity>> {
  return getPaginated(`/activities/status/${status}`, params);
}

export async function getActivitySubtasks(
  id: string,
  params?: PaginationParams,
): Promise<PaginatedResponse<Activity>> {
  return getPaginated(`/activities/${id}/subtasks`, params);
}
