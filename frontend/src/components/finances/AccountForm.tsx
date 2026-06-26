import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AccountType, type CreateAccountDto, type Account } from '../../types';

const schema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(255),
  type: z.nativeEnum(AccountType),
  bank: z.string().min(1, 'El banco es requerido').max(255),
  currentBalance: z.coerce.number({ invalid_type_error: 'Ingresa un saldo válido' }),
  interestRate: z.coerce.number().min(0).max(1).nullish(),
});

type FormValues = z.infer<typeof schema>;

const TYPE_LABELS: Record<AccountType, string> = {
  corriente: 'Corriente',
  ahorros: 'Ahorros',
  digital: 'Digital',
};

const inputCls =
  'w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-colors';

const labelCls = 'block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1';

interface Props {
  initial?: Account;
  onSubmit: (dto: CreateAccountDto) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function AccountForm({ initial, onSubmit, onCancel, loading }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? '',
      type: initial?.type ?? AccountType.AHORROS,
      bank: initial?.bank ?? '',
      currentBalance: initial?.currentBalance ?? undefined,
      interestRate: initial?.interestRate ?? undefined,
    },
  });

  return (
    <form onSubmit={handleSubmit((values) => onSubmit({ ...values, interestRate: values.interestRate ?? null }))} className="space-y-4">
      <div>
        <label className={labelCls}>Nombre *</label>
        <input {...register('name')} className={inputCls} placeholder="Ej: Cuenta de ahorros principal" />
        {errors.name && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Banco *</label>
          <input {...register('bank')} className={inputCls} placeholder="Ej: Bancolombia" />
          {errors.bank && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.bank.message}</p>}
        </div>
        <div>
          <label className={labelCls}>Tipo *</label>
          <select {...register('type')} className={inputCls}>
            {Object.values(AccountType).map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Saldo actual (COP) *</label>
          <input type="number" step="0.01" {...register('currentBalance')} className={inputCls} placeholder="0" />
          {errors.currentBalance && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.currentBalance.message}</p>}
        </div>
        <div>
          <label className={labelCls}>Tasa de interés (ej: 0.0450)</label>
          <input type="number" step="0.0001" min="0" max="1" {...register('interestRate')} className={inputCls} placeholder="Opcional" />
          {errors.interestRate && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.interestRate.message}</p>}
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
