import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ProjectStatus, type CreateProjectDto, type Project } from '../types';

const schema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(255),
  status: z.nativeEnum(ProjectStatus).optional(),
  startDate: z.string().min(1, 'La fecha de inicio es requerida'),
  endDate: z.string().optional().nullable().transform(v => v === '' ? undefined : v),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  initial?: Partial<Project>;
  onSubmit: (dto: CreateProjectDto) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const STATUS_LABELS: Record<ProjectStatus, string> = {
  active:    'Activo',
  inactive:  'Inactivo',
  paused:    'Pausado',
  completed: 'Completado',
};

const inputCls =
  'w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-colors';

const labelCls = 'block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1';

export default function ProjectForm({ initial, onSubmit, onCancel, loading }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? '',
      status: initial?.status ?? ProjectStatus.ACTIVE,
      startDate: initial?.startDate ? initial.startDate.slice(0, 10) : '',
      endDate: initial?.endDate ? initial.endDate.slice(0, 10) : '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Nombre */}
      <div>
        <label className={labelCls}>Nombre *</label>
        <input
          {...register('name')}
          className={inputCls}
          placeholder="Nombre del proyecto"
        />
        {errors.name && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.name.message}</p>}
      </div>

      {/* Estado */}
      <div>
        <label className={labelCls}>Estado</label>
        <select {...register('status')} className={inputCls}>
          {Object.values(ProjectStatus).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {/* Fechas */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Fecha de inicio *</label>
          <input type="date" {...register('startDate')} className={inputCls} />
          {errors.startDate && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.startDate.message}</p>}
        </div>
        <div>
          <label className={labelCls}>Fecha de fin (opcional)</label>
          <input type="date" {...register('endDate')} className={inputCls} />
        </div>
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
