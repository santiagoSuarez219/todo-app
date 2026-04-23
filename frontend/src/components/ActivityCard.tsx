import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Activity, ActivityStatus, Automatizacion, CreateActivityDto } from '../types';
import { useUpdateActivity, useDeleteActivity, useActivitySubtasks, useCreateSubtask } from '../hooks/useActivities';
import { useProjects } from '../hooks/useProjects';
import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';
import EnergyIndicator from './EnergyIndicator';
import ActivityForm from './ActivityForm';
import ConfirmDialog from './ConfirmDialog';
import Modal from './Modal';

interface Props {
  activity: Activity;
  onEdit?: (activity: Activity) => void;
  onDelete?: (activity: Activity) => void;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function CalendarIcon() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0z" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
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

function PlusIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487z" />
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

// ─── AutomatizacionBadge ──────────────────────────────────────────────────────

const AUTOMATIZACION_CONFIG: Record<string, { label: string; cls: string }> = {
  fully_automatable:    { label: 'Automatizable', cls: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800' },
  partially_automatable: { label: 'Parcialmente', cls: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800' },
  not_automatable:      { label: 'No automatizable', cls: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600' },
};

function AutomatizacionBadge({ value }: { value: Automatizacion }) {
  const config = AUTOMATIZACION_CONFIG[value];
  if (!config) return null;
  return (
    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-medium ${config.cls}`}>
      ⚡ {config.label}
    </span>
  );
}

// ─── Status options ───────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: ActivityStatus; label: string; dot: string }[] = [
  { value: 'pending',     label: 'Pendiente',   dot: 'bg-yellow-400' },
  { value: 'in_progress', label: 'En progreso', dot: 'bg-blue-500' },
  { value: 'completed',   label: 'Completada',  dot: 'bg-green-500' },
  { value: 'on_hold',     label: 'En espera',   dot: 'bg-purple-500' },
];

// ─── StatusDropdown ───────────────────────────────────────────────────────────

function StatusDropdown({ activity }: { activity: Activity }) {
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

  function handleSelect(status: ActivityStatus) {
    if (status === activity.status) { setOpen(false); return; }
    mutate({ id: activity.id, dto: { status } }, { onSettled: () => setOpen(false) });
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        disabled={isPending}
        className="flex items-center gap-1 focus:outline-none disabled:opacity-50"
        aria-label="Cambiar estado"
      >
        <StatusBadge status={activity.status} />
        <span className="text-gray-400 dark:text-gray-500">
          <ChevronIcon up={open} />
        </span>
        {isPending && (
          <span className="w-3 h-3 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-20 w-40 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg py-1">
          {STATUS_OPTIONS.map(({ value, label, dot }) => (
            <button
              key={value}
              onClick={() => handleSelect(value)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors ${
                value === activity.status
                  ? 'bg-gray-50 dark:bg-gray-700/60 text-gray-900 dark:text-white font-medium'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
              {label}
              {value === activity.status && (
                <svg className="w-3 h-3 ml-auto text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CreateSubtaskModal ───────────────────────────────────────────────────────

function CreateSubtaskModal({ parentId, onClose }: { parentId: string; onClose: () => void }) {
  const { data: projects } = useProjects();
  const { mutateAsync, isPending } = useCreateSubtask(parentId);

  async function handleSubmit(dto: CreateActivityDto) {
    await mutateAsync(dto);
    onClose();
  }

  return (
    <Modal title="Nueva subtarea" onClose={onClose}>
      <ActivityForm
        parentId={parentId}
        projects={projects ?? []}
        onSubmit={handleSubmit}
        onCancel={onClose}
        loading={isPending}
      />
    </Modal>
  );
}

// ─── SubtaskSection ───────────────────────────────────────────────────────────

function SubtaskSection({ parentId }: { parentId: string }) {
  const { data: subtasks = [], isLoading } = useActivitySubtasks(parentId);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="mt-1 space-y-2">
      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 py-2">
          <span className="w-3 h-3 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          Cargando subtareas…
        </div>
      )}

      {!isLoading && subtasks.length === 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 italic py-1">
          Sin subtareas aún
        </p>
      )}

      {subtasks.map((sub) => (
        <ActivityCard key={sub.id} activity={sub} />
      ))}

      <button
        onClick={() => setCreateOpen(true)}
        className="flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium mt-1 transition-colors"
      >
        <PlusIcon />
        Agregar subtarea
      </button>

      {createOpen && (
        <CreateSubtaskModal parentId={parentId} onClose={() => setCreateOpen(false)} />
      )}
    </div>
  );
}

// ─── EditActivityModal ────────────────────────────────────────────────────────

function EditActivityModal({ activity, onClose }: { activity: Activity; onClose: () => void }) {
  const { data: projects } = useProjects();
  const { mutateAsync, isPending } = useUpdateActivity();

  async function handleSubmit(dto: CreateActivityDto) {
    await mutateAsync({ id: activity.id, dto });
    onClose();
  }

  return (
    <Modal title="Editar actividad" onClose={onClose}>
      <ActivityForm
        initial={activity}
        projects={projects ?? []}
        onSubmit={handleSubmit}
        onCancel={onClose}
        loading={isPending}
      />
    </Modal>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ─── ActivityCard ─────────────────────────────────────────────────────────────

export default function ActivityCard({ activity, onEdit, onDelete }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [subtasksOpen, setSubtasksOpen] = useState(false);
  const { mutate: doDelete, isPending: isDeleting } = useDeleteActivity();

  const now = new Date();
  const isOverdue =
    activity.dueDate &&
    new Date(activity.dueDate) < now &&
    activity.status !== 'completed';

  const totalSubtasks = activity.subtasks?.length ?? 0;
  const completedSubtasks =
    activity.subtasks?.filter((s) => s.status === 'completed').length ?? 0;
  const subtaskPercent =
    totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  const durationLabel =
    activity.duration && activity.durationUnit
      ? `${activity.duration} ${
          activity.durationUnit === 'hours'
            ? activity.duration === 1 ? 'hora' : 'horas'
            : activity.duration === 1 ? 'día' : 'días'
        }`
      : null;

  function handleEditClick() {
    if (onEdit) { onEdit(activity); } else { setEditOpen(true); }
  }

  function handleDeleteClick() {
    if (onDelete) { onDelete(activity); } else { setDeleteOpen(true); }
  }

  return (
    <>
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg border flex flex-col gap-3 p-4 transition-shadow hover:shadow-md ${
          isOverdue
            ? 'border-red-300 dark:border-red-700'
            : 'border-gray-200 dark:border-gray-700'
        }`}
      >
        {/* ── Row 1: status dropdown + actions ── */}
        <div className="flex items-center justify-between gap-2">
          <StatusDropdown activity={activity} />
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleEditClick}
              title="Editar actividad"
              className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-blue-700 dark:hover:text-blue-400 px-1.5 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              <EditIcon />
              <span>Editar</span>
            </button>
            <button
              onClick={handleDeleteClick}
              title="Eliminar actividad"
              className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 px-1.5 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <TrashIcon />
              <span>Eliminar</span>
            </button>
          </div>
        </div>

        {/* ── Row 2: title + description ── */}
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">
            {activity.name}
          </p>
          {activity.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
              {activity.description}
            </p>
          )}
        </div>

        {/* ── Row 3: project chip ── */}
        {activity.project && (
          <div>
            <Link
              to={`/projects/${activity.project.id}`}
              className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
            >
              <FolderIcon />
              {activity.project.name}
            </Link>
          </div>
        )}

        {/* ── Separator ── */}
        <hr className="border-gray-100 dark:border-gray-700" />

        {/* ── Row 4: priority + energy + automatizacion ── */}
        <div className="flex items-center gap-3 flex-wrap">
          <PriorityBadge priority={activity.priority} />
          <EnergyIndicator energy={activity.energy} />
          {activity.automatizacion && (
            <AutomatizacionBadge value={activity.automatizacion} />
          )}
        </div>

        {/* ── Row 5: dates ── */}
        {(activity.actionDate || activity.dueDate) && (
          <div className="flex flex-col gap-1.5">
            {activity.actionDate && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <CalendarIcon />
                <span>Acción: {fmt(activity.actionDate)}</span>
              </div>
            )}
            {activity.dueDate && (
              <div
                className={`flex items-center gap-1.5 text-xs font-medium ${
                  isOverdue
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {isOverdue ? <WarningIcon /> : <CalendarIcon />}
                <span>Vence: {fmt(activity.dueDate)}</span>
              </div>
            )}
          </div>
        )}

        {/* ── Row 6: estimated time ── */}
        {durationLabel && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <ClockIcon />
            <span>{durationLabel}</span>
          </div>
        )}

        {/* ── Row 7: subtask progress + toggle ── */}
        {totalSubtasks > 0 && (
          <div className="pt-0.5">
            <div className="flex items-center justify-between mb-1.5">
              <button
                onClick={() => setSubtasksOpen((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                <ChevronIcon up={subtasksOpen} />
                Subtareas
              </button>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {completedSubtasks}/{totalSubtasks}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  subtaskPercent === 100
                    ? 'bg-green-500 dark:bg-green-400'
                    : 'bg-blue-500 dark:bg-blue-400'
                }`}
                style={{ width: `${subtaskPercent}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-right">
              {subtaskPercent}%
            </p>
          </div>
        )}

        {/* ── Row 8: subtask toggle (when no existing subtasks) ── */}
        {totalSubtasks === 0 && (
          <button
            onClick={() => setSubtasksOpen((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
          >
            <PlusIcon />
            Agregar subtarea
          </button>
        )}

        {/* ── Subtask expanded section (lazy-mount) ── */}
        {subtasksOpen && (
          <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
            <SubtaskSection parentId={activity.id} />
          </div>
        )}
      </div>

      {/* ── Edit modal (internal) ── */}
      {editOpen && (
        <EditActivityModal activity={activity} onClose={() => setEditOpen(false)} />
      )}

      {/* ── Delete confirm (internal) ── */}
      <ConfirmDialog
        open={deleteOpen}
        title="Eliminar actividad"
        message={`¿Eliminar "${activity.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={() =>
          doDelete(activity.id, { onSuccess: () => setDeleteOpen(false) })
        }
        onCancel={() => setDeleteOpen(false)}
        loading={isDeleting}
      />
    </>
  );
}
