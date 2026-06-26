import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { CreateBudgetDto, Budget } from '../../types';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const schema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(255),
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2020),
});

type FormValues = z.infer<typeof schema>;

const inputCls =
  'w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-colors';

const labelCls = 'block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1';

interface Props {
  initial?: Budget;
  onSubmit: (dto: CreateBudgetDto) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function BudgetForm({ initial, onSubmit, onCancel, loading }: Props) {
  const currentYear = new Date().getFullYear();
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? '',
      month: initial?.month ?? new Date().getMonth() + 1,
      year: initial?.year ?? currentYear,
    },
  });

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(values))} className="space-y-4">
      <div>
        <label className={labelCls}>Nombre *</label>
        <input {...register('name')} className={inputCls} placeholder="Ej: Presupuesto enero 2025" />
        {errors.name && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Mes *</label>
          <select {...register('month')} className={inputCls}>
            {MONTHS.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
          {errors.month && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.month.message}</p>}
        </div>
        <div>
          <label className={labelCls}>Año *</label>
          <input type="number" min={2020} {...register('year')} className={inputCls} placeholder={String(currentYear)} />
          {errors.year && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.year.message}</p>}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
        <button type="button" onClick={onCancel} disabled={loading}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={loading}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-700 dark:bg-blue-600 text-white hover:bg-blue-800 dark:hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {loading ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}
