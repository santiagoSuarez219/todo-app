import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Activity, ActivityStatus, Automatizacion, CreateActivityDto, Project } from '../types';
import { useUpdateActivity, useDeleteActivity, useActivitySubtasks, useCreateSubtask, useCancelFutureInstances } from '../hooks/useActivities';
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

function SunIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 1 0 0 10A5 5 0 0 0 12 7z" />
    </svg>
  );
}

function NotionIcon() {
  return (
    <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" />
    </svg>
  );
}

function RecurringIcon() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 0 0 4.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 0 1-15.357-2m15.357 2H15" />
    </svg>
  );
}

function BanIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
  );
}

// ─── Recurrence helpers ───────────────────────────────────────────────────────

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'diariamente',
  weekly: 'semanalmente',
  biweekly: 'quincenalmente',
  monthly: 'mensualmente',
  yearly: 'anualmente',
};

// ─── AutomatizacionBadge ──────────────────────────────────────────────────────

const AUTOMATIZACION_CONFIG: Record<string, { label: string; cls: string }> = {
  fully_automatable: { label: 'Automatizable', cls: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800' },
  partially_automatable: { label: 'Parcialmente', cls: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800' },
  not_automatable: { label: 'No automatizable', cls: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600' },
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
  { value: 'pending', label: 'Pendiente', dot: 'bg-yellow-400' },
  { value: 'in_progress', label: 'En progreso', dot: 'bg-blue-500' },
  { value: 'completed', label: 'Completada', dot: 'bg-green-500' },
  { value: 'on_hold', label: 'En espera', dot: 'bg-purple-500' },
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
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors ${value === activity.status
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

function CreateSubtaskModal({
  parentId,
  parentProject,
  onClose,
}: {
  parentId: string;
  parentProject: Project | null;
  onClose: () => void;
}) {
  const { mutateAsync, isPending } = useCreateSubtask(parentId);

  async function handleSubmit(dto: CreateActivityDto) {
    await mutateAsync(dto);
    onClose();
  }

  // Pre-fill project from parent; hide the selector since it's inherited
  const initial: Partial<Activity> = parentProject
    ? { project: parentProject } as Partial<Activity>
    : {};

  return (
    <Modal title="Nueva subtarea" onClose={onClose}>
      <ActivityForm
        initial={initial}
        parentId={parentId}
        hideProject
        onSubmit={handleSubmit}
        onCancel={onClose}
        loading={isPending}
      />
    </Modal>
  );
}

// ─── SubtaskSection ───────────────────────────────────────────────────────────

function SubtaskSection({
  parentId,
  parentProject,
}: {
  parentId: string;
  parentProject: Project | null;
}) {
  const { data: subtasks = [], isLoading } = useActivitySubtasks(parentId);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-2">
      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 py-2">
          <span className="w-3 h-3 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          Cargando subtareas…
        </div>
      )}

      {subtasks.map((sub) => (
        <ActivityCard key={sub.id} activity={sub} />
      ))}

      <button
        onClick={() => setCreateOpen(true)}
        className="flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors"
      >
        <PlusIcon />
        Agregar subtarea
      </button>

      {createOpen && (
        <CreateSubtaskModal
          parentId={parentId}
          parentProject={parentProject}
          onClose={() => setCreateOpen(false)}
        />
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

// ─── TypeBadge ────────────────────────────────────────────────────────────────

const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  task:     { label: 'Tarea',        cls: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600' },
  reminder: { label: 'Recordatorio', cls: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800' },
  event:    { label: 'Evento',       cls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
};

function TypeBadge({ type }: { type: string }) {
  const cfg = TYPE_BADGE[type];
  if (!cfg) return null;
  return (
    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(dateStr: string, withTime = false) {
  return new Date(dateStr).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

function toInputValue(dateStr: string, withTime: boolean) {
  const d = new Date(dateStr);
  if (withTime) {
    // datetime-local requires "YYYY-MM-DDTHH:mm"
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  return d.toISOString().slice(0, 10);
}

// ─── InlineDueDateEditor ──────────────────────────────────────────────────────

function InlineDueDateEditor({
  activity,
  withTime = false,
  label,
  overdue = false,
}: {
  activity: Activity;
  withTime?: boolean;
  label: string;
  overdue?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { mutate, isPending } = useUpdateActivity();

  useEffect(() => {
    if (!editing || !inputRef.current) return;
    inputRef.current.focus();
    try { inputRef.current.showPicker?.(); } catch { /* browser may block */ }
  }, [editing]);

  function commit(value: string) {
    setEditing(false);
    if (!value || !activity.dueDate) return;
    const next = withTime ? new Date(value).toISOString() : value;
    const current = toInputValue(activity.dueDate, withTime);
    if (next === current) return;
    mutate({ id: activity.id, dto: { dueDate: next } });
  }

  const baseTextCls = overdue
    ? 'text-red-600 dark:text-red-400'
    : 'text-gray-500 dark:text-gray-400';

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        {overdue ? <WarningIcon /> : <CalendarIcon />}
        <input
          ref={inputRef}
          type={withTime ? 'datetime-local' : 'date'}
          defaultValue={activity.dueDate ? toInputValue(activity.dueDate, withTime) : ''}
          onBlur={(e) => commit(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit(e.currentTarget.value);
            if (e.key === 'Escape') setEditing(false);
          }}
          disabled={isPending}
          className="text-xs border border-blue-300 dark:border-blue-600 rounded px-1.5 py-0.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
        />
        {isPending && (
          <span className="w-3 h-3 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      title="Editar fecha límite"
      className={`group flex items-center gap-1.5 text-xs font-medium ${baseTextCls} hover:text-blue-700 dark:hover:text-blue-400 transition-colors`}
    >
      {overdue ? <WarningIcon /> : <CalendarIcon />}
      <span>{label}: {activity.dueDate ? fmt(activity.dueDate, withTime) : '—'}</span>
      <span className="opacity-0 group-hover:opacity-60 transition-opacity">
        <EditIcon />
      </span>
    </button>
  );
}

// ─── ActivityCard ─────────────────────────────────────────────────────────────

export default function ActivityCard({ activity, onEdit, onDelete }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [cancelInstancesOpen, setCancelInstancesOpen] = useState(false);
  const [subtasksOpen, setSubtasksOpen] = useState(false);
  const [createSubtaskOpen, setCreateSubtaskOpen] = useState(false);
  const { mutate: doDelete, isPending: isDeleting } = useDeleteActivity();
  const { mutate: toggleSchedule, isPending: isScheduling } = useUpdateActivity();
  const { mutate: doCancelInstances, isPending: isCancelling } = useCancelFutureInstances();

  const isTask     = activity.type === 'task';
  const isReminder = activity.type === 'reminder';
  const isEvent    = activity.type === 'event';

  const now = new Date();
  const isOverdue =
    activity.status !== 'completed' &&
    (isTask || isEvent
      ? activity.dueDate && new Date(activity.dueDate) < now
      : isReminder && activity.actionDate && new Date(activity.actionDate) < now);

  const totalSubtasks = isTask ? (activity.subtasks?.length ?? 0) : 0;
  const completedSubtasks =
    activity.subtasks?.filter((s) => s.status === 'completed').length ?? 0;
  const subtaskPercent =
    totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  const durationLabel =
    activity.duration && activity.durationUnit
      ? `${activity.duration} ${activity.durationUnit === 'hours'
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
        className={`bg-white dark:bg-gray-800 rounded-lg border flex flex-col gap-3 p-4 transition-shadow hover:shadow-md ${isOverdue
          ? 'border-red-300 dark:border-red-700'
          : 'border-gray-200 dark:border-gray-700'
          }`}
      >
        {/* ── Row 1: status dropdown + actions ── */}
        <div className="flex items-center justify-between gap-2">
          <StatusDropdown activity={activity} />
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() =>
                toggleSchedule({ id: activity.id, dto: { scheduledForToday: !activity.scheduledForToday } })
              }
              disabled={isScheduling}
              title={activity.scheduledForToday ? 'Quitar de hoy' : 'Programar para hoy'}
              className={`flex items-center gap-1 text-xs px-1.5 py-1 rounded transition-colors disabled:opacity-50 ${
                activity.scheduledForToday
                  ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30'
                  : 'text-gray-400 dark:text-gray-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
              }`}
            >
              <SunIcon />
              <span>Para hoy</span>
            </button>
            <button
              onClick={handleEditClick}
              title="Editar actividad"
              className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-blue-700 dark:hover:text-blue-400 px-1.5 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              <EditIcon />
              <span>Editar</span>
            </button>
            {activity.isTemplate && (
              <button
                onClick={() => setCancelInstancesOpen(true)}
                disabled={isCancelling}
                title="Cancelar instancias futuras"
                className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-orange-600 dark:hover:text-orange-400 px-1.5 py-1 rounded hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors disabled:opacity-50"
              >
                <BanIcon />
                <span>Cancelar futuras</span>
              </button>
            )}
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
          <div className="flex items-start gap-2">
            <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug flex-1">
              {activity.name}
            </p>
            {activity.isTemplate && (
              <span
                title={`Se repite ${FREQUENCY_LABELS[activity.recurrenceFrequency ?? ''] ?? ''}`}
                className="shrink-0 inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
              >
                <RecurringIcon />
                Recurrente
              </span>
            )}
            {!activity.isTemplate && activity.templateId && (
              <span
                title="Instancia de actividad recurrente"
                className="shrink-0 inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600"
              >
                <RecurringIcon />
                Auto
              </span>
            )}
          </div>
          {activity.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
              {activity.description}
            </p>
          )}
        </div>

        {/* ── Row 2b: type badge ── */}
        <TypeBadge type={activity.type} />

        {/* ── Row 3: project chip + notion chip ── */}
        {(activity.project || activity.notionUrl) && (
          <div className="flex flex-wrap gap-1.5">
            {activity.project && (
              <Link
                to={`/projects/${activity.project.id}`}
                className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
              >
                <FolderIcon />
                {activity.project.name}
              </Link>
            )}
            {activity.notionUrl && (
              <a
                href={activity.notionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <NotionIcon />
                Notion
              </a>
            )}
          </div>
        )}

        {/* ── Separator ── */}
        <hr className="border-gray-100 dark:border-gray-700" />

        <div></div>

        {/* ── Row 4: priority + energy + automatizacion (solo TASK) ── */}
        <div className="flex items-center gap-3 flex-wrap">
          <PriorityBadge priority={activity.priority} />
          <EnergyIndicator energy={activity.energy} />
          {isTask && activity.automatizacion && (
            <AutomatizacionBadge value={activity.automatizacion} />
          )}
        </div>

        {/* ── Row 5: fechas (semántica por tipo) ── */}
        {(activity.actionDate || activity.dueDate) && (
          <div className="flex flex-col gap-1.5">
            {/* TASK: fecha de acción (sin hora) */}
            {isTask && activity.actionDate && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <CalendarIcon />
                <span>Inicio: {fmt(activity.actionDate)}</span>
              </div>
            )}
            {/* TASK: fecha límite (sin hora) — editable inline */}
            {isTask && activity.dueDate && (
              <InlineDueDateEditor
                activity={activity}
                label="Vence"
                overdue={!!isOverdue}
              />
            )}
            {/* REMINDER: fecha + hora */}
            {isReminder && activity.actionDate && (
              <div className={`flex items-center gap-1.5 text-xs font-medium ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                {isOverdue ? <WarningIcon /> : <CalendarIcon />}
                <span>Recordatorio: {fmt(activity.actionDate, true)}</span>
              </div>
            )}
            {/* EVENT: inicio y fin con hora */}
            {isEvent && activity.actionDate && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <CalendarIcon />
                <span>Inicio: {fmt(activity.actionDate, true)}</span>
              </div>
            )}
            {/* EVENT: fin con hora — editable inline */}
            {isEvent && activity.dueDate && (
              <InlineDueDateEditor
                activity={activity}
                withTime
                label="Fin"
                overdue={!!isOverdue}
              />
            )}
          </div>
        )}

        {/* ── Row 6: duración (solo TASK) ── */}
        {isTask && durationLabel && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <ClockIcon />
            <span>{durationLabel}</span>
          </div>
        )}

        {/* ── Row 7: subtask area (solo TASK) ── */}
        {isTask && totalSubtasks > 0 ? (
          <div className="pt-0.5">
            {/* Progress bar */}
            <div className="flex items-center justify-between mb-1.5">
              <button
                onClick={() => setSubtasksOpen((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
              >
                <ChevronIcon up={subtasksOpen} />
                Ver subtareas ({totalSubtasks})
              </button>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {completedSubtasks}/{totalSubtasks}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${subtaskPercent === 100
                  ? 'bg-green-500 dark:bg-green-400'
                  : 'bg-blue-500 dark:bg-blue-400'
                  }`}
                style={{ width: `${subtaskPercent}%` }}
              />
            </div>

            {/* Expanded subtask list (lazy-mount) */}
            {subtasksOpen && (
              <div className="mt-3 border-t border-gray-100 dark:border-gray-700 pt-3">
                <SubtaskSection parentId={activity.id} parentProject={activity.project} />
              </div>
            )}
          </div>
        ) : isTask ? (
          <button
            onClick={() => setCreateSubtaskOpen(true)}
            className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
          >
            <PlusIcon />
            Agregar subtarea
          </button>
        ) : null}

        {/* Create subtask modal — only for tasks with no existing subtasks */}
        {createSubtaskOpen && (
          <CreateSubtaskModal
            parentId={activity.id}
            parentProject={activity.project}
            onClose={() => setCreateSubtaskOpen(false)}
          />
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

      {/* ── Cancel future instances confirm ── */}
      <ConfirmDialog
        open={cancelInstancesOpen}
        title="Cancelar instancias futuras"
        message={`¿Cancelar todas las instancias futuras pendientes de "${activity.name}"? El template y las instancias pasadas no se modificarán.`}
        confirmLabel="Cancelar instancias"
        onConfirm={() =>
          doCancelInstances(activity.id, { onSuccess: () => setCancelInstancesOpen(false) })
        }
        onCancel={() => setCancelInstancesOpen(false)}
        loading={isCancelling}
      />
    </>
  );
}
