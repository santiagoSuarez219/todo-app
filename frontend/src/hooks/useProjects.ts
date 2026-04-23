import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProjects, getProject, createProject, updateProject, deleteProject,
} from '../services/projects.service';
import type { CreateProjectDto, UpdateProjectDto, ProjectStatus } from '../types';

export function useProjects(status?: ProjectStatus) {
  return useQuery({
    queryKey: ['projects', status],
    queryFn: () => getProjects(status),
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: () => getProject(id),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateProjectDto) => createProject(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateProjectDto }) => updateProject(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}
