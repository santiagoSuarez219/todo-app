import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { CreateDebtDto, Debt } from '../../types';

const schema = z.object({
  description: z.string().min(1, 'La descripción es requerida').max(255),
  productValue: z.coerce.number().positive('El valor del producto debe ser mayor a 0'),
  installmentValue: z.coerce.number().positive('El valor de la cuota debe ser mayor a 0'),
  totalInstallments: z.coerce.number().int().min(1, 'Debe tener al menos 1 cuota'),
  initialPayment: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number().positive('La cuota inicial debe ser mayor a 0').optional(),
  ),
});

type FormValues = z.output<typeof schema>;

const inputCls =
  'w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-colors';
const labelCls = 'block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1';

interface Props {
  initial?: Debt;
  onSubmit: (dto: CreateDebtDto) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function DebtForm({ initial, onSubmit, onCancel, loading }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.input<typeof schema>, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: initial?.description ?? '',
      productValue: initial?.productValue ?? undefined,
      installmentValue: initial?.installmentValue ?? undefined,
      totalInstallments: initial?.totalInstallments ?? undefined,
      initialPayment: initial?.initialPayment ?? undefined,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className={labelCls}>Descripción *</label>
        <input {...register('description')} className={inputCls} placeholder="Ej: Nevera Samsung" />
        {errors.description && (
          <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.description.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Valor producto (COP) *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            {...register('productValue')}
            className={inputCls}
            placeholder="0"
          />
          {errors.productValue && (
            <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.productValue.message}</p>
          )}
        </div>
        <div>
          <label className={labelCls}>Valor cuota (COP) *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            {...register('installmentValue')}
            className={inputCls}
            placeholder="0"
          />
          {errors.installmentValue && (
            <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.installmentValue.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Número de cuotas *</label>
          <input
            type="number"
            min="1"
            step="1"
            {...register('totalInstallments')}
            className={inputCls}
            placeholder="12"
          />
          {errors.totalInstallments && (
            <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.totalInstallments.message}</p>
          )}
        </div>
        <div>
          <label className={labelCls}>Cuota inicial (COP)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            {...register('initialPayment')}
            className={inputCls}
            placeholder="Opcional"
          />
          {errors.initialPayment && (
            <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.initialPayment.message}</p>
          )}
        </div>
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
          className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-700 dark:bg-blue-600 text-white hover:bg-blue-800 dark:hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}
