import { ProjectHorizon } from '../types';

const colorMap: Record<ProjectHorizon, string> = {
  now:     'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  next:    'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  later:   'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  someday: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

const labelMap: Record<ProjectHorizon, string> = {
  now:     'Ahora',
  next:    'Siguiente',
  later:   'Después',
  someday: 'Algún día',
};

interface Props {
  horizon: ProjectHorizon;
}

export default function HorizonBadge({ horizon }: Props) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorMap[horizon]}`}>
      {labelMap[horizon]}
    </span>
  );
}
