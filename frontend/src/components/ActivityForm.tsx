import type { ChangeEvent } from 'react';
import { useForm, useWatch, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ActivityStatus, Priority, Energy,
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
  dueDate: z.string().nullish(),
  deferUntil: z.string().nullish(),
  scheduledFor: z.string().nullish(),
  waitingFor: z.string().nullish(),
  waitingSince: z.string().nullish(),
  // ── Recurrence — `isRecurring` es estado local del formulario, no viaja al
  // DTO: al enviar, `true` se traduce en `recurrenceFrequency` y `false` en
  // `recurrenceFrequency: null` (spec-027) ──
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
  defaultProjectId?: string;
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
  on_hold: 'En pausa',
  waiting: 'Esperando',
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function ActivityForm({
  initial,
  projects = [],
  parentId,
  hideProject = false,
  defaultProjectId,
  onSubmit,
  onCancel,
  loading,
}: Props) {
  const { register, handleSubmit, setValue, control, formState: { errors } } =
    useForm<FormValues>({
      resolver: zodResolver(schema) as Resolver<FormValues>,
      defaultValues: {
        name: initial?.name ?? '',
        description: initial?.description ?? '',
        projectId: initial?.project?.id ?? defaultProjectId ?? null,
        status: initial?.status ?? ActivityStatus.PENDING,
        priority: initial?.priority ?? Priority.MEDIUM,
        energy: initial?.energy ?? Energy.MEDIUM,
        dueDate: initial?.dueDate ? initial.dueDate.slice(0, 10) : '',
        deferUntil: initial?.deferUntil ? initial.deferUntil.slice(0, 10) : '',
        scheduledFor: initial?.scheduledFor ? initial.scheduledFor.slice(0, 10) : '',
        waitingFor: initial?.waitingFor ?? '',
        waitingSince: initial?.waitingSince ? initial.waitingSince.slice(0, 10) : '',
        isRecurring: initial?.recurrenceFrequency != null,
        recurrenceFrequency: initial?.recurrenceFrequency ?? undefined,
        recurrenceDays: (initial?.recurrenceDays as WeekDay[] | null) ?? [],
        recurrenceDayOfMonth: initial?.recurrenceDayOfMonth ?? undefined,
        recurrenceEndDate: initial?.recurrenceEndDate ?? null,
      },
    });

  const isRecurring       = useWatch({ control, name: 'isRecurring' });
  const recurrenceFreq    = useWatch({ control, name: 'recurrenceFrequency' });
  const recurrenceDays    = useWatch({ control, name: 'recurrenceDays' }) ?? [];
  const showDayPicker     = recurrenceFreq === RecurrenceFrequency.WEEKLY || recurrenceFreq === RecurrenceFrequency.BIWEEKLY;
  const showDayOfMonth    = recurrenceFreq === RecurrenceFrequency.MONTHLY;

  const watchedStatus = useWatch({ control, name: 'status' });
  const isWaiting = watchedStatus === ActivityStatus.WAITING;

  function handleStatusChange(e: ChangeEvent<HTMLSelectElement>) {
    if (e.target.value === ActivityStatus.WAITING && !initial?.waitingSince) {
      const today = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      setValue('waitingSince', `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`);
    }
  }

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
      dueDate: values.dueDate || null,
      deferUntil: values.deferUntil || null,
      scheduledFor: values.scheduledFor || null,
      // El backend limpia estos dos campos si el status no es 'waiting'
      // (spec-032) — se envían igual, sin condicionarlos aquí, para no
      // duplicar esa regla en el cliente.
      waitingFor: values.waitingFor || null,
      waitingSince: values.waitingSince || null,
    };

    if (values.isRecurring) {
      dto.recurrenceFrequency = values.recurrenceFrequency;
      dto.recurrenceDays = values.recurrenceDays as WeekDay[];
      dto.recurrenceDayOfMonth = values.recurrenceDayOfMonth;
      dto.recurrenceEndDate = values.recurrenceEndDate || null;
    } else {
      // Desmarcar el switch envía recurrenceFrequency: null — el backend
      // deriva isTemplate: false a partir de esto (spec-027).
      dto.recurrenceFrequency = null;
    }

    return dto;
  }

  const hasInstances = initial?.isTemplate && initial?.id;

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(toDto(values)))} className="space-y-4">

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
          <select
            {...register('status')}
            onChange={(e) => {
              register('status').onChange(e);
              handleStatusChange(e);
            }}
            className={inputCls}
          >
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

      {/* ── Esperando a / Esperando desde — solo con status: waiting ── */}
      {isWaiting && (
        <div className="grid grid-cols-2 gap-3 border border-pink-200 dark:border-pink-800 bg-pink-50 dark:bg-pink-900/10 rounded-lg p-3">
          <div>
            <label className={labelCls}>Esperando a</label>
            <input
              {...register('waitingFor')}
              className={inputCls}
              placeholder="¿Quién o qué? (opcional)"
            />
          </div>
          <div>
            <label className={labelCls}>Esperando desde</label>
            <input
              type="date"
              {...register('waitingSince')}
              className={inputCls}
            />
          </div>
        </div>
      )}

      {/* ── Fecha límite / Programar para / Diferir hasta ── */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Fecha límite</label>
          <input
            type="date"
            {...register('dueDate')}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Programar para</label>
          <input
            type="date"
            {...register('scheduledFor')}
            className={inputCls}
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Aparece en Hoy ese día, venza o no.
          </p>
        </div>
        <div>
          <label className={labelCls}>Diferir hasta</label>
          <input
            type="date"
            {...register('deferUntil')}
            className={inputCls}
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            No aparecerá en Hoy, Semana, Vencidas ni Backlog hasta esta fecha.
          </p>
        </div>
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
