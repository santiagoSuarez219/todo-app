import { ActivityMode, MODE_NONE } from '../types';
import type { ActivityModeFilterValue } from '../types';

// spec-036: catálogo del modo de colaboración con Claude — etiquetas para el
// chip, el formulario y el filtro. Estado de presentación puro (mismo criterio
// que `lib/activityFilters.ts`), por eso vive en `lib/`.

export const MODE_LABELS: Record<ActivityMode, string> = {
  [ActivityMode.AUTONOMOUS]: 'Autónomo',
  [ActivityMode.COWORK_ASYNC]: 'Cowork async',
  [ActivityMode.COWORK]: 'Cowork',
};

/** Etiqueta de "sin Claude" (`mode = null`), usada en formulario y filtro. */
export const NO_MODE_LABEL = 'Sin Claude';

/** '' = sin filtro de modo (Todos). */
export type ActivityModeFilterKey = ActivityModeFilterValue | '';

export const DEFAULT_MODE_FILTER: ActivityModeFilterKey = '';

export const MODE_FILTER_OPTIONS: { value: ActivityModeFilterKey; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: ActivityMode.AUTONOMOUS, label: MODE_LABELS[ActivityMode.AUTONOMOUS] },
  { value: ActivityMode.COWORK_ASYNC, label: MODE_LABELS[ActivityMode.COWORK_ASYNC] },
  { value: ActivityMode.COWORK, label: MODE_LABELS[ActivityMode.COWORK] },
  { value: MODE_NONE, label: NO_MODE_LABEL },
];

/** Params que produce el filtro (vacío si no hay filtro de modo). */
export function modeFilterToParams(key: ActivityModeFilterKey): { mode?: ActivityModeFilterValue } {
  return key ? { mode: key } : {};
}
