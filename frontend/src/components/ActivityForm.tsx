import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ActivityStatus, ActivityType, Priority, Energy, Device, DurationUnit,
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
});

type FormValues = z.infer<typeof schema>;

interface Props {
  initial?: Partial<Activity>;
  projects?: Project[];
  onSubmit: (dto: CreateActivityDto) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function ActivityForm({ initial, projects = [], onSubmit, onCancel, loading }: Props) {
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
    },
  });

  function toDto(values: FormValues): CreateActivityDto {
    return {
      name: values.name,
      description: values.description || null,
      projectId: values.projectId || null,
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
    };
  }

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(toDto(values)))} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
        <input
          {...register('name')}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
        <textarea
          {...register('description')}
          rows={3}
          placeholder="Detalle adicional sobre la actividad..."
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
      </div>

      {projects.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Proyecto</label>
          <select
            {...register('projectId')}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Sin proyecto</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
          <select {...register('status')} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
            {Object.values(ActivityStatus).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
          <select {...register('priority')} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
            {Object.values(Priority).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Energía</label>
          <select {...register('energy')} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
            {Object.values(Energy).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
          <select {...register('type')} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
            {Object.values(ActivityType).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dispositivo</label>
          <select {...register('device')} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
            <option value="">Ninguno</option>
            {Object.values(Device).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de acción</label>
          <input type="datetime-local" {...register('actionDate')} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Vencimiento</label>
          <input type="datetime-local" {...register('dueDate')} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Duración</label>
          <input type="number" min="0" step="0.5" {...register('duration')} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
          <select {...register('durationUnit')} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
            <option value="">Ninguna</option>
            {Object.values(DurationUnit).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
        <input {...register('location')} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50">
          Cancelar
        </button>
        <button type="submit" disabled={loading} className="px-4 py-2 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
          {loading ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}
