import type { Activity } from '../../types';
import ActivityChip from './ActivityChip';

const MAX_VISIBLE_CHIPS = 3;

interface Props {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  activities: Activity[];
  onSelectDay: (date: Date, activities: Activity[]) => void;
}

export default function CalendarDayCell({ date, isCurrentMonth, isToday, activities, onSelectDay }: Props) {
  const visible = activities.slice(0, MAX_VISIBLE_CHIPS);
  const extra = activities.length - visible.length;
  const openDay = () => onSelectDay(date, activities);

  return (
    <div
      className={`flex flex-col gap-1 min-h-[88px] sm:min-h-[104px] p-1.5 border-b border-r border-gray-100 dark:border-gray-700 ${isCurrentMonth ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900/40'
        }`}
    >
      <span
        className={`text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full shrink-0 ${isToday
          ? 'bg-blue-700 dark:bg-blue-600 text-white'
          : isCurrentMonth
            ? 'text-gray-700 dark:text-gray-300'
            : 'text-gray-300 dark:text-gray-600'
          }`}
      >
        {date.getDate()}
      </span>

      <div className="flex flex-col gap-0.5">
        {visible.map((activity) => (
          <ActivityChip key={activity.id} activity={activity} onClick={openDay} />
        ))}
        {extra > 0 && (
          <button
            onClick={openDay}
            className="text-[11px] font-medium text-blue-700 dark:text-blue-400 hover:underline text-left px-1.5"
          >
            +{extra} más
          </button>
        )}
      </div>
    </div>
  );
}
