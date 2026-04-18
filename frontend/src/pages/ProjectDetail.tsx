import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProject } from '../hooks/useProjects';
import { useActivitiesByProject, useCreateActivity, useUpdateActivity, useDeleteActivity } from '../hooks/useActivities';
import { useProjects } from '../hooks/useProjects';
import StatusBadge from '../components/StatusBadge';
import ActivityCard from '../components/ActivityCard';
import ActivityForm from '../components/ActivityForm';
import ConfirmDialog from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';
import EmptyState from '../components/EmptyState';
import type { Activity, CreateActivityDto } from '../types';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [page, setPage] = useState(1);
  const [activityModal, setActivityModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [deletingActivity, setDeletingActivity] = useState<Activity | null>(null);

  const { data: project, isLoading: projectLoading } = useProject(id!);
  const { data: activitiesPage, isLoading: activitiesLoading } = useActivitiesByProject(id!, { page, limit: 10 });
  const { data: allProjects } = useProjects();

  const createActivity = useCreateActivity();
  const updateActivity = useUpdateActivity();
  const deleteActivity = useDeleteActivity();

  async function handleActivitySubmit(dto: CreateActivityDto) {
    const payload = { ...dto, projectId: id };
    if (editingActivity) {
      await updateActivity.mutateAsync({ id: editingActivity.id, dto: payload });
    } else {
      await createActivity.mutateAsync(payload);
    }
    setActivityModal(false);
    setEditingActivity(null);
  }

  if (projectLoading) return <p className="text-sm text-gray-400">Cargando…</p>;
  if (!project) return <p className="text-sm text-red-500">Proyecto no encontrado.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link to="/projects" className="text-sm text-gray-400 hover:text-indigo-600">← Proyectos</Link>
          <h1 className="text-2xl font-semibold text-gray-900 mt-1">{project.name}</h1>
          <div className="mt-2 flex gap-3 items-center text-sm text-gray-500">
            <StatusBadge status={project.status} />
            <span>Desde {new Date(project.startDate).toLocaleDateString('es-CO')}</span>
            {project.endDate && <span>hasta {new Date(project.endDate).toLocaleDateString('es-CO')}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setEditingActivity(null); setActivityModal(true); }}
            className="px-4 py-2 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700"
          >
            + Actividad
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-medium text-gray-800 mb-3">Actividades</h2>
        {activitiesLoading && <p className="text-sm text-gray-400">Cargando…</p>}
        {activitiesPage && activitiesPage.data.length === 0 && (
          <EmptyState message="Este proyecto no tiene actividades aún." />
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {activitiesPage?.data.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              onEdit={(a) => { setEditingActivity(a); setActivityModal(true); }}
              onDelete={(a) => setDeletingActivity(a)}
            />
          ))}
        </div>
        {activitiesPage && (
          <Pagination
            page={page}
            total={activitiesPage.total}
            limit={activitiesPage.limit}
            onPageChange={setPage}
          />
        )}
      </div>

      {activityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 overflow-y-auto py-8">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg my-auto">
            <h2 className="text-lg font-semibold mb-4">{editingActivity ? 'Editar actividad' : 'Nueva actividad'}</h2>
            <ActivityForm
              initial={editingActivity ?? undefined}
              projects={allProjects ?? []}
              onSubmit={handleActivitySubmit}
              onCancel={() => { setActivityModal(false); setEditingActivity(null); }}
              loading={createActivity.isPending || updateActivity.isPending}
            />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deletingActivity}
        message={`¿Eliminar la actividad "${deletingActivity?.name}"?`}
        onConfirm={async () => {
          if (deletingActivity) await deleteActivity.mutateAsync(deletingActivity.id);
          setDeletingActivity(null);
        }}
        onCancel={() => setDeletingActivity(null)}
        loading={deleteActivity.isPending}
      />
    </div>
  );
}
