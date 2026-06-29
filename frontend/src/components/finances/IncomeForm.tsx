import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { IncomeType, type CreateIncomeDto, type Income } from '../../types';

const schema = z.object({
  description: z.string().min(1, 'La descripción es requerida').max(255),
  amount: z.coerce.number().positive('El monto debe ser mayor a 0'),
  date: z.string().min(1, 'La fecha es requerida'),
  type: z.nativeEnum(IncomeType),
});

type FormValues = z.output<typeof schema>;

const TYPE_LABELS: Record<IncomeType, string> = {
  sueldo: 'Sueldo',
  freelance: 'Freelance',
  intereses: 'Intereses',
  dividendos: 'Dividendos',
  otro: 'Otro',
};

const inputCls =
  'w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-colors';

const labelCls = 'block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1';

interface Props {
  initial?: Income;
  onSubmit: (dto: CreateIncomeDto) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function IncomeForm({ initial, onSubmit, onCancel, loading }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<z.input<typeof schema>, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: initial?.description ?? '',
      amount: initial?.amount ?? undefined,
      date: initial?.date ?? new Date().toISOString().slice(0, 10),
      type: initial?.type ?? IncomeType.SUELDO,
    },
  });

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(values))} className="space-y-4">
      <div>
        <label className={labelCls}>Descripción *</label>
        <input {...register('description')} className={inputCls} placeholder="Ej: Nómina enero, Proyecto freelance..." />
        {errors.description && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.description.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Monto (COP) *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            {...register('amount')}
            className={inputCls}
            placeholder="0"
          />
          {errors.amount && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.amount.message}</p>}
        </div>
        <div>
          <label className={labelCls}>Fecha *</label>
          <input type="date" {...register('date')} className={inputCls} />
          {errors.date && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.date.message}</p>}
        </div>
      </div>

      <div>
        <label className={labelCls}>Tipo *</label>
        <select {...register('type')} className={inputCls}>
          {Object.values(IncomeType).map((t) => (
            <option key={t} value={t}>{TYPE_LABELS[t]}</option>
          ))}
        </select>
        {errors.type && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.type.message}</p>}
      </div>

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
          className="px-4 py-2 text-sm font-medium rounded-lg bg-green-700 dark:bg-green-600 text-white hover:bg-green-800 dark:hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}
