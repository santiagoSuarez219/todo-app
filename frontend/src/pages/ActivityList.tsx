import { useState } from 'react';
import { useDebounce } from 'use-debounce';
import { useActivities, useSearchActivities, useCreateActivity, useUpdateActivity, useDeleteActivity } from '../hooks/useActivities';
import { useProjects } from '../hooks/useProjects';
import { type Activity, type CreateActivityDto } from '../types';
import ActivityCard from '../components/ActivityCard';
import ActivityForm from '../components/ActivityForm';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';

export default function ActivityList() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [deleting, setDeleting] = useState<Activity | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery] = useDebounce(searchQuery, 300);

  const { data: allActivities, isLoading, isError } = useActivities();
  const { data: searchResults, isLoading: isSearching } = useSearchActivities(debouncedQuery);
  const { data: projects } = useProjects();

  const activities = debouncedQuery.trim() ? searchResults : allActivities;
  const loading = debouncedQuery.trim() ? isSearching : isLoading;
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
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-semibold text-gray-900">Actividades</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por tarea, descripción o proyecto..."
              className="pl-9 pr-4 py-2 rounded-lg border border-gray-300 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={() => { setEditing(null); setModalOpen(true); }}
            className="px-4 py-2 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700 whitespace-nowrap"
          >
            + Nueva actividad
          </button>
        </div>
      </div>

      {debouncedQuery.trim() && (
        <p className="text-sm text-gray-500">
          {activities?.length ?? 0} resultado(s) para "{debouncedQuery}"
        </p>
      )}

      {loading && <p className="text-sm text-gray-400">Cargando…</p>}
      {isError && <p className="text-sm text-red-500">Error al cargar actividades.</p>}
      {!loading && activities && activities.length === 0 && (
        <EmptyState message={debouncedQuery.trim() ? `Sin resultados para "${debouncedQuery}".` : 'No hay actividades.'} />
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {activities?.map((activity) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            onEdit={(a) => { setEditing(a); setModalOpen(true); }}
            onDelete={(a) => setDeleting(a)}
          />
        ))}
      </div>

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
