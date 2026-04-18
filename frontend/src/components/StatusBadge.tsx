import { ActivityStatus, ProjectStatus } from '../types';

type Status = ActivityStatus | ProjectStatus;

const colorMap: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-600',
  on_hold: 'bg-orange-100 text-orange-800',
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-600',
  paused: 'bg-orange-100 text-orange-800',
};

const labelMap: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  completed: 'Completado',
  cancelled: 'Cancelado',
  on_hold: 'En espera',
  active: 'Activo',
  inactive: 'Inactivo',
  paused: 'Pausado',
};

interface Props {
  status: Status;
}

export default function StatusBadge({ status }: Props) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorMap[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {labelMap[status] ?? status}
    </span>
  );
}
