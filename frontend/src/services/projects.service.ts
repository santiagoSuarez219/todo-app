import apiClient from '../lib/api-client';
import type { Project, CreateProjectDto, UpdateProjectDto, ProjectStatus } from '../types';

export async function getProjects(status?: ProjectStatus): Promise<Project[]> {
  const params = status ? { status } : {};
  const { data } = await apiClient.get<{ data: Project[] }>('/projects', { params });
  return data.data;
}

export async function getProject(id: string): Promise<Project> {
  const { data } = await apiClient.get<{ data: Project }>(`/projects/${id}`);
  return data.data;
}

export async function createProject(dto: CreateProjectDto): Promise<Project> {
  const { data } = await apiClient.post<{ data: Project }>('/projects', dto);
  return data.data;
}

export async function updateProject(id: string, dto: UpdateProjectDto): Promise<Project> {
  const { data } = await apiClient.patch<{ data: Project }>(`/projects/${id}`, dto);
  return data.data;
}

export async function deleteProject(id: string): Promise<void> {
  await apiClient.delete(`/projects/${id}`);
}
