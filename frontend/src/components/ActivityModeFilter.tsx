import { MODE_FILTER_OPTIONS, type ActivityModeFilterKey } from '../lib/activityModeFilters';

// spec-036: filtro de modo con Claude, compartido por Dashboard y
// ProjectDetail. Se compone con los tabs de estado y se aplica server-side a
// la lista y al summary (si no, badges y paginación mentirían — spec-034).

const selectCls =
  'border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-colors';

interface Props {
  value: ActivityModeFilterKey;
  onChange: (value: ActivityModeFilterKey) => void;
  id?: string;
}

export default function ActivityModeFilter({ value, onChange, id = 'activity-mode-filter' }: Props) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
        Modo con Claude
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as ActivityModeFilterKey)}
        className={selectCls}
      >
        {MODE_FILTER_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
