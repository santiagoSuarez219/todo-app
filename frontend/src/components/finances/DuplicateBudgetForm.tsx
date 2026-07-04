import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Budget, DuplicateBudgetDto } from '../../types';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const schema = z.object({
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2020),
  name: z.string().max(255).optional().nullable(),
});

type FormValues = z.output<typeof schema>;

const inputCls =
  'w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-colors';

const labelCls = 'block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1';

interface Props {
  origin: Budget;
  onSubmit: (dto: DuplicateBudgetDto) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function DuplicateBudgetForm({ origin, onSubmit, onCancel, loading }: Props) {
  const getNextMonth = () => {
    if (origin.month === 12) return 1;
    return origin.month + 1;
  };

  const getNextYear = () => {
    if (origin.month === 12) return origin.year + 1;
    return origin.year;
  };

  const { register, handleSubmit, formState: { errors } } = useForm<z.input<typeof schema>, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      month: getNextMonth(),
      year: getNextYear(),
      name: null,
    },
  });

  const handleFormSubmit = (values: FormValues) => {
    const dto: DuplicateBudgetDto = {
      month: values.month,
      year: values.year,
      name: values.name || undefined,
    };
    return onSubmit(dto);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div>
        <label className={labelCls}>Mes destino *</label>
        <select {...register('month')} className={inputCls}>
          {MONTHS.map((m, i) => (
            <option key={i + 1} value={i + 1}>{m}</option>
          ))}
        </select>
        {errors.month && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.month.message}</p>}
      </div>

      <div>
        <label className={labelCls}>Año destino *</label>
        <input type="number" min={2020} {...register('year')} className={inputCls} />
        {errors.year && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.year.message}</p>}
      </div>

      <div>
        <label className={labelCls}>Nombre (opcional)</label>
        <input type="text" {...register('name')} className={inputCls} placeholder={`Ej: ${origin.name}`} />
        {errors.name && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.name.message}</p>}
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-2">
        Se copiarán: <strong>{(origin.items?.length ?? 0)} ítems</strong>, todos los ingresos y gastos del mes.
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
        <button type="button" onClick={onCancel} disabled={loading}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={loading}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-700 dark:bg-blue-600 text-white hover:bg-blue-800 dark:hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {loading ? 'Duplicando…' : 'Duplicar mes'}
        </button>
      </div>
    </form>
  );
}
