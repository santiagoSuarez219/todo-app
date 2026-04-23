import { Priority } from '../types';

const colorMap: Record<Priority, string> = {
  [Priority.HIGH]:   'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  [Priority.MEDIUM]: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  [Priority.LOW]:    'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
};

const labelMap: Record<Priority, string> = {
  [Priority.HIGH]:   '↑ Alta',
  [Priority.MEDIUM]: '→ Media',
  [Priority.LOW]:    '↓ Baja',
};

interface Props {
  priority: Priority;
}

export default function PriorityBadge({ priority }: Props) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorMap[priority]}`}>
      {labelMap[priority]}
    </span>
  );
}
