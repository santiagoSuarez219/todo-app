import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { CreateCdtDto, Cdt } from '../../types';

const schema = z.object({
  bank: z.string().min(1, 'El banco es requerido').max(255),
  investedAmount: z.coerce.number({ invalid_type_error: 'Ingresa un monto válido' }).positive('El monto debe ser mayor a 0'),
  interestRate: z.coerce.number({ invalid_type_error: 'Ingresa una tasa válida' }).min(0).max(1),
  startDate: z.string().min(1, 'La fecha de inicio es requerida'),
  endDate: z.string().min(1, 'La fecha de vencimiento es requerida'),
}).refine((d) => d.endDate > d.startDate, {
  message: 'La fecha de vencimiento debe ser posterior a la de inicio',
  path: ['endDate'],
});

type FormValues = z.infer<typeof schema>;

const inputCls =
  'w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-colors';

const labelCls = 'block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1';

interface Props {
  initial?: Cdt;
  onSubmit: (dto: CreateCdtDto) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function CdtForm({ initial, onSubmit, onCancel, loading }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      bank: initial?.bank ?? '',
      investedAmount: initial?.investedAmount ?? undefined,
      interestRate: initial?.interestRate ?? undefined,
      startDate: initial?.startDate ?? '',
      endDate: initial?.endDate ?? '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className={labelCls}>Banco *</label>
        <input {...register('bank')} className={inputCls} placeholder="Ej: Bancolombia" />
        {errors.bank && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.bank.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Monto invertido (COP) *</label>
          <input type="number" step="0.01" min="0" {...register('investedAmount')} className={inputCls} placeholder="0" />
          {errors.investedAmount && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.investedAmount.message}</p>}
        </div>
        <div>
          <label className={labelCls}>Tasa de interés (ej: 0.1250) *</label>
          <input type="number" step="0.0001" min="0" max="1" {...register('interestRate')} className={inputCls} placeholder="0.0000" />
          {errors.interestRate && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.interestRate.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Fecha de inicio *</label>
          <input type="date" {...register('startDate')} className={inputCls} />
          {errors.startDate && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.startDate.message}</p>}
        </div>
        <div>
          <label className={labelCls}>Fecha de vencimiento *</label>
          <input type="date" {...register('endDate')} className={inputCls} />
          {errors.endDate && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.endDate.message}</p>}
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
