import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProject } from '../hooks/useProjects';
import { useActivitiesByProject, useCreateActivity } from '../hooks/useActivities';
import { useProjects } from '../hooks/useProjects';
import StatusBadge from '../components/StatusBadge';
import ActivityCard from '../components/ActivityCard';
import ActivityForm from '../components/ActivityForm';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import type { CreateActivityDto } from '../types';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: project, isLoading: projectLoading } = useProject(id!);
  const { data: activities, isLoading: activitiesLoading } = useActivitiesByProject(id!);
  const { data: allProjects } = useProjects();
  const visibleActivities = (activities ?? []).filter(
    (a) => !a.parent && a.status !== 'completed',
  );

  const createActivity = useCreateActivity();

  async function handleCreate(dto: CreateActivityDto) {
    await createActivity.mutateAsync({ ...dto, projectId: id });
    setCreateOpen(false);
  }

  if (projectLoading) return <p className="text-sm text-gray-400 dark:text-gray-500">Cargando…</p>;
  if (!project) return <p className="text-sm text-red-500">Proyecto no encontrado.</p>;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            to="/projects"
            className="text-sm text-gray-400 dark:text-gray-500 hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
          >
            ← Proyectos
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
            {project.name}
          </h1>
          <div className="mt-2 flex gap-3 items-center text-sm text-gray-500 dark:text-gray-400">
            <StatusBadge status={project.status} />
            <span>Desde {new Date(project.startDate).toLocaleDateString('es-CO')}</span>
            {project.endDate && (
              <span>hasta {new Date(project.endDate).toLocaleDateString('es-CO')}</span>
            )}
          </div>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="shrink-0 px-4 py-2 text-sm font-medium rounded-lg bg-blue-700 dark:bg-blue-600 text-white hover:bg-blue-800 dark:hover:bg-blue-700 transition-colors"
        >
          + Actividad
        </button>
      </div>

      {/* ── Activity list ── */}
      <div>
        <h2 className="text-base font-medium text-gray-800 dark:text-gray-200 mb-3">
          Actividades
        </h2>
        {activitiesLoading && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
            ))}
          </div>
        )}
        {!activitiesLoading && visibleActivities.length === 0 && (
          <EmptyState message="Este proyecto no tiene actividades pendientes." />
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleActivities.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} />
          ))}
        </div>
      </div>

      {/* ── Create activity modal ── */}
      {createOpen && (
        <Modal title="Nueva actividad" onClose={() => setCreateOpen(false)}>
          <ActivityForm
            projects={allProjects ?? []}
            onSubmit={handleCreate}
            onCancel={() => setCreateOpen(false)}
            loading={createActivity.isPending}
          />
        </Modal>
      )}
    </div>
  );
}
