import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useActivities,
  useTodayActivities,
  useOverdueActivities,
  useThisWeekActivities,
  useSearchActivities,
} from '../hooks/useActivities';
import { useDebounce } from '../hooks/useDebounce';
import ActivityCard from '../components/ActivityCard';
import EmptyState from '../components/EmptyState';
import { SearchBar } from '../components/SearchBar';

// ─── Types ───────────────────────────────────────────────────────────────────

type FilterTab = 'all' | 'pending' | 'in_progress' | 'completed' | 'overdue' | 'no_date';

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all',         label: 'Todas' },
  { key: 'pending',     label: 'Pendientes' },
  { key: 'in_progress', label: 'En progreso' },
  { key: 'completed',   label: 'Completadas' },
  { key: 'overdue',     label: 'Atrasadas' },
  { key: 'no_date',     label: 'Sin fecha' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

type StatVariant = 'blue' | 'green' | 'red';

const STAT_STYLES: Record<StatVariant, { card: string; value: string; label: string }> = {
  blue: {
    card: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700',
    value: 'text-blue-700 dark:text-blue-300',
    label: 'text-blue-600 dark:text-blue-400',
  },
  green: {
    card: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:border-green-300 dark:hover:border-green-700',
    value: 'text-green-700 dark:text-green-300',
    label: 'text-green-600 dark:text-green-400',
  },
  red: {
    card: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700',
    value: 'text-red-700 dark:text-red-300',
    label: 'text-red-600 dark:text-red-400',
  },
};

function StatCard({
  label,
  value,
  to,
  variant,
  isLoading,
}: {
  label: string;
  value: number;
  to: string;
  variant: StatVariant;
  isLoading?: boolean;
}) {
  const s = STAT_STYLES[variant];
  return (
    <Link
      to={to}
      className={`block rounded-lg border p-5 transition-all hover:shadow-md ${s.card}`}
    >
      {isLoading ? (
        <div className="h-8 w-12 rounded bg-current opacity-10 animate-pulse" />
      ) : (
        <p className={`text-3xl font-bold ${s.value}`}>{value}</p>
      )}
      <p className={`text-sm mt-1 font-medium ${s.label}`}>{label}</p>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);

  const todayQ = useTodayActivities({ limit: 100 });
  const overdueQ = useOverdueActivities({ limit: 100 });
  const weekQ = useThisWeekActivities({ limit: 100 });
  const allQ = useActivities({ limit: 50 });
  const searchQ = useSearchActivities(debouncedSearch, { limit: 50 });

  const now = new Date();
  const isSearching = debouncedSearch.trim().length >= 2;
  const sourceList = isSearching ? (searchQ.data ?? []) : (allQ.data ?? []);
  const list = sourceList.filter((a) => !a.parent);

  // Loading inicial (sin datos que mostrar aún) vs. refresco (ya hay datos
  // previos visibles mientras llega el nuevo set → transición suave).
  const isInitialLoading = isSearching ? searchQ.isLoading : allQ.isLoading;
  const isRefreshing = isSearching && searchQ.isFetching && !searchQ.isLoading;
  const hasError = isSearching ? searchQ.isError : allQ.isError;

  const filteredActivities = (() => {
    switch (activeTab) {
      case 'pending':   return list.filter((a) => a.status === 'pending');
      case 'in_progress': return list.filter((a) => a.status === 'in_progress');
      case 'completed': return list.filter((a) => a.status === 'completed');
      case 'overdue':   return list.filter((a) => {
        if (a.status === 'completed') return false;
        return !!a.dueDate && new Date(a.dueDate) < now;
      });
      case 'no_date':   return list.filter((a) => !a.dueDate);
      default:          return list.filter((a) => a.status !== 'completed');
    }
  })();

  const dateLabel = now.toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 capitalize">{dateLabel}</p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Actividades hoy"
          value={todayQ.data?.length ?? 0}
          to="/activities/today"
          variant="blue"
          isLoading={todayQ.isLoading}
        />
        <StatCard
          label="Esta semana"
          value={weekQ.data?.length ?? 0}
          to="/activities/this-week"
          variant="green"
          isLoading={weekQ.isLoading}
        />
        <StatCard
          label="Vencidas"
          value={overdueQ.data?.length ?? 0}
          to="/activities/overdue"
          variant="red"
          isLoading={overdueQ.isLoading}
        />
      </div>

      {/* ── All activities ── */}
      <div>
        <div className="mb-4">
          <h2 className="text-base font-medium text-gray-800 dark:text-gray-200">
            Todas las tareas
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Vista general de tus actividades
          </p>
        </div>

        {/* Search bar */}
        <div className="mb-4">
          <SearchBar
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Buscar tareas..."
            onClear={() => {
              setSearchInput('');
              setActiveTab('all');
            }}
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-0 mb-5 border-b border-gray-200 dark:border-gray-700 overflow-x-auto scrollbar-none">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm transition-colors border-b-2 -mb-px whitespace-nowrap ${activeTab === tab.key
                ? 'border-blue-700 dark:border-blue-400 text-blue-700 dark:text-blue-400 font-medium'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600'
                }`}
            >
              {tab.label}
              {tab.key !== 'all' && allQ.data && (
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.key
                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}>
                  {tab.key === 'overdue'
                    ? list.filter((a) => {
                        if (a.status === 'completed') return false;
                        return !!a.dueDate && new Date(a.dueDate) < now;
                      }).length
                    : tab.key === 'no_date'
                    ? list.filter((a) => !a.dueDate).length
                    : list.filter((a) => a.status === tab.key).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Activity list */}
        {isInitialLoading && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-28 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse"
              />
            ))}
          </div>
        )}

        {hasError && (
          <p className="text-sm text-red-600 dark:text-red-400">Error al cargar actividades.</p>
        )}

        {!isInitialLoading && !hasError && filteredActivities.length === 0 && (
          <EmptyState
            message={
              isSearching
                ? `No hay resultados para "${debouncedSearch}".`
                : 'No hay actividades en esta categoría.'
            }
          />
        )}

        {!isInitialLoading && filteredActivities.length > 0 && (
          <div
            className={`grid gap-3 sm:grid-cols-1 transition-opacity duration-200 ${
              isRefreshing ? 'opacity-50' : 'opacity-100'
            }`}
          >
            {filteredActivities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
