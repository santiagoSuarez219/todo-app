import type { Activity } from '../types';

// spec-025 (ampliación): filtro de proyecto en el Cronograma. Es estado de
// presentación puro, sin contraparte en el backend/DTOs — por eso vive acá y
// no en `types/index.ts`. Separado de `components/schedule/ProjectFilter.tsx`
// (y no exportado desde ahí) porque un archivo de componente solo puede
// exportar el componente sin romper Fast Refresh (regla
// `react-refresh/only-export-components`).

/** Centinela para "Sin proyecto". No colisiona con un `project.id` real: los
 * ids son UUID v4 (alfabeto `[0-9a-f-]`), y este valor no lo es. */
export const NO_PROJECT = '__no_project__';

/** `null` = "Todos" (sin filtrar). */
export type ProjectFilterValue = string | typeof NO_PROJECT | null;

export function matchesProjectFilter(activity: Activity, filter: ProjectFilterValue): boolean {
  if (filter === null) return true;
  if (filter === NO_PROJECT) return activity.project === null;
  return activity.project?.id === filter;
}
