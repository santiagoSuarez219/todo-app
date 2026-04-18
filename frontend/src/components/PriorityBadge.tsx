import { Priority } from '../types';

const colorMap: Record<Priority, string> = {
  [Priority.HIGH]: 'bg-red-100 text-red-700',
  [Priority.MEDIUM]: 'bg-yellow-100 text-yellow-700',
  [Priority.LOW]: 'bg-green-100 text-green-700',
};

const labelMap: Record<Priority, string> = {
  [Priority.HIGH]: 'Alta',
  [Priority.MEDIUM]: 'Media',
  [Priority.LOW]: 'Baja',
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
