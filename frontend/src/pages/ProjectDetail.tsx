import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProject } from '../hooks/useProjects';
import { useActivitiesByProject, useCreateActivity } from '../hooks/useActivities';
import { useProjects } from '../hooks/useProjects';
import StatusBadge from '../components/StatusBadge';
import ActivityCard from '../components/ActivityCard';
import ActivityForm from '../components/ActivityForm';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import type { Activity, CreateActivityDto } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterTab = 'all' | 'pending' | 'in_progress' | 'completed' | 'overdue' | 'no_date';

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all',         label: 'Todas' },
  { key: 'pending',     label: 'Pendientes' },
  { key: 'in_progress', label: 'En progreso' },
  { key: 'completed',   label: 'Completadas' },
  { key: 'overdue',     label: 'Atrasadas' },
  { key: 'no_date',     label: 'Sin fecha' },
];

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

function isOverdue(a: Activity, now: Date): boolean {
  if (a.status === 'completed') return false;
  return !!a.dueDate && new Date(a.dueDate) < now;
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
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const { data: project, isLoading: projectLoading } = useProject(id!);
  const { data: allProjects } = useProjects();
  const { data: activities = [], isLoading: activitiesLoading } = useActivitiesByProject(id!, { limit: 100 });

  const createActivity = useCreateActivity();

  const now = new Date();

  const rootActivities = activities.filter((a) => !a.parent);

  const todayCount  = rootActivities.filter((a) => a.dueDate && isToday(a.dueDate)).length;
  const weekCount   = rootActivities.filter((a) => a.dueDate && isThisWeek(a.dueDate)).length;
  const overdueCount = rootActivities.filter((a) => isOverdue(a, now)).length;

  const filteredActivities = (() => {
    switch (activeTab) {
      case 'pending':     return rootActivities.filter((a) => a.status === 'pending');
      case 'in_progress': return rootActivities.filter((a) => a.status === 'in_progress');
      case 'completed':   return rootActivities.filter((a) => a.status === 'completed');
      case 'overdue':     return rootActivities.filter((a) => isOverdue(a, now));
      case 'no_date':     return rootActivities.filter((a) => !a.dueDate);
      default:            return rootActivities.filter((a) => a.status !== 'completed');
    }
  })();

  function tabCount(key: FilterTab): number {
    switch (key) {
      case 'pending':     return rootActivities.filter((a) => a.status === 'pending').length;
      case 'in_progress': return rootActivities.filter((a) => a.status === 'in_progress').length;
      case 'completed':   return rootActivities.filter((a) => a.status === 'completed').length;
      case 'overdue':     return overdueCount;
      case 'no_date':     return rootActivities.filter((a) => !a.dueDate).length;
      default:            return 0;
    }
  }

  async function handleCreate(dto: CreateActivityDto) {
    await createActivity.mutateAsync({ ...dto, projectId: id });
    setCreateOpen(false);
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
            <span>Desde {new Date(project.startDate).toLocaleDateString('es-CO')}</span>
            {project.endDate && (
              <span>hasta {new Date(project.endDate).toLocaleDateString('es-CO')}</span>
            )}
          </div>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="shrink-0 px-4 py-2 text-sm font-medium rounded-lg bg-blue-700 dark:bg-blue-600 text-white hover:bg-blue-800 dark:hover:bg-blue-700 transition-colors"
        >
          + Actividad
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Actividades hoy"
          value={todayCount}
          variant="blue"
          isLoading={activitiesLoading}
        />
        <StatCard
          label="Esta semana"
          value={weekCount}
          variant="green"
          isLoading={activitiesLoading}
        />
        <StatCard
          label="Vencidas"
          value={overdueCount}
          variant="red"
          isLoading={activitiesLoading}
        />
      </div>

      {/* ── Activity list ── */}
      <div>
        <h2 className="text-base font-medium text-gray-800 dark:text-gray-200 mb-4">
          Actividades del proyecto
        </h2>

        {/* Filter tabs */}
        <div className="flex gap-0 mb-5 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm transition-colors border-b-2 -mb-px whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-blue-700 dark:border-blue-400 text-blue-700 dark:text-blue-400 font-medium'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {tab.label}
              {tab.key !== 'all' && !activitiesLoading && (
                <span
                  className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.key
                      ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {tabCount(tab.key)}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Activity list */}
        {activitiesLoading && (
          <div className="grid gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
            ))}
          </div>
        )}

        {!activitiesLoading && filteredActivities.length === 0 && (
          <EmptyState message="No hay actividades en esta categoría." />
        )}

        {!activitiesLoading && filteredActivities.length > 0 && (
          <div className="grid gap-3">
            {filteredActivities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        )}
      </div>

      {/* ── Create activity modal ── */}
      {createOpen && (
        <Modal title="Nueva actividad" onClose={() => setCreateOpen(false)}>
          <ActivityForm
            projects={allProjects ?? []}
            onSubmit={handleCreate}
            onCancel={() => setCreateOpen(false)}
            loading={createActivity.isPending}
          />
        </Modal>
      )}
    </div>
  );
}
