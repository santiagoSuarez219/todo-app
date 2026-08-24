import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ExpenseType, type CreateExpenseDto, type Expense } from '../../types';
import { useCreditCards } from '../../hooks/finances/useCreditCards';

// spec-034: amount/date dejan de ser obligatorios — un gasto puede nacer
// solo planeado (plannedAmount, sin ejecutar). La consistencia (al menos
// uno de los dos; amount y date siempre juntos) se valida con .refine(),
// espejando las invariantes del backend (CHK_expenses_has_amount,
// CHK_expenses_amount_date_together).
const schema = z
  .object({
    description: z.string().min(1, 'La descripción es requerida').max(255),
    executed: z.boolean(),
    amount: z.coerce.number().positive('El monto debe ser mayor a 0').optional(),
    date: z.string().optional(),
    plannedAmount: z.coerce.number().positive('Debe ser mayor a 0').optional(),
    type: z.nativeEnum(ExpenseType),
    creditCardId: z.union([z.literal(''), z.string().uuid()]).optional(),
  })
  .superRefine((values, ctx) => {
    if (values.executed) {
      if (!values.amount) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'El monto es requerido', path: ['amount'] });
      }
      if (!values.date) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La fecha es requerida', path: ['date'] });
      }
    } else if (!values.plannedAmount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Indica el monto planeado, o marca el gasto como ya ejecutado',
        path: ['plannedAmount'],
      });
    }
  });

type FormValues = z.output<typeof schema>;

const TYPE_LABELS: Record<ExpenseType, string> = {
  basico: 'Básico',
  lujo: 'Lujo',
  ahorro: 'Ahorro',
  pago_deuda: 'Pago de deuda',
};

const inputCls =
  'w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-colors';

const labelCls = 'block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1';

interface Props {
  initial?: Expense;
  onSubmit: (dto: CreateExpenseDto) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function ExpenseForm({ initial, onSubmit, onCancel, loading }: Props) {
  const { data: creditCards = [] } = useCreditCards();
  const [executed, setExecuted] = useState(initial ? initial.amount != null : true);

  const { register, handleSubmit, formState: { errors } } = useForm<z.input<typeof schema>, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: initial?.description ?? '',
      executed,
      amount: initial?.amount ?? undefined,
      date: initial?.date ?? new Date().toISOString().slice(0, 10),
      plannedAmount: initial?.plannedAmount ?? undefined,
      type: initial?.type ?? ExpenseType.BASICO,
      creditCardId: initial?.creditCard?.id ?? '',
    },
  });

  const handleFormSubmit = async (values: FormValues) => {
    const dto: CreateExpenseDto = {
      description: values.description,
      type: values.type,
      amount: values.executed ? values.amount : undefined,
      date: values.executed ? values.date : undefined,
      plannedAmount: values.plannedAmount,
      creditCardId: values.creditCardId || null,
    };
    await onSubmit(dto);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div>
        <label className={labelCls}>Descripción *</label>
        <input {...register('description')} className={inputCls} placeholder="Ej: Mercado, Netflix..." />
        {errors.description && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.description.message}</p>}
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        <input
          type="checkbox"
          {...register('executed')}
          onChange={(e) => setExecuted(e.target.checked)}
          className="rounded border-gray-300 dark:border-gray-600 text-blue-700 focus:ring-blue-200 dark:focus:ring-blue-800"
        />
        Ya se pagó (gasto ejecutado)
      </label>

      {executed ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Monto (COP) *</label>
            <input type="number" step="0.01" min="0" {...register('amount')} className={inputCls} placeholder="0" />
            {errors.amount && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.amount.message}</p>}
          </div>
          <div>
            <label className={labelCls}>Fecha *</label>
            <input type="date" {...register('date')} className={inputCls} />
            {errors.date && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.date.message}</p>}
          </div>
        </div>
      ) : (
        <div>
          <label className={labelCls}>Monto planeado (COP) *</label>
          <input type="number" step="0.01" min="0" {...register('plannedAmount')} className={inputCls} placeholder="0" />
          {errors.plannedAmount && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.plannedAmount.message}</p>}
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Queda como planeado, sin ejecutar, hasta que registres el pago real.
          </p>
        </div>
      )}

      <div>
        <label className={labelCls}>Tipo *</label>
        <select {...register('type')} className={inputCls}>
          {Object.values(ExpenseType).map((t) => (
            <option key={t} value={t}>{TYPE_LABELS[t]}</option>
          ))}
        </select>
        {errors.type && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.type.message}</p>}
      </div>

      <div>
        <label className={labelCls}>Tarjeta (opcional)</label>
        <select {...register('creditCardId')} className={inputCls}>
          <option value="">Sin tarjeta</option>
          {creditCards.map((card) => (
            <option key={card.id} value={card.id}>{card.name} ({card.bank})</option>
          ))}
        </select>
        {errors.creditCardId && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.creditCardId.message}</p>}
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
