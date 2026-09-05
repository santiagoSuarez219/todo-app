import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useActivities,
  useActivitiesSummary,
  useTodayActivities,
  useOverdueActivities,
  useThisWeekActivities,
  useSearchActivities,
} from '../hooks/useActivities';
import { useDebounce } from '../hooks/useDebounce';
import ActivityCard from '../components/ActivityCard';
import ActivityStatusFilter from '../components/ActivityStatusFilter';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import { SearchBar } from '../components/SearchBar';
import {
  DEFAULT_ACTIVITY_FILTER,
  activityFilterToParams,
  getActivityFilter,
  type ActivityFilterKey,
} from '../lib/activityFilters';

const LIMIT = 20;

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
  const [activeFilter, setActiveFilter] = useState<ActivityFilterKey>(DEFAULT_ACTIVITY_FILTER);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);

  const todayQ = useTodayActivities({ limit: 100 });
  const overdueQ = useOverdueActivities({ limit: 100 });
  const weekQ = useThisWeekActivities({ limit: 100 });
  const summaryQ = useActivitiesSummary();
  const listQ = useActivities({ page, limit: LIMIT, ...activityFilterToParams(activeFilter) });
  const searchQ = useSearchActivities(debouncedSearch, { limit: 50 });

  const isSearching = debouncedSearch.trim().length >= 2;
  // spec-034: /activities ya excluye subtareas y plantillas server-side; el
  // buscador (fuera de alcance de este spec, sigue siendo client-side) no
  // aplica esa exclusión, así que se conserva el filtro acá para sus
  // resultados.
  const sourceList = isSearching ? (searchQ.data ?? []) : (listQ.data ?? []);
  const list = sourceList.filter((a) => !a.parent);

  // Loading inicial (sin datos que mostrar aún) vs. refresco (ya hay datos
  // previos visibles mientras llega el nuevo set → transición suave).
  const isInitialLoading = isSearching ? searchQ.isLoading : listQ.isLoading;
  const isRefreshing = isSearching
    ? searchQ.isFetching && !searchQ.isLoading
    : listQ.isFetching && !listQ.isLoading;
  const hasError = isSearching ? searchQ.isError : listQ.isError;

  function handleFilterChange(key: ActivityFilterKey) {
    setActiveFilter(key);
    setPage(1);
  }

  const now = new Date();
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
            onClear={() => setSearchInput('')}
          />
        </div>

        {/* Filter tabs — deshabilitados mientras se busca: la búsqueda es un
            scope propio (todo, sin importar estado), no compone con el
            filtro de estado. */}
        <div className={isSearching ? 'opacity-50 pointer-events-none' : undefined}>
          <ActivityStatusFilter
            value={activeFilter}
            onChange={handleFilterChange}
            summary={summaryQ.data}
          />
        </div>
        {isSearching && (
          <p className="text-xs text-gray-400 dark:text-gray-500 -mt-3 mb-4">
            Los filtros de estado se desactivan mientras buscas.
          </p>
        )}

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

        {!isInitialLoading && !hasError && list.length === 0 && (
          <EmptyState
            message={
              isSearching
                ? `No hay resultados para "${debouncedSearch}".`
                : 'No hay actividades en esta categoría.'
            }
          />
        )}

        {!isInitialLoading && list.length > 0 && (
          <div
            className={`grid gap-3 sm:grid-cols-1 transition-opacity duration-200 ${
              isRefreshing ? 'opacity-50' : 'opacity-100'
            }`}
          >
            {list.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        )}

        {!isSearching && !isInitialLoading && !hasError && list.length > 0 && summaryQ.data && (
          <Pagination
            page={page}
            total={getActivityFilter(activeFilter).count(summaryQ.data)}
            limit={LIMIT}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  );
}
