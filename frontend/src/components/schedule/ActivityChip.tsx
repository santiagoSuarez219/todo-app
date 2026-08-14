import { ActivityStatus, Priority, type Activity } from '../../types';

const priorityDot: Record<Priority, string> = {
  [Priority.HIGH]: 'bg-red-500',
  [Priority.MEDIUM]: 'bg-yellow-500',
  [Priority.LOW]: 'bg-green-500',
};

interface Props {
  activity: Activity;
  onClick: () => void;
}

export default function ActivityChip({ activity, onClick }: Props) {
  const completed = activity.status === ActivityStatus.COMPLETED;

  return (
    <button
      onClick={onClick}
      title={activity.name}
      className={`w-full flex items-center gap-1 text-left text-[11px] leading-tight px-1.5 py-0.5 rounded truncate transition-colors ${completed
        ? 'text-gray-400 dark:text-gray-500 line-through bg-gray-50 dark:bg-gray-700/40'
        : 'text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
        }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${completed ? 'bg-gray-300 dark:bg-gray-500' : priorityDot[activity.priority]
          }`}
      />
      <span className="truncate">{activity.name}</span>
    </button>
  );
}
