import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  PurchasePriority,
  PurchaseStore,
  PurchaseStatus,
  type CreatePurchaseDto,
  type Purchase,
} from '../../types';

const schema = z.object({
  description: z.string().min(1, 'La descripción es requerida').max(255),
  estimatedPrice: z.coerce.number().positive('El precio debe ser mayor a 0').nullish(),
  priority: z.nativeEnum(PurchasePriority),
  store: z.nativeEnum(PurchaseStore),
  status: z.nativeEnum(PurchaseStatus),
  url: z.string().url({ message: 'Debe ser una URL válida' }).nullish().or(z.literal('')),
  notes: z.string().max(5000).nullish(),
});

type FormValues = z.infer<typeof schema>;

const PRIORITY_LABELS: Record<PurchasePriority, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
};

const STORE_LABELS: Record<PurchaseStore, string> = {
  amazon: 'Amazon',
  temu: 'Temu',
  mercadolibre: 'MercadoLibre',
  otra: 'Otra',
};

const STATUS_LABELS: Record<PurchaseStatus, string> = {
  pendiente: 'Pendiente',
  comprado: 'Comprado',
  descartado: 'Descartado',
};

const inputCls =
  'w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-colors';

const labelCls = 'block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1';

interface Props {
  initial?: Purchase;
  onSubmit: (dto: CreatePurchaseDto) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function PurchaseForm({ initial, onSubmit, onCancel, loading }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: initial?.description ?? '',
      estimatedPrice: initial?.estimatedPrice ?? undefined,
      priority: initial?.priority ?? PurchasePriority.MEDIA,
      store: initial?.store ?? PurchaseStore.OTRA,
      status: initial?.status ?? PurchaseStatus.PENDIENTE,
      url: initial?.url ?? '',
      notes: initial?.notes ?? '',
    },
  });

  function toDto(values: FormValues): CreatePurchaseDto {
    return {
      description: values.description,
      estimatedPrice: values.estimatedPrice ?? null,
      priority: values.priority,
      store: values.store,
      status: values.status,
      url: values.url || null,
      notes: values.notes || null,
    };
  }

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(toDto(values)))} className="space-y-4">
      <div>
        <label className={labelCls}>Descripción *</label>
        <input {...register('description')} className={inputCls} placeholder="Ej: Auriculares Sony WH-1000XM5..." />
        {errors.description && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.description.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Precio estimado (COP)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            {...register('estimatedPrice')}
            className={inputCls}
            placeholder="Opcional"
          />
          {errors.estimatedPrice && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.estimatedPrice.message}</p>}
        </div>
        <div>
          <label className={labelCls}>Tienda</label>
          <select {...register('store')} className={inputCls}>
            {Object.values(PurchaseStore).map((s) => (
              <option key={s} value={s}>{STORE_LABELS[s]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Prioridad</label>
          <select {...register('priority')} className={inputCls}>
            {Object.values(PurchasePriority).map((p) => (
              <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Estado</label>
          <select {...register('status')} className={inputCls}>
            {Object.values(PurchaseStatus).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls}>URL del producto</label>
        <input
          type="url"
          {...register('url')}
          className={inputCls}
          placeholder="https://..."
        />
        {errors.url && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.url.message}</p>}
      </div>

      <div>
        <label className={labelCls}>Notas</label>
        <textarea
          {...register('notes')}
          rows={3}
          placeholder="Detalles adicionales..."
          className={`${inputCls} resize-none`}
        />
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
