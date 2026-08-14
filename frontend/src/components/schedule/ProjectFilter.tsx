import { useProjects } from '../../hooks/useProjects';
import { NO_PROJECT, type ProjectFilterValue } from '../../lib/scheduleFilters';

const selectCls =
  'border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-colors';

interface Props {
  value: ProjectFilterValue;
  onChange: (value: ProjectFilterValue) => void;
}

export default function ProjectFilter({ value, onChange }: Props) {
  // Sin filtro de status: el Cronograma muestra actividades históricas, y
  // ocultar proyectos completados/inactivos dejaría esas actividades sin
  // poder filtrarse por proyecto.
  const { data: projects = [] } = useProjects();

  function handleChange(raw: string) {
    if (raw === '') { onChange(null); return; }
    if (raw === NO_PROJECT) { onChange(NO_PROJECT); return; }
    onChange(raw);
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="schedule-project-filter" className="text-sm text-gray-600 dark:text-gray-300">
        Proyecto:
      </label>
      <select
        id="schedule-project-filter"
        value={value ?? ''}
        onChange={(e) => handleChange(e.target.value)}
        className={selectCls}
      >
        <option value="">Todos</option>
        <option value={NO_PROJECT}>Sin proyecto</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>{project.name}</option>
        ))}
      </select>
    </div>
  );
}
