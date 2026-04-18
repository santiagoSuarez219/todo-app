import { useState } from 'react';
import { useActivities, useCreateActivity, useUpdateActivity, useDeleteActivity } from '../hooks/useActivities';
import { useProjects } from '../hooks/useProjects';
import { type Activity, type CreateActivityDto } from '../types';
import ActivityCard from '../components/ActivityCard';
import ActivityForm from '../components/ActivityForm';
import ConfirmDialog from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';
import EmptyState from '../components/EmptyState';

export default function ActivityList() {
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [deleting, setDeleting] = useState<Activity | null>(null);

  const { data: activitiesPage, isLoading, isError } = useActivities({ page, limit: 20 });
  const { data: projects } = useProjects();
  const createMutation = useCreateActivity();
  const updateMutation = useUpdateActivity();
  const deleteMutation = useDeleteActivity();

  async function handleSubmit(dto: CreateActivityDto) {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, dto });
    } else {
      await createMutation.mutateAsync(dto);
    }
    setModalOpen(false);
    setEditing(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Actividades</h1>
        <button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="px-4 py-2 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700"
        >
          + Nueva actividad
        </button>
      </div>

      {isLoading && <p className="text-sm text-gray-400">Cargando…</p>}
      {isError && <p className="text-sm text-red-500">Error al cargar actividades.</p>}
      {activitiesPage && activitiesPage.data.length === 0 && <EmptyState message="No hay actividades." />}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {activitiesPage?.data.map((activity) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            onEdit={(a) => { setEditing(a); setModalOpen(true); }}
            onDelete={(a) => setDeleting(a)}
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

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 overflow-y-auto py-8">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg my-auto">
            <h2 className="text-lg font-semibold mb-4">{editing ? 'Editar actividad' : 'Nueva actividad'}</h2>
            <ActivityForm
              initial={editing ?? undefined}
              projects={projects ?? []}
              onSubmit={handleSubmit}
              onCancel={() => { setModalOpen(false); setEditing(null); }}
              loading={createMutation.isPending || updateMutation.isPending}
            />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleting}
        message={`¿Eliminar la actividad "${deleting?.name}"?`}
        onConfirm={async () => {
          if (deleting) await deleteMutation.mutateAsync(deleting.id);
          setDeleting(null);
        }}
        onCancel={() => setDeleting(null)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
