import { useOverdueActivities } from '../hooks/useActivities';
import ActivityCard from '../components/ActivityCard';
import EmptyState from '../components/EmptyState';

export default function OverdueView() {
  const { data, isLoading, isError } = useOverdueActivities();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold text-gray-900">Actividades vencidas</h1>
        {data && data.length > 0 && (
          <span className="bg-red-100 text-red-700 text-sm font-semibold px-2.5 py-0.5 rounded-full">
            {data.length}
          </span>
        )}
      </div>

      {isLoading && <p className="text-sm text-gray-400">Cargando…</p>}
      {isError && <p className="text-sm text-red-500">Error al cargar actividades.</p>}
      {data && data.length === 0 && (
        <EmptyState message="¡Sin actividades vencidas! Todo al día." />
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((activity) => (
          <ActivityCard key={activity.id} activity={activity} />
        ))}
      </div>
    </div>
  );
}
