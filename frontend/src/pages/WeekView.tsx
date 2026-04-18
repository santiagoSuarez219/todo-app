import { useState } from 'react';
import { useThisWeekActivities } from '../hooks/useActivities';
import ActivityCard from '../components/ActivityCard';
import Pagination from '../components/Pagination';
import EmptyState from '../components/EmptyState';

export default function WeekView() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useThisWeekActivities({ page, limit: 20 });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Esta semana</h1>

      {isLoading && <p className="text-sm text-gray-400">Cargando…</p>}
      {isError && <p className="text-sm text-red-500">Error al cargar actividades.</p>}
      {data && data.data.length === 0 && <EmptyState message="No tienes actividades esta semana." />}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data?.data.map((activity) => (
          <ActivityCard key={activity.id} activity={activity} />
        ))}
      </div>

      {data && <Pagination page={page} total={data.total} limit={data.limit} onPageChange={setPage} />}
    </div>
  );
}
