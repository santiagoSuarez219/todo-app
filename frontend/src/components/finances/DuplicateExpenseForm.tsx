import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Expense, DuplicateExpenseDto } from '../../types';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const schema = z.object({
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2020),
});

type FormValues = z.output<typeof schema>;

const inputCls =
  'w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-colors';

const labelCls = 'block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1';

interface Props {
  origin: Expense;
  onSubmit: (dto: DuplicateExpenseDto) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function DuplicateExpenseForm({ origin, onSubmit, onCancel, loading }: Props) {
  // spec-035: un gasto solo planeado no tiene `date` — se propone el mes
  // siguiente al actual como destino por defecto.
  const now = new Date();
  const [refYear, refMonth] = origin.date
    ? origin.date.split('-').map(Number)
    : [now.getFullYear(), now.getMonth() + 1];

  const getNextMonth = () => (refMonth === 12 ? 1 : refMonth + 1);
  const getNextYear = () => (refMonth === 12 ? refYear + 1 : refYear);

  const { register, handleSubmit, formState: { errors } } = useForm<z.input<typeof schema>, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      month: getNextMonth(),
      year: getNextYear(),
    },
  });

  const handleFormSubmit = (values: FormValues) => {
    const dto: DuplicateExpenseDto = {
      month: values.month,
      year: values.year,
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

      <div className="text-xs text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-2">
        Se copiará: <strong>{origin.description}</strong> tal cual (planeado y ejecución si los tenía) por{' '}
        {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(
          origin.amount ?? origin.plannedAmount ?? 0,
        )}
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
        <button type="button" onClick={onCancel} disabled={loading}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={loading}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-700 dark:bg-blue-600 text-white hover:bg-blue-800 dark:hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {loading ? 'Duplicando…' : 'Duplicar'}
        </button>
      </div>
    </form>
  );
}
