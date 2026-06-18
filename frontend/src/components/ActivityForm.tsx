import { useEffect, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ActivityStatus, ActivityType, Priority, Energy, Device, DurationUnit, Automatizacion,
  type CreateActivityDto, type Activity, type Project,
} from '../types';

const schema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(255),
  description: z.string().max(5000).nullish(),
  projectId: z.string().uuid().nullish(),
  status: z.string().optional(),
  priority: z.string().optional(),
  energy: z.string().optional(),
  type: z.string().optional(),
  device: z.string().nullish(),
  actionDate: z.string().nullish(),
  dueDate: z.string().nullish(),
  duration: z.string().nullish(),
  durationUnit: z.string().nullish(),
  location: z.string().max(255).nullish(),
  automatizacion: z.string().nullish(),
  notionUrl: z.string().url({ message: 'Debe ser una URL válida' }).nullish(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  initial?: Partial<Activity>;
  projects?: Project[];
  parentId?: string;
  hideProject?: boolean;
  onSubmit: (dto: CreateActivityDto) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

// ─── Labels ───────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  completed: 'Completada',
  cancelled: 'Cancelada',
  on_hold: 'En espera',
};

const PRIORITY_LABELS: Record<string, string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
};

const ENERGY_LABELS: Record<string, string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
};

const DEVICE_LABELS: Record<string, string> = {
  phone: 'Teléfono',
  computer: 'Computadora',
  tablet: 'Tablet',
};

const UNIT_LABELS: Record<string, string> = {
  hours: 'Horas',
  days: 'Días',
};

const AUTOMATIZACION_LABELS: Record<string, string> = {
  fully_automatable: 'Se puede automatizar completamente',
  partially_automatable: 'Se puede automatizar parcialmente',
  not_automatable: 'No se puede automatizar',
};

// ─── Shared field classes ─────────────────────────────────────────────────────

const inputCls =
  'w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-colors';

const labelCls = 'block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1';

// ─── Type selector pills ──────────────────────────────────────────────────────

const TYPE_OPTIONS = [
  { value: ActivityType.TASK,     label: 'Tarea',       icon: '✓' },
  { value: ActivityType.REMINDER, label: 'Recordatorio', icon: '🔔' },
  { value: ActivityType.EVENT,    label: 'Evento',       icon: '📅' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ActivityForm({
  initial,
  projects = [],
  parentId,
  hideProject = false,
  onSubmit,
  onCancel,
  loading,
}: Props) {
  const { register, handleSubmit, setValue, control, formState: { errors } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: {
        name: initial?.name ?? '',
        description: initial?.description ?? '',
        projectId: initial?.project?.id ?? null,
        status: initial?.status ?? ActivityStatus.PENDING,
        priority: initial?.priority ?? Priority.MEDIUM,
        energy: initial?.energy ?? Energy.MEDIUM,
        type: initial?.type ?? ActivityType.TASK,
        device: initial?.device ?? null,
        actionDate: initial?.actionDate ? initial.actionDate.slice(0, 16) : '',
        dueDate: initial?.dueDate ? initial.dueDate.slice(0, 16) : '',
        duration: initial?.duration != null ? String(initial.duration) : '',
        durationUnit: initial?.durationUnit ?? null,
        location: initial?.location ?? '',
        automatizacion: initial?.automatizacion ?? null,
        notionUrl: initial?.notionUrl ?? null,
      },
    });

  const watchedType = useWatch({ control, name: 'type' }) ?? ActivityType.TASK;
  const isTask     = watchedType === ActivityType.TASK;
  const isReminder = watchedType === ActivityType.REMINDER;
  const isEvent    = watchedType === ActivityType.EVENT;

  // Clear inapplicable fields when type changes (skip on first render)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }

    const opts = { shouldDirty: false } as const;
    if (isReminder) {
      setValue('dueDate', null, opts);
      setValue('duration', null, opts);
      setValue('durationUnit', null, opts);
      setValue('device', null, opts);
      setValue('location', null, opts);
      setValue('automatizacion', null, opts);
    }
    if (isEvent) {
      setValue('duration', null, opts);
      setValue('durationUnit', null, opts);
      setValue('device', null, opts);
      setValue('location', null, opts);
      setValue('automatizacion', null, opts);
    }
  }, [watchedType]); // eslint-disable-line react-hooks/exhaustive-deps

  function toDto(values: FormValues): CreateActivityDto {
    return {
      name: values.name,
      description: values.description || null,
      projectId: values.projectId || null,
      parentId: parentId ?? undefined,
      status: (values.status as CreateActivityDto['status']) || undefined,
      priority: (values.priority as CreateActivityDto['priority']) || undefined,
      energy: (values.energy as CreateActivityDto['energy']) || undefined,
      type: (values.type as CreateActivityDto['type']) || undefined,
      device: (values.device as CreateActivityDto['device']) || null,
      actionDate: values.actionDate || null,
      dueDate: values.dueDate || null,
      duration: values.duration ? Number(values.duration) : null,
      durationUnit: (values.durationUnit as CreateActivityDto['durationUnit']) || null,
      location: values.location || null,
      automatizacion: (values.automatizacion as CreateActivityDto['automatizacion']) || null,
      notionUrl: values.notionUrl || null,
    };
  }

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(toDto(values)))} className="space-y-4">

      {/* ── Tipo (primero) ── */}
      <div>
        <label className={labelCls}>Tipo de actividad</label>
        <div className="flex gap-2">
          {TYPE_OPTIONS.map(({ value, label, icon }) => (
            <label
              key={value}
              className={`flex-1 flex items-center justify-center gap-1.5 cursor-pointer rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                watchedType === value
                  ? 'bg-blue-700 dark:bg-blue-600 text-white border-blue-700 dark:border-blue-600'
                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'
              }`}
            >
              <input
                type="radio"
                value={value}
                className="sr-only"
                {...register('type')}
              />
              <span>{icon}</span>
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* ── Nombre ── */}
      <div>
        <label className={labelCls}>Nombre *</label>
        <input {...register('name')} className={inputCls} placeholder="Nombre de la actividad" />
        {errors.name && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.name.message}</p>}
      </div>

      {/* ── Descripción ── */}
      <div>
        <label className={labelCls}>Descripción</label>
        <textarea
          {...register('description')}
          rows={3}
          placeholder="Detalle adicional..."
          className={`${inputCls} resize-none`}
        />
      </div>

      {/* ── Notion URL ── */}
      <div>
        <label className={labelCls}>Página de Notion</label>
        <input
          type="url"
          {...register('notionUrl')}
          placeholder="https://www.notion.so/..."
          className={inputCls}
        />
        {errors.notionUrl && (
          <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.notionUrl.message}</p>
        )}
      </div>

      {/* ── Proyecto — oculto en subtareas ── */}
      {!hideProject && projects.length > 0 && (
        <div>
          <label className={labelCls}>Proyecto</label>
          <select {...register('projectId')} className={inputCls}>
            <option value="">Sin proyecto</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* ── Estado / Prioridad / Energía ── */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Estado</label>
          <select {...register('status')} className={inputCls}>
            {Object.values(ActivityStatus).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Prioridad</label>
          <select {...register('priority')} className={inputCls}>
            {Object.values(Priority).map((s) => (
              <option key={s} value={s}>{PRIORITY_LABELS[s] ?? s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Energía</label>
          <select {...register('energy')} className={inputCls}>
            {Object.values(Energy).map((s) => (
              <option key={s} value={s}>{ENERGY_LABELS[s] ?? s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Fechas — label y tipo varían por tipo de actividad ── */}
      <div className={`grid gap-3 ${isTask || isEvent ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <div>
          <label className={labelCls}>
            {isTask ? 'Fecha de acción' : isReminder ? 'Fecha y hora' : 'Inicio'}
          </label>
          <input
            type={isTask ? 'date' : 'datetime-local'}
            {...register('actionDate')}
            className={inputCls}
          />
        </div>
        {(isTask || isEvent) && (
          <div>
            <label className={labelCls}>
              {isTask ? 'Fecha límite' : 'Fin'}
            </label>
            <input
              type={isTask ? 'date' : 'datetime-local'}
              {...register('dueDate')}
              className={inputCls}
            />
          </div>
        )}
      </div>

      {/* ── Campos exclusivos de TASK ── */}
      {isTask && (
        <>
          {/* Dispositivo */}
          <div>
            <label className={labelCls}>Dispositivo</label>
            <select {...register('device')} className={inputCls}>
              <option value="">Ninguno</option>
              {Object.values(Device).map((s) => (
                <option key={s} value={s}>{DEVICE_LABELS[s] ?? s}</option>
              ))}
            </select>
          </div>

          {/* Duración */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Duración</label>
              <input
                type="number"
                min="0"
                step="0.5"
                {...register('duration')}
                className={inputCls}
                placeholder="0"
              />
            </div>
            <div>
              <label className={labelCls}>Unidad</label>
              <select {...register('durationUnit')} className={inputCls}>
                <option value="">Ninguna</option>
                {Object.values(DurationUnit).map((s) => (
                  <option key={s} value={s}>{UNIT_LABELS[s] ?? s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Automatización */}
          <div>
            <label className={labelCls}>Automatización</label>
            <select {...register('automatizacion')} className={inputCls}>
              <option value="">Sin clasificar</option>
              {Object.values(Automatizacion).map((s) => (
                <option key={s} value={s}>{AUTOMATIZACION_LABELS[s] ?? s}</option>
              ))}
            </select>
          </div>

          {/* Ubicación */}
          <div>
            <label className={labelCls}>Ubicación</label>
            <input {...register('location')} className={inputCls} placeholder="Lugar de la actividad" />
          </div>
        </>
      )}

      {/* ── Actions ── */}
      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-700 dark:bg-blue-600 text-white hover:bg-blue-800 dark:hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}
