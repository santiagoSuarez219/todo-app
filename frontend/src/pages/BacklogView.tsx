import { useState, useRef, useEffect, type FormEvent } from 'react';
import {
  useBacklogActivities,
  useCreateActivity,
  useUpdateActivity,
  useDeleteActivity,
} from '../hooks/useActivities';
import { useProjects } from '../hooks/useProjects';
import type { Activity, Project } from '../types';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';

// ─── Icons ─────────────────────────────────────────────────────────────────────

function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    </svg>
  );
}

function ChevronIcon({ up = false }: { up?: boolean }) {
  return (
    <svg className={`w-3 h-3 transition-transform ${up ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
    </svg>
  );
}

// ─── QuickAddForm ──────────────────────────────────────────────────────────────

function QuickAddForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('');
  const { mutate, isPending } = useCreateActivity();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    mutate({ name: trimmed }, {
      onSuccess: () => { setName(''); inputRef.current?.focus(); },
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre de la tarea…"
        className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
      />
      <button
        type="submit"
        disabled={isPending || !name.trim()}
        className="px-4 py-2 text-sm font-medium bg-blue-700 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-800 dark:hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? 'Guardando…' : 'Agregar'}
      </button>
      <button
        type="button"
        onClick={onDone}
        className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
      >
        Cancelar
      </button>
    </form>
  );
}

// ─── ProjectDropdown ───────────────────────────────────────────────────────────

function ProjectDropdown({ activity, projects }: { activity: Activity; projects: Project[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { mutate, isPending } = useUpdateActivity();

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  function handleSelect(projectId: string) {
    mutate(
      { id: activity.id, dto: { projectId } },
      { onSettled: () => setOpen(false) },
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        disabled={isPending}
        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50 transition-colors"
      >
        {isPending ? (
          <span className="w-3 h-3 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        ) : (
          <FolderIcon />
        )}
        Asignar proyecto
        <ChevronIcon up={open} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 w-52 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg py-1">
          {projects.length === 0 && (
            <p className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500 italic">
              Sin proyectos disponibles
            </p>
          )}
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => handleSelect(p.id)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <FolderIcon />
              <span className="truncate">{p.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── BacklogCard ───────────────────────────────────────────────────────────────

function BacklogCard({ activity, projects }: { activity: Activity; projects: Project[] }) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { mutate: doDelete, isPending: isDeleting } = useDeleteActivity();

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-3 hover:shadow-sm transition-shadow">
        <p className="flex-1 text-sm text-gray-900 dark:text-white font-medium truncate">
          {activity.name}
        </p>

        <div className="flex items-center gap-2 shrink-0">
          <ProjectDropdown activity={activity} projects={projects} />

          <button
            onClick={() => setDeleteOpen(true)}
            title="Eliminar"
            className="flex items-center text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 px-1.5 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Eliminar tarea"
        message={`¿Eliminar "${activity.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={() => doDelete(activity.id, { onSuccess: () => setDeleteOpen(false) })}
        onCancel={() => setDeleteOpen(false)}
        loading={isDeleting}
      />
    </>
  );
}

// ─── BacklogView ───────────────────────────────────────────────────────────────

export default function BacklogView() {
  const [addOpen, setAddOpen] = useState(false);
  const { data = [], isLoading, isError } = useBacklogActivities();
  const { data: projects = [] } = useProjects();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Backlog</h1>
          {data.length > 0 && (
            <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold px-2.5 py-0.5 rounded-full">
              {data.length}
            </span>
          )}
        </div>

        {!addOpen && (
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-blue-700 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-800 dark:hover:bg-blue-700 transition-colors"
          >
            <PlusIcon />
            Nueva tarea
          </button>
        )}
      </div>

      {/* Quick-add form */}
      {addOpen && (
        <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <QuickAddForm onDone={() => setAddOpen(false)} />
        </div>
      )}

      {/* States */}
      {isLoading && <p className="text-sm text-gray-400">Cargando…</p>}
      {isError && <p className="text-sm text-red-500">Error al cargar el backlog.</p>}
      {!isLoading && data.length === 0 && (
        <EmptyState message="El backlog está vacío. Agrega tareas sin fecha ni proyecto." />
      )}

      {/* Task list */}
      <div className="flex flex-col gap-2">
        {data.map((activity) => (
          <BacklogCard key={activity.id} activity={activity} projects={projects} />
        ))}
      </div>
    </div>
  );
}
