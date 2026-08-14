import type { Activity } from '../types';

// spec-025: helpers puros para la grilla mensual del Cronograma. Todo el
// cálculo se hace en términos de fecha calendario **local** (getFullYear/
// getMonth/getDate), nunca de instante UTC — un dueDate truncado a
// medianoche no debe "saltar" de día por el offset del navegador.

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Clave `YYYY-MM-DD` en hora local, usada para agrupar por día. */
export function toLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Fecha de ubicación de una actividad en el calendario: `dueDate` si existe,
 * o `instanceDate` en su defecto (instancias de tareas recurrentes solo
 * traen `instanceDate` — ver spec-025, "Hallazgo de datos").
 */
export function activityLocationDate(activity: Activity): Date | null {
  const raw = activity.dueDate ?? activity.instanceDate;
  if (!raw) return null;
  return new Date(raw);
}

/**
 * Matriz de semanas (Lunes–Domingo) que cubre el mes visible: el mes
 * objetivo más los días de relleno del mes anterior/siguiente hasta
 * completar semanas — el mismo rango que devuelve el endpoint
 * `GET /activities/schedule`.
 */
export function buildMonthGrid(year: number, month: number): Date[][] {
  const firstDay = new Date(year, month - 1, 1);
  const firstDayOfWeek = firstDay.getDay();
  const diffToMonday = firstDayOfWeek === 0 ? -6 : 1 - firstDayOfWeek;
  const start = new Date(year, month - 1, 1 + diffToMonday);

  const lastDay = new Date(year, month, 0);
  const lastDayOfWeek = lastDay.getDay();
  const diffToSunday = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek;
  // Igual que getVisibleGridRange() en el backend: el offset se aplica sobre
  // "día 0 del mes siguiente" (= último día del mes objetivo), no sobre
  // lastDay.getDate() — sumarle el número de día (ej. 31) volvía a desplazar
  // el mes completo, generando casi el doble de semanas de las debidas.
  const end = new Date(year, month, 0 + diffToSunday);

  const days: Date[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

/** Agrupa actividades por su fecha de ubicación local, para pintar la grilla. */
export function groupActivitiesByDate(activities: Activity[]): Map<string, Activity[]> {
  const map = new Map<string, Activity[]>();
  for (const activity of activities) {
    const date = activityLocationDate(activity);
    if (!date) continue;
    const key = toLocalDateKey(date);
    const list = map.get(key);
    if (list) {
      list.push(activity);
    } else {
      map.set(key, [activity]);
    }
  }
  return map;
}
