import { ActivityMode } from '../types';
import { MODE_LABELS } from '../lib/activityModeFilters';

// spec-036 (D5): chip neutro con borde e ícono distinto por modo — sin tokens
// de color nuevos (la paleta de estados ya está ocupada). El ícono lleva el
// significado, no solo el color.

const ICON_PATH: Record<ActivityMode, string> = {
  // rayo — corre solo
  [ActivityMode.AUTONOMOUS]: 'M13 10V3L4 14h7v7l9-11h-7z',
  // reloj — colaboración diferida
  [ActivityMode.COWORK_ASYNC]: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  // personas — trabajo conjunto
  [ActivityMode.COWORK]:
    'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
};

interface Props {
  mode: ActivityMode | null;
}

export default function ModeBadge({ mode }: Props) {
  if (!mode) return null;
  return (
    <span
      title={`Modo con Claude: ${MODE_LABELS[mode]}`}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-gray-300 dark:border-gray-600 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
    >
      <svg
        className="w-3 h-3 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d={ICON_PATH[mode]} />
      </svg>
      {MODE_LABELS[mode]}
    </span>
  );
}
