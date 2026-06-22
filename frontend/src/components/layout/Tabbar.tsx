import { NavLink } from 'react-router-dom';
import { useDarkMode } from '../../hooks/useDarkMode';

interface Props {
  onCreateActivity: () => void;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function HomeIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function TodayIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function WeekIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 14h.01M12 14h.01M15 14h.01" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
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

// ─── Tab link style ───────────────────────────────────────────────────────────

const tabCls = ({ isActive }: { isActive: boolean }) =>
  `flex-1 flex flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors ${
    isActive
      ? 'text-blue-700 dark:text-blue-400'
      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
  }`;

// ─── Tabbar ───────────────────────────────────────────────────────────────────

export default function Tabbar({ onCreateActivity }: Props) {
  const { dark, toggleDark } = useDarkMode();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex md:hidden bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      {/* Dark mode toggle — floats above the tab bar */}
      <button
        onClick={toggleDark}
        aria-label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        className="absolute -top-8 right-3 flex items-center justify-center w-7 h-7 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 shadow-sm transition-colors"
      >
        {dark ? <SunIcon /> : <MoonIcon />}
      </button>

      <NavLink to="/" end className={tabCls}>
        <HomeIcon />
        <span>Inicio</span>
      </NavLink>

      <NavLink to="/activities/today" className={tabCls}>
        <TodayIcon />
        <span>Hoy</span>
      </NavLink>

      {/* Botón central de acción */}
      <div className="flex-1 flex items-center justify-center py-2">
        <button
          onClick={onCreateActivity}
          aria-label="Agregar tarea"
          className="w-12 h-12 flex items-center justify-center bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-full shadow-lg transition-colors"
        >
          <PlusIcon />
        </button>
      </div>

      <NavLink to="/activities/this-week" className={tabCls}>
        <WeekIcon />
        <span>Semana</span>
      </NavLink>

      <NavLink
        to="/projects"
        className={({ isActive }) =>
          tabCls({ isActive: isActive })
        }
      >
        <FolderIcon />
        <span>Proyectos</span>
      </NavLink>
    </nav>
  );
}
