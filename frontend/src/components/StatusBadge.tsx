import { ActivityStatus, ProjectStatus } from '../types';

type Status = ActivityStatus | ProjectStatus;

const colorMap: Record<string, string> = {
  pending:     'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  completed:   'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  cancelled:   'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  on_hold:     'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  active:      'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  inactive:    'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  paused:      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
};

const labelMap: Record<string, string> = {
  pending:     'Pendiente',
  in_progress: 'En progreso',
  completed:   'Completado',
  cancelled:   'Cancelado',
  on_hold:     'En espera',
  active:      'Activo',
  inactive:    'Inactivo',
  paused:      'Pausado',
};

interface Props {
  status: Status;
}

export default function StatusBadge({ status }: Props) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorMap[status] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'}`}>
      {labelMap[status] ?? status}
    </span>
  );
}
