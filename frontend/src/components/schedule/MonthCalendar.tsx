import type { Activity } from '../../types';
import { buildMonthGrid, isSameLocalDay, toLocalDateKey } from '../../lib/calendar';
import CalendarDayCell from './CalendarDayCell';

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

interface Props {
  year: number;
  month: number;
  activitiesByDate: Map<string, Activity[]>;
  onSelectDay: (date: Date, activities: Activity[]) => void;
}

export default function MonthCalendar({ year, month, activitiesByDate, onSelectDay }: Props) {
  const weeks = buildMonthGrid(year, month);
  const today = new Date();

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="px-2 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 text-center"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {weeks.flat().map((date) => {
          const key = toLocalDateKey(date);
          return (
            <CalendarDayCell
              key={key}
              date={date}
              isCurrentMonth={date.getMonth() === month - 1}
              isToday={isSameLocalDay(date, today)}
              activities={activitiesByDate.get(key) ?? []}
              onSelectDay={onSelectDay}
            />
          );
        })}
      </div>
    </div>
  );
}
