import { useTodayActivities } from '../hooks/useActivities';
import ActivityCard from '../components/ActivityCard';
import EmptyState from '../components/EmptyState';

export default function TodayView() {
  const { data, isLoading, isError } = useTodayActivities();
  const visible = (data ?? []).filter((a) => !a.parent && a.status !== 'completed');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Actividades de hoy</h1>

      {isLoading && <p className="text-sm text-gray-400">Cargando…</p>}
      {isError && <p className="text-sm text-red-500">Error al cargar actividades.</p>}
      {!isLoading && visible.length === 0 && <EmptyState message="No tienes actividades para hoy." />}

      <div className="grid gap-3 sm:grid-cols-1">
        {visible.map((activity) => (
          <ActivityCard key={activity.id} activity={activity} />
        ))}
      </div>
    </div>
  );
}
