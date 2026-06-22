import { NavLink } from 'react-router-dom';
import { useProjects } from '../../hooks/useProjects';
import { useDarkMode } from '../../hooks/useDarkMode';

interface Props {
  onCreateActivity: () => void;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function HomeIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function TodayIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" />
    </svg>
  );
}

function WeekIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  );
}

function OverdueIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    </svg>
  );
}

function BacklogIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 1 0 0 10A5 5 0 0 0 12 7z" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
    </svg>
  );
}

// ─── Link style ───────────────────────────────────────────────────────────────

const linkCls = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${isActive
    ? 'bg-blue-700 dark:bg-blue-600 text-white'
    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
  }`;

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export default function Sidebar({ onCreateActivity }: Props) {
  const { data: projects, isLoading } = useProjects();
  const { dark, toggleDark } = useDarkMode();

  return (
    <aside className="w-56 shrink-0 h-screen sticky top-0 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 hidden md:flex flex-col overflow-hidden">
      {/* Brand */}
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <span className="text-base font-semibold tracking-tight text-gray-900 dark:text-white">ToDo</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        <NavLink to="/" end className={linkCls}>
          <HomeIcon /> Tareas
        </NavLink>
        <NavLink to="/activities/today" className={linkCls}>
          <TodayIcon /> Hoy
        </NavLink>
        <NavLink to="/activities/this-week" className={linkCls}>
          <WeekIcon /> Esta semana
        </NavLink>
        <NavLink to="/activities/overdue" className={linkCls}>
          <OverdueIcon /> Vencidas
        </NavLink>
        <NavLink to="/activities/backlog" className={linkCls}>
          <BacklogIcon /> Backlog
        </NavLink>

        {/* Projects section */}
        <div className="pt-4">
          <div className="flex items-center justify-between px-3 mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Proyectos
            </span>
            <NavLink
              to="/projects"
              className={({ isActive }) =>
                `p-0.5 rounded transition-colors ${isActive
                  ? 'text-blue-700 dark:text-blue-400'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`
              }
              title="Ver todos los proyectos"
            >
              <GridIcon />
            </NavLink>
          </div>

          {isLoading && (
            <div className="space-y-1 px-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-7 rounded-md bg-gray-200 dark:bg-gray-700 animate-pulse" />
              ))}
            </div>
          )}

          {projects?.map((project) => (
            <NavLink
              key={project.id}
              to={`/projects/${project.id}`}
              className={linkCls}
            >
              <FolderIcon />
              <span className="truncate">{project.name}</span>
            </NavLink>
          ))}

          {!isLoading && projects?.length === 0 && (
            <p className="px-3 text-xs text-gray-400 dark:text-gray-500 italic">
              Sin proyectos
            </p>
          )}
        </div>
      </nav>

      {/* Add task button */}
      <div className="px-3 pt-4 pb-2 shrink-0">
        <button
          onClick={onCreateActivity}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg transition-colors"
        >
          <PlusIcon />
          Agregar tarea
        </button>
      </div>

      {/* Footer — dark mode toggle */}
      <div className="px-3 py-3 border-t border-gray-200 dark:border-gray-700 shrink-0">
        <button
          onClick={toggleDark}
          aria-label="Toggle dark mode"
          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          {dark ? <SunIcon /> : <MoonIcon />}
          {dark ? 'Modo claro' : 'Modo oscuro'}
        </button>
      </div>
    </aside>
  );
}
