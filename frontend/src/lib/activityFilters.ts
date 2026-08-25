import { ActivityStatus, DueFilter } from '../types';
import type { ActivityListParams, ActivitiesSummary } from '../types';

// spec-034: catálogo único de filtros de estado, consumido por Dashboard y
// ProjectDetail — ninguna de las dos páginas mantiene su propia lista de
// tabs. Es estado de presentación puro (qué params produce cada filtro y
// cómo se lee su conteo del summary), sin contraparte en el backend, por eso
// vive en `lib/` y no en `types/index.ts` — mismo criterio que
// `lib/scheduleFilters.ts`.

export type ActivityFilterKey =
  | 'active'
  | 'pending'
  | 'in_progress'
  | 'overdue'
  | 'completed'
  | 'testing'
  | 'waiting'
  | 'on_hold'
  | 'cancelled'
  | 'no_date'
  | 'all';

export const DEFAULT_ACTIVITY_FILTER: ActivityFilterKey = 'active';

/**
 * "Activas" es una lista EXPLÍCITA de estados, no "distinto de completed" —
 * para que la etiqueta diga la verdad. `cancelled` queda fuera a propósito:
 * una actividad cancelada no está activa.
 */
const ACTIVE_STATUSES: ActivityStatus[] = [
  ActivityStatus.PENDING,
  ActivityStatus.IN_PROGRESS,
  ActivityStatus.TESTING,
  ActivityStatus.WAITING,
  ActivityStatus.ON_HOLD,
];

export interface ActivityFilterDef {
  key: ActivityFilterKey;
  label: string;
  /** Params que este filtro traduce hacia `ActivityListParams`. */
  toParams(): Pick<ActivityListParams, 'status' | 'dueFilter'>;
  /** Lee el conteo de este filtro desde el summary — nunca de una página cargada. */
  count(summary: ActivitiesSummary): number;
}

function statusFilter(
  key: ActivityFilterKey,
  label: string,
  status: ActivityStatus,
): ActivityFilterDef {
  return {
    key,
    label,
    toParams: () => ({ status: [status] }),
    count: (summary) => summary.byStatus[status],
  };
}

export const PRIMARY_FILTERS: ActivityFilterDef[] = [
  {
    key: 'active',
    label: 'Activas',
    toParams: () => ({ status: ACTIVE_STATUSES }),
    count: (summary) =>
      ACTIVE_STATUSES.reduce((sum, status) => sum + summary.byStatus[status], 0),
  },
  statusFilter('pending', 'Pendientes', ActivityStatus.PENDING),
  statusFilter('in_progress', 'En progreso', ActivityStatus.IN_PROGRESS),
  {
    key: 'overdue',
    label: 'Atrasadas',
    toParams: () => ({ dueFilter: DueFilter.OVERDUE }),
    count: (summary) => summary.overdue,
  },
  statusFilter('completed', 'Completadas', ActivityStatus.COMPLETED),
];

export const MORE_FILTERS: ActivityFilterDef[] = [
  statusFilter('testing', 'En pruebas', ActivityStatus.TESTING),
  statusFilter('waiting', 'Esperando', ActivityStatus.WAITING),
  statusFilter('on_hold', 'En pausa', ActivityStatus.ON_HOLD),
  statusFilter('cancelled', 'Canceladas', ActivityStatus.CANCELLED),
  {
    key: 'no_date',
    label: 'Sin fecha',
    toParams: () => ({ dueFilter: DueFilter.NO_DATE }),
    count: (summary) => summary.noDate,
  },
  {
    key: 'all',
    label: 'Todas',
    toParams: () => ({}),
    count: (summary) => summary.total,
  },
];

export const ALL_ACTIVITY_FILTERS: ActivityFilterDef[] = [
  ...PRIMARY_FILTERS,
  ...MORE_FILTERS,
];

export function getActivityFilter(key: ActivityFilterKey): ActivityFilterDef {
  const found = ALL_ACTIVITY_FILTERS.find((f) => f.key === key);
  if (!found) {
    throw new Error(`Unknown activity filter key: ${key}`);
  }
  return found;
}

export function activityFilterToParams(
  key: ActivityFilterKey,
): Pick<ActivityListParams, 'status' | 'dueFilter'> {
  return getActivityFilter(key).toParams();
}
