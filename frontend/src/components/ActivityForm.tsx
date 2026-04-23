import { useForm } from 'react-hook-form';
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

const TYPE_LABELS: Record<string, string> = {
  task: 'Tarea',
  event: 'Evento',
  reminder: 'Recordatorio',
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

export default function ActivityForm({ initial, projects = [], parentId, hideProject = false, onSubmit, onCancel, loading }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
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
    },
  });

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
    };
  }

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(toDto(values)))} className="space-y-4">
      {/* Nombre */}
      <div>
        <label className={labelCls}>Nombre *</label>
        <input {...register('name')} className={inputCls} placeholder="Nombre de la actividad" />
        {errors.name && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.name.message}</p>}
      </div>

      {/* Descripción */}
      <div>
        <label className={labelCls}>Descripción</label>
        <textarea
          {...register('description')}
          rows={3}
          placeholder="Detalle adicional sobre la actividad..."
          className={`${inputCls} resize-none`}
        />
      </div>

      {/* Proyecto — oculto cuando es subtarea (se hereda del padre) */}
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

      {/* Estado / Prioridad / Energía */}
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

      {/* Tipo / Dispositivo */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Tipo</label>
          <select {...register('type')} className={inputCls}>
            {Object.values(ActivityType).map((s) => (
              <option key={s} value={s}>{TYPE_LABELS[s] ?? s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Dispositivo</label>
          <select {...register('device')} className={inputCls}>
            <option value="">Ninguno</option>
            {Object.values(Device).map((s) => (
              <option key={s} value={s}>{DEVICE_LABELS[s] ?? s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Fechas */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Fecha de acción</label>
          <input type="datetime-local" {...register('actionDate')} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Fecha de vencimiento</label>
          <input type="datetime-local" {...register('dueDate')} className={inputCls} />
        </div>
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

      {/* Actions */}
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
