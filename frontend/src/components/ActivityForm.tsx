import { useEffect, useRef } from 'react';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ActivityStatus, ActivityType, Priority, Energy,
  RecurrenceFrequency,
  type CreateActivityDto, type Activity, type Project, type WeekDay,
} from '../types';

const WEEK_DAYS: { value: WeekDay; label: string }[] = [
  { value: 0, label: 'D' },
  { value: 1, label: 'L' },
  { value: 2, label: 'M' },
  { value: 3, label: 'X' },
  { value: 4, label: 'J' },
  { value: 5, label: 'V' },
  { value: 6, label: 'S' },
];

const schema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(255),
  description: z.string().max(5000).nullish(),
  projectId: z.string().uuid().nullish(),
  status: z.string().optional(),
  priority: z.string().optional(),
  energy: z.string().optional(),
  type: z.string().optional(),
  dueDate: z.string().nullish(),
  notionUrl: z.string().url({ message: 'Debe ser una URL válida' }).nullish(),
  // ── Recurrence ──
  isRecurring: z.boolean(),
  recurrenceFrequency: z.nativeEnum(RecurrenceFrequency).optional(),
  recurrenceDays: z.array(z.number().min(0).max(6)).optional(),
  recurrenceDayOfMonth: z.coerce.number().min(1).max(31).optional(),
  recurrenceEndDate: z.string().nullish(),
}).superRefine((data, ctx) => {
  if (!data.isRecurring) return;
  if (!data.recurrenceFrequency) {
    ctx.addIssue({ code: 'custom', path: ['recurrenceFrequency'], message: 'Selecciona una frecuencia' });
  }
  if (
    (data.recurrenceFrequency === RecurrenceFrequency.WEEKLY ||
      data.recurrenceFrequency === RecurrenceFrequency.BIWEEKLY) &&
    (!data.recurrenceDays || data.recurrenceDays.length === 0)
  ) {
    ctx.addIssue({ code: 'custom', path: ['recurrenceDays'], message: 'Selecciona al menos un día' });
  }
  if (
    data.recurrenceFrequency === RecurrenceFrequency.MONTHLY &&
    !data.recurrenceDayOfMonth
  ) {
    ctx.addIssue({ code: 'custom', path: ['recurrenceDayOfMonth'], message: 'Ingresa el día del mes' });
  }
});

type FormValues = z.infer<typeof schema>;

interface Props {
  initial?: Partial<Activity>;
  projects?: Project[];
  parentId?: string;
  hideProject?: boolean;
  onSubmit: (dto: CreateActivityDto) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

// ─── Labels ───────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  completed: 'Completada',
  cancelled: 'Cancelada',
  on_hold: 'En espera',
};

const PRIORITY_LABELS: Record<string, string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
};

const ENERGY_LABELS: Record<string, string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
};

const FREQUENCY_LABELS: Record<RecurrenceFrequency, string> = {
  daily: 'Diaria',
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
  yearly: 'Anual',
};

// ─── Shared field classes ─────────────────────────────────────────────────────

const inputCls =
  'w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-colors';

const labelCls = 'block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1';

// ─── Type selector pills ──────────────────────────────────────────────────────

const TYPE_OPTIONS = [
  { value: ActivityType.TASK,     label: 'Tarea',       icon: '✓' },
  { value: ActivityType.REMINDER, label: 'Recordatorio', icon: '🔔' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ActivityForm({
  initial,
  projects = [],
  parentId,
  hideProject = false,
  onSubmit,
  onCancel,
  loading,
}: Props) {
  const { register, handleSubmit, setValue, control, formState: { errors } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: {
        name: initial?.name ?? '',
        description: initial?.description ?? '',
        projectId: initial?.project?.id ?? null,
        status: initial?.status ?? ActivityStatus.PENDING,
        priority: initial?.priority ?? Priority.MEDIUM,
        energy: initial?.energy ?? Energy.MEDIUM,
        type: initial?.type ?? ActivityType.TASK,
        dueDate: initial?.dueDate ? initial.dueDate.slice(0, 16) : '',
        notionUrl: initial?.notionUrl ?? null,
        isRecurring: initial?.isRecurring ?? false,
        recurrenceFrequency: initial?.recurrenceFrequency ?? undefined,
        recurrenceDays: (initial?.recurrenceDays as WeekDay[] | null) ?? [],
        recurrenceDayOfMonth: initial?.recurrenceDayOfMonth ?? undefined,
        recurrenceEndDate: initial?.recurrenceEndDate ?? null,
      },
    });

  const watchedType = useWatch({ control, name: 'type' }) ?? ActivityType.TASK;
  const isReminder = watchedType === ActivityType.REMINDER;

  const isRecurring       = useWatch({ control, name: 'isRecurring' });
  const recurrenceFreq    = useWatch({ control, name: 'recurrenceFrequency' });
  const recurrenceDays    = useWatch({ control, name: 'recurrenceDays' }) ?? [];
  const showDayPicker     = recurrenceFreq === RecurrenceFrequency.WEEKLY || recurrenceFreq === RecurrenceFrequency.BIWEEKLY;
  const showDayOfMonth    = recurrenceFreq === RecurrenceFrequency.MONTHLY;

  // Clear dueDate when type changes to reminder (date-only → datetime-local)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setValue('dueDate', null, { shouldDirty: false });
  }, [watchedType]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleDay(day: WeekDay) {
    const current = recurrenceDays as WeekDay[];
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day];
    setValue('recurrenceDays', next, { shouldValidate: true });
  }

  function toDto(values: FormValues): CreateActivityDto {
    const dto: CreateActivityDto = {
      name: values.name,
      description: values.description || null,
      projectId: values.projectId || null,
      parentId: parentId ?? undefined,
      status: (values.status as CreateActivityDto['status']) || undefined,
      priority: (values.priority as CreateActivityDto['priority']) || undefined,
      energy: (values.energy as CreateActivityDto['energy']) || undefined,
      type: (values.type as CreateActivityDto['type']) || undefined,
      dueDate: values.dueDate || null,
      notionUrl: values.notionUrl || null,
    };

    if (values.isRecurring) {
      dto.isRecurring = true;
      dto.recurrenceFrequency = values.recurrenceFrequency;
      dto.recurrenceDays = values.recurrenceDays as WeekDay[];
      dto.recurrenceDayOfMonth = values.recurrenceDayOfMonth;
      dto.recurrenceEndDate = values.recurrenceEndDate || null;
    }

    return dto;
  }

  const hasInstances = initial?.isTemplate && initial?.id;

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(toDto(values)))} className="space-y-4">

      {/* ── Tipo (primero) ── */}
      <div>
        <label className={labelCls}>Tipo de actividad</label>
        <div className="flex gap-2">
          {TYPE_OPTIONS.map(({ value, label, icon }) => (
            <label
              key={value}
              className={`flex-1 flex items-center justify-center gap-1.5 cursor-pointer rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                watchedType === value
                  ? 'bg-blue-700 dark:bg-blue-600 text-white border-blue-700 dark:border-blue-600'
                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'
              }`}
            >
              <input
                type="radio"
                value={value}
                className="sr-only"
                {...register('type')}
              />
              <span>{icon}</span>
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* ── Nombre ── */}
      <div>
        <label className={labelCls}>Nombre *</label>
        <input {...register('name')} className={inputCls} placeholder="Nombre de la actividad" />
        {errors.name && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.name.message}</p>}
      </div>

      {/* ── Descripción ── */}
      <div>
        <label className={labelCls}>Descripción</label>
        <textarea
          {...register('description')}
          rows={3}
          placeholder="Detalle adicional..."
          className={`${inputCls} resize-none`}
        />
      </div>

      {/* ── Notion URL ── */}
      <div>
        <label className={labelCls}>Página de Notion</label>
        <input
          type="url"
          {...register('notionUrl')}
          placeholder="https://www.notion.so/..."
          className={inputCls}
        />
        {errors.notionUrl && (
          <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.notionUrl.message}</p>
        )}
      </div>

      {/* ── Proyecto — oculto en subtareas ── */}
      {!hideProject && projects.length > 0 && (
        <div>
          <label className={labelCls}>Proyecto</label>
          <select {...register('projectId')} className={inputCls}>
            <option value="">Sin proyecto</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* ── Estado / Prioridad / Energía ── */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Estado</label>
          <select {...register('status')} className={inputCls}>
            {Object.values(ActivityStatus).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Prioridad</label>
          <select {...register('priority')} className={inputCls}>
            {Object.values(Priority).map((s) => (
              <option key={s} value={s}>{PRIORITY_LABELS[s] ?? s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Energía</label>
          <select {...register('energy')} className={inputCls}>
            {Object.values(Energy).map((s) => (
              <option key={s} value={s}>{ENERGY_LABELS[s] ?? s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Fecha — semántica por tipo ── */}
      <div>
        <label className={labelCls}>
          {isReminder ? 'Fecha y hora del recordatorio' : 'Fecha límite'}
        </label>
        <input
          type={isReminder ? 'datetime-local' : 'date'}
          {...register('dueDate')}
          className={inputCls}
        />
      </div>

      {/* ── Repetición ── */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Repetición</span>
          <Controller
            control={control}
            name="isRecurring"
            render={({ field }) => (
              <button
                type="button"
                role="switch"
                aria-checked={field.value}
                onClick={() => field.onChange(!field.value)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-700 ${
                  field.value ? 'bg-blue-700 dark:bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
                    field.value ? 'translate-x-4' : 'translate-x-1'
                  }`}
                />
              </button>
            )}
          />
        </div>

        {isRecurring && (
          <div className="space-y-3">
            {hasInstances && (
              <p className="text-xs text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md px-3 py-2">
                Este template tiene instancias generadas. Los cambios afectarán las instancias futuras pendientes.
              </p>
            )}

            {/* Frecuencia */}
            <div>
              <label className={labelCls}>Frecuencia *</label>
              <select {...register('recurrenceFrequency')} className={inputCls}>
                <option value="">Selecciona una frecuencia</option>
                {Object.values(RecurrenceFrequency).map((f) => (
                  <option key={f} value={f}>{FREQUENCY_LABELS[f]}</option>
                ))}
              </select>
              {errors.recurrenceFrequency && (
                <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.recurrenceFrequency.message}</p>
              )}
            </div>

            {/* Días de la semana */}
            {showDayPicker && (
              <div>
                <label className={labelCls}>Días *</label>
                <div className="flex gap-1.5">
                  {WEEK_DAYS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleDay(value)}
                      className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                        (recurrenceDays as WeekDay[]).includes(value)
                          ? 'bg-blue-700 dark:bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {errors.recurrenceDays && (
                  <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.recurrenceDays.message}</p>
                )}
              </div>
            )}

            {/* Día del mes */}
            {showDayOfMonth && (
              <div>
                <label className={labelCls}>Día del mes *</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  {...register('recurrenceDayOfMonth')}
                  className={inputCls}
                  placeholder="1-31"
                />
                {errors.recurrenceDayOfMonth && (
                  <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.recurrenceDayOfMonth.message}</p>
                )}
              </div>
            )}

            {/* Fecha de fin */}
            <div>
              <label className={labelCls}>Fecha de fin (opcional)</label>
              <input
                type="date"
                {...register('recurrenceEndDate')}
                className={inputCls}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Actions ── */}
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
