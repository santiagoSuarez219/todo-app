import { Link } from 'react-router-dom';
import { useTodayActivities, useOverdueActivities, useThisWeekActivities } from '../hooks/useActivities';
import ActivityCard from '../components/ActivityCard';
import EmptyState from '../components/EmptyState';

function StatCard({ label, value, to, color }: { label: string; value: number; to: string; color: string }) {
  return (
    <Link to={to} className={`block rounded-lg border p-5 shadow-sm hover:shadow-md transition-shadow ${color}`}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm mt-1 opacity-80">{label}</p>
    </Link>
  );
}

export default function Dashboard() {
  const today = useTodayActivities({ limit: 5 });
  const overdue = useOverdueActivities({ limit: 1 });
  const week = useThisWeekActivities({ limit: 1 });

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Actividades hoy"
          value={today.data?.total ?? 0}
          to="/activities/today"
          color="bg-indigo-50 border-indigo-200 text-indigo-900"
        />
        <StatCard
          label="Esta semana"
          value={week.data?.total ?? 0}
          to="/activities/this-week"
          color="bg-blue-50 border-blue-200 text-blue-900"
        />
        <StatCard
          label="Vencidas"
          value={overdue.data?.total ?? 0}
          to="/activities/overdue"
          color="bg-red-50 border-red-200 text-red-900"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-800">Actividades de hoy</h2>
          <Link to="/activities/today" className="text-sm text-indigo-600 hover:underline">Ver todas</Link>
        </div>

        {today.isLoading && <p className="text-sm text-gray-400">Cargando…</p>}
        {today.isError && <p className="text-sm text-red-500">Error al cargar actividades.</p>}
        {today.data && today.data.data.length === 0 && (
          <EmptyState message="No tienes actividades programadas para hoy." />
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {today.data?.data.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} />
          ))}
        </div>
      </div>
    </div>
  );
}
