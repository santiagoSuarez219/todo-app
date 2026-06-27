import { useTodayActivities } from '../hooks/useActivities';
import ActivityCard from '../components/ActivityCard';
import EmptyState from '../components/EmptyState';
import type { Activity } from '../types';

function isDateToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const today = new Date().toISOString().slice(0, 10);
  return dateStr.slice(0, 10) === today;
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
      {title}
    </h2>
  );
}

export default function TodayView() {
  const { data, isLoading, isError } = useTodayActivities();

  const visible = (data ?? []).filter((a) => !a.parent && a.status !== 'completed' && !a.isTemplate);

  const byDate: Activity[] = visible.filter(
    (a) => isDateToday(a.dueDate),
  );

  const bySchedule: Activity[] = visible.filter(
    (a) => a.scheduledForToday && !isDateToday(a.dueDate),
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Actividades de hoy</h1>

      {isLoading && <p className="text-sm text-gray-400">Cargando…</p>}
      {isError && <p className="text-sm text-red-500">Error al cargar actividades.</p>}

      {!isLoading && visible.length === 0 && (
        <EmptyState message="No tienes actividades para hoy." />
      )}

      {byDate.length > 0 && (
        <section>
          <SectionHeader title="Programadas por fecha" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {byDate.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        </section>
      )}

      {bySchedule.length > 0 && (
        <section>
          {byDate.length > 0 && (
            <hr className="border-gray-200 dark:border-gray-700 mb-6" />
          )}
          <SectionHeader title="Agregadas para hoy" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {bySchedule.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
