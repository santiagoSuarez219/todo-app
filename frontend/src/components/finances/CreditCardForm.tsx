import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { CreateCreditCardDto, CreditCard } from '../../types';

const schema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(255),
  bank: z.string().min(1, 'El banco es requerido').max(255),
  interestRate: z.coerce.number().min(0).max(1),
  monthlyFee: z.coerce.number().min(0),
  totalLimit: z.coerce.number().positive('El cupo debe ser mayor a 0'),
  availableLimit: z.coerce.number().min(0),
});

type FormValues = z.output<typeof schema>;

const inputCls =
  'w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-colors';

const labelCls = 'block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1';

interface Props {
  initial?: CreditCard;
  onSubmit: (dto: CreateCreditCardDto) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function CreditCardForm({ initial, onSubmit, onCancel, loading }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<z.input<typeof schema>, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? '',
      bank: initial?.bank ?? '',
      interestRate: initial?.interestRate ?? undefined,
      monthlyFee: initial?.monthlyFee ?? undefined,
      totalLimit: initial?.totalLimit ?? undefined,
      availableLimit: initial?.availableLimit ?? undefined,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Nombre *</label>
          <input {...register('name')} className={inputCls} placeholder="Ej: Visa Platinum" />
          {errors.name && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label className={labelCls}>Banco *</label>
          <input {...register('bank')} className={inputCls} placeholder="Ej: Davivienda" />
          {errors.bank && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.bank.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Cupo total (COP) *</label>
          <input type="number" step="0.01" min="0" {...register('totalLimit')} className={inputCls} placeholder="0" />
          {errors.totalLimit && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.totalLimit.message}</p>}
        </div>
        <div>
          <label className={labelCls}>Cupo disponible (COP) *</label>
          <input type="number" step="0.01" min="0" {...register('availableLimit')} className={inputCls} placeholder="0" />
          {errors.availableLimit && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.availableLimit.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Tasa de interés (ej: 0.2800) *</label>
          <input type="number" step="0.0001" min="0" max="1" {...register('interestRate')} className={inputCls} placeholder="0.0000" />
          {errors.interestRate && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.interestRate.message}</p>}
        </div>
        <div>
          <label className={labelCls}>Cuota de manejo (COP) *</label>
          <input type="number" step="0.01" min="0" {...register('monthlyFee')} className={inputCls} placeholder="0" />
          {errors.monthlyFee && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.monthlyFee.message}</p>}
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
