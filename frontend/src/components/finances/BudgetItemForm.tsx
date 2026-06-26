import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { CreateBudgetItemDto } from '../../types';

const schema = z.object({
  description: z.string().min(1, 'La descripción es requerida').max(255),
  plannedAmount: z.coerce.number({ invalid_type_error: 'Ingresa un monto válido' }).positive('Debe ser mayor a 0'),
});

type FormValues = z.infer<typeof schema>;

const inputCls =
  'border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-colors';

interface Props {
  onSubmit: (dto: CreateBudgetItemDto) => Promise<void>;
  loading?: boolean;
}

export default function BudgetItemForm({ onSubmit, loading }: Props) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { description: '', plannedAmount: undefined },
  });

  async function handleAdd(values: FormValues) {
    await onSubmit(values);
    reset();
  }

  return (
    <form onSubmit={handleSubmit(handleAdd)} className="flex items-start gap-2">
      <div className="flex-1 min-w-0">
        <input
          {...register('description')}
          className={`${inputCls} w-full`}
          placeholder="Descripción del ítem"
        />
        {errors.description && (
          <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.description.message}</p>
        )}
      </div>
      <div className="w-36 shrink-0">
        <input
          type="number"
          step="0.01"
          min="0"
          {...register('plannedAmount')}
          className={`${inputCls} w-full`}
          placeholder="Monto COP"
        />
        {errors.plannedAmount && (
          <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.plannedAmount.message}</p>
        )}
      </div>
      <button
        type="submit"
        disabled={loading}
        className="px-3 py-2 text-sm font-medium rounded-lg bg-blue-700 dark:bg-blue-600 text-white hover:bg-blue-800 dark:hover:bg-blue-700 disabled:opacity-50 transition-colors shrink-0"
      >
        {loading ? '…' : 'Agregar'}
      </button>
    </form>
  );
}
