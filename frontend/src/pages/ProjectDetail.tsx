import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProject } from '../hooks/useProjects';
import {
  useActivitiesByProject,
  useActivitiesSummary,
  useCreateActivity,
  useDeleteActivity,
  useSearchActivities,
} from '../hooks/useActivities';
import { useProjects } from '../hooks/useProjects';
import { useDebounce } from '../hooks/useDebounce';
import StatusBadge from '../components/StatusBadge';
import HorizonBadge from '../components/HorizonBadge';
import ActivityCard from '../components/ActivityCard';
import ActivityForm from '../components/ActivityForm';
import ActivityStatusFilter from '../components/ActivityStatusFilter';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import { SearchBar } from '../components/SearchBar';
import {
  DEFAULT_ACTIVITY_FILTER,
  activityFilterToParams,
  getActivityFilter,
  type ActivityFilterKey,
} from '../lib/activityFilters';
import type { CreateActivityDto } from '../types';

const LIMIT = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function isThisWeek(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return d >= monday && d <= sunday;
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

type StatVariant = 'blue' | 'green' | 'red';

const STAT_STYLES: Record<StatVariant, { card: string; value: string; label: string }> = {
  blue: {
    card: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    value: 'text-blue-700 dark:text-blue-300',
    label: 'text-blue-600 dark:text-blue-400',
  },
  green: {
    card: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    value: 'text-green-700 dark:text-green-300',
    label: 'text-green-600 dark:text-green-400',
  },
  red: {
    card: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    value: 'text-red-700 dark:text-red-300',
    label: 'text-red-600 dark:text-red-400',
  },
};

function StatCard({
  label,
  value,
  variant,
  isLoading,
}: {
  label: string;
  value: number;
  variant: StatVariant;
  isLoading?: boolean;
}) {
  const s = STAT_STYLES[variant];
  return (
    <div className={`rounded-lg border p-5 ${s.card}`}>
      {isLoading ? (
        <div className="h-8 w-12 rounded bg-current opacity-10 animate-pulse" />
      ) : (
        <p className={`text-3xl font-bold ${s.value}`}>{value}</p>
      )}
      <p className={`text-sm mt-1 font-medium ${s.label}`}>{label}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [createOpen, setCreateOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ActivityFilterKey>(DEFAULT_ACTIVITY_FILTER);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);

  const { data: project, isLoading: projectLoading } = useProject(id!);
  const { data: allProjects } = useProjects();
  const summaryQ = useActivitiesSummary({ projectId: id! });
  const listQ = useActivitiesByProject(id!, {
    page,
    limit: LIMIT,
    ...activityFilterToParams(activeFilter),
  });
  // spec-034: consulta aparte, sin paginar, solo para los conteos de "hoy" y
  // "esta semana" — el summary no los deriva (agrupa por status/overdue/
  // sin-fecha, no por rango de fecha) y por alcance del spec no se amplía
  // para cubrirlos. `overdueCount`, en cambio, sí sale del summary — es el
  // conteo real, no el de una página parcial.
  const statsQ = useActivitiesByProject(id!, { limit: 100 });
  const searchQ = useSearchActivities(debouncedSearch, { limit: 100, projectId: id });

  const createActivity = useCreateActivity();
  const deleteActivity = useDeleteActivity();

  const isSearching = debouncedSearch.trim().length >= 2;
  const sourceActivities = isSearching ? (searchQ.data ?? []) : (listQ.data ?? []);
  const rootActivities = sourceActivities.filter((a) => !a.parent);
  const statsActivities = (statsQ.data ?? []).filter((a) => !a.parent);
  // spec-034 (corrección post-revisión): derivado SIEMPRE de `listQ.data`
  // (nunca de `searchQ.data`) y filtrado explícitamente por
  // `status === 'completed'` — independiente de `activeFilter`/`isSearching`,
  // para que "Limpiar completadas" no pueda operar sobre resultados de
  // búsqueda ni sobre otro estado aunque ese estado de UI quede desalineado.
  const completedOnPage = (listQ.data ?? []).filter(
    (a) => !a.parent && a.status === 'completed',
  );

  // Loading inicial vs. refresco (datos previos visibles → transición suave).
  const isInitialLoading = isSearching ? searchQ.isLoading : listQ.isLoading;
  const isRefreshing = isSearching
    ? searchQ.isFetching && !searchQ.isLoading
    : listQ.isFetching && !listQ.isLoading;

  const todayCount = statsActivities.filter((a) => a.dueDate && isToday(a.dueDate)).length;
  const weekCount = statsActivities.filter((a) => a.dueDate && isThisWeek(a.dueDate)).length;
  const overdueCount = summaryQ.data?.overdue ?? 0;

  const completedCount = summaryQ.data?.byStatus.completed ?? 0;

  function handleFilterChange(key: ActivityFilterKey) {
    setActiveFilter(key);
    setPage(1);
  }

  async function handleCreate(dto: CreateActivityDto) {
    await createActivity.mutateAsync(dto);
    setCreateOpen(false);
  }

  async function handleClearCompleted() {
    setClearing(true);
    try {
      // spec-034: `completedOnPage` ya está filtrado por status === 'completed'
      // y nunca proviene de resultados de búsqueda — ver su definición.
      await Promise.all(completedOnPage.map((a) => deleteActivity.mutateAsync(a.id)));
    } finally {
      setClearing(false);
      setClearOpen(false);
    }
  }

  if (projectLoading) return <p className="text-sm text-gray-400 dark:text-gray-500">Cargando…</p>;
  if (!project) return <p className="text-sm text-red-500">Proyecto no encontrado.</p>;

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            to="/projects"
            className="text-sm text-gray-400 dark:text-gray-500 hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
          >
            ← Proyectos
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
            {project.name}
          </h1>
          <div className="mt-2 flex gap-3 items-center text-sm text-gray-500 dark:text-gray-400">
            <StatusBadge status={project.status} />
            <HorizonBadge horizon={project.horizon} />
            <span>Desde {new Date(project.startDate).toLocaleDateString('es-CO')}</span>
            {project.endDate && (
              <span>hasta {new Date(project.endDate).toLocaleDateString('es-CO')}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* spec-034: solo visible en el tab "Completadas" y fuera del modo
              búsqueda — `completedOnPage` ya es intrínsecamente seguro (ver su
              definición), pero también se oculta el botón mientras se busca
              para no confundir al usuario con un conteo que no coincide con
              lo que ve en pantalla. */}
          {activeFilter === 'completed' && !isSearching && completedOnPage.length > 0 && (
            <button
              onClick={() => setClearOpen(true)}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Limpiar completadas de esta página ({completedOnPage.length})
            </button>
          )}
          <button
            onClick={() => setCreateOpen(true)}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-700 dark:bg-blue-600 text-white hover:bg-blue-800 dark:hover:bg-blue-700 transition-colors"
          >
            + Actividad
          </button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Actividades hoy"
          value={todayCount}
          variant="blue"
          isLoading={statsQ.isLoading}
        />
        <StatCard
          label="Esta semana"
          value={weekCount}
          variant="green"
          isLoading={statsQ.isLoading}
        />
        <StatCard
          label="Vencidas"
          value={overdueCount}
          variant="red"
          isLoading={summaryQ.isLoading}
        />
      </div>

      {/* ── Activity list ── */}
      <div>
        <h2 className="text-base font-medium text-gray-800 dark:text-gray-200 mb-4">
          Actividades del proyecto
        </h2>

        {/* Search bar */}
        <div className="mb-4">
          <SearchBar
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Buscar en este proyecto..."
            onClear={() => setSearchInput('')}
          />
        </div>

        {/* Filter tabs — mismo criterio que Dashboard: se desactivan mientras
            se busca. */}
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
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
            ))}
          </div>
        )}

        {!isInitialLoading && rootActivities.length === 0 && (
          <EmptyState
            message={
              isSearching
                ? `No hay resultados para "${debouncedSearch}" en este proyecto.`
                : 'No hay actividades en esta categoría.'
            }
          />
        )}

        {!isInitialLoading && rootActivities.length > 0 && (
          <div
            className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 transition-opacity duration-200 ${
              isRefreshing ? 'opacity-50' : 'opacity-100'
            }`}
          >
            {rootActivities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        )}

        {!isSearching && !isInitialLoading && rootActivities.length > 0 && summaryQ.data && (
          <Pagination
            page={page}
            total={getActivityFilter(activeFilter).count(summaryQ.data)}
            limit={LIMIT}
            onPageChange={setPage}
          />
        )}
      </div>

      {/* ── Create activity modal ── */}
      {createOpen && (
        <Modal title="Nueva actividad" onClose={() => setCreateOpen(false)}>
          <ActivityForm
            projects={allProjects ?? []}
            defaultProjectId={project?.id}
            onSubmit={handleCreate}
            onCancel={() => setCreateOpen(false)}
            loading={createActivity.isPending}
          />
        </Modal>
      )}

      {/* ── Clear completed dialog ── */}
      <ConfirmDialog
        open={clearOpen}
        title="Limpiar actividades completadas"
        message={
          completedOnPage.length < completedCount
            ? `¿Eliminar las ${completedOnPage.length} actividades completadas de esta página? Esta acción no se puede deshacer. El proyecto tiene ${completedCount} completadas en total — repite en cada página del tab "Completadas" para eliminar el resto.`
            : `¿Eliminar las ${completedOnPage.length} actividades completadas de este proyecto? Esta acción no se puede deshacer.`
        }
        confirmLabel="Limpiar"
        onConfirm={handleClearCompleted}
        onCancel={() => setClearOpen(false)}
        loading={clearing}
      />
    </div>
  );
}
