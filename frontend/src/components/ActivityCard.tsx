import type { Activity } from '../types';
import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';
import EnergyIndicator from './EnergyIndicator';

interface Props {
  activity: Activity;
  onEdit?: (activity: Activity) => void;
  onDelete?: (activity: Activity) => void;
}

export default function ActivityCard({ activity, onEdit, onDelete }: Props) {
  const isOverdue =
    activity.dueDate &&
    new Date(activity.dueDate) < new Date() &&
    activity.status !== 'completed';

  return (
    <div className={`bg-white rounded-lg border p-4 shadow-sm ${isOverdue ? 'border-red-300' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-gray-900 leading-snug">{activity.name}</p>
        <div className="flex gap-1 shrink-0">
          {onEdit && (
            <button
              onClick={() => onEdit(activity)}
              className="text-xs text-gray-400 hover:text-indigo-600 px-1"
            >
              Editar
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(activity)}
              className="text-xs text-gray-400 hover:text-red-600 px-1"
            >
              Eliminar
            </button>
          )}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5 items-center">
        <StatusBadge status={activity.status} />
        <PriorityBadge priority={activity.priority} />
        <EnergyIndicator energy={activity.energy} />
        {activity.project && (
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
            {activity.project.name}
          </span>
        )}
      </div>
      {activity.dueDate && (
        <p className={`mt-2 text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
          Vence: {new Date(activity.dueDate).toLocaleDateString('es-CO')}
        </p>
      )}
    </div>
  );
}
