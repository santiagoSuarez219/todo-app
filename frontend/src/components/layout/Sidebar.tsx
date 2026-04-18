import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Dashboard', icon: '▦' },
  { to: '/projects', label: 'Proyectos', icon: '◫' },
  { to: '/activities', label: 'Actividades', icon: '≡' },
  { to: '/activities/today', label: 'Hoy', icon: '◷' },
  { to: '/activities/this-week', label: 'Esta semana', icon: '▦' },
  { to: '/activities/overdue', label: 'Vencidas', icon: '⚠' },
];

export default function Sidebar() {
  return (
    <aside className="w-56 shrink-0 bg-gray-900 text-gray-100 min-h-screen flex flex-col">
      <div className="px-5 py-6 border-b border-gray-700">
        <span className="text-lg font-semibold tracking-tight">ToDo</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <span className="text-base leading-none">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
