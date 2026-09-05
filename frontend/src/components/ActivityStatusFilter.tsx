import {
  PRIMARY_FILTERS,
  MORE_FILTERS,
  type ActivityFilterKey,
} from '../lib/activityFilters';
import type { ActivitiesSummary } from '../types';

// spec-034: filtro de estado compartido por Dashboard y ProjectDetail — 5
// tabs primarios (`role="tablist"`) + un `<select>` "Más estados" para el
// resto. Ninguna de las dos páginas mantiene su propia lista de tabs; ambas
// consumen `lib/activityFilters.ts`.

const selectCls =
  'border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-colors';

const MORE_KEYS = new Set(MORE_FILTERS.map((f) => f.key));

interface Props {
  value: ActivityFilterKey;
  onChange: (value: ActivityFilterKey) => void;
  summary?: ActivitiesSummary;
}

export default function ActivityStatusFilter({ value, onChange, summary }: Props) {
  const selectValue = MORE_KEYS.has(value) ? value : '';

  return (
    <div className="flex flex-wrap items-center gap-2 mb-5 border-b border-gray-200 dark:border-gray-700 pb-0">
      <div
        role="tablist"
        aria-label="Filtrar actividades por estado"
        className="flex gap-0 overflow-x-auto scrollbar-none"
      >
        {PRIMARY_FILTERS.map((filter) => (
          <button
            key={filter.key}
            type="button"
            role="tab"
            aria-selected={value === filter.key}
            onClick={() => onChange(filter.key)}
            className={`px-4 py-2 text-sm transition-colors border-b-2 -mb-px whitespace-nowrap ${
              value === filter.key
                ? 'border-blue-700 dark:border-blue-400 text-blue-700 dark:text-blue-400 font-medium'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            {filter.label}
            {summary && (
              <span
                className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                  value === filter.key
                    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}
              >
                {filter.count(summary)}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-2 ml-auto">
        <label htmlFor="activity-more-filters" className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
          Más estados
        </label>
        <select
          id="activity-more-filters"
          value={selectValue}
          onChange={(e) => {
            const key = e.target.value as ActivityFilterKey;
            if (key) onChange(key);
          }}
          className={selectCls}
        >
          <option value="" disabled>
            Más estados…
          </option>
          {MORE_FILTERS.map((filter) => (
            <option key={filter.key} value={filter.key}>
              {filter.label}
              {summary ? ` (${filter.count(summary)})` : ''}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
