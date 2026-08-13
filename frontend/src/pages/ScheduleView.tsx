import { useState } from 'react';
import { useScheduleActivities } from '../hooks/useActivities';
import { groupActivitiesByDate } from '../lib/calendar';
import MonthNavigator from '../components/schedule/MonthNavigator';
import MonthCalendar from '../components/schedule/MonthCalendar';
import DayActivitiesModal from '../components/schedule/DayActivitiesModal';
import type { Activity } from '../types';

interface SelectedDay {
  date: Date;
  activities: Activity[];
}

export default function ScheduleView() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<SelectedDay | null>(null);

  const { data, isLoading, isError } = useScheduleActivities(year, month);
  const activitiesByDate = groupActivitiesByDate(data ?? []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Cronograma</h1>
        <MonthNavigator year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
      </div>

      {isLoading && !data && <p className="text-sm text-gray-400">Cargando…</p>}
      {isError && <p className="text-sm text-red-500">Error al cargar el cronograma.</p>}

      {!isError && (
        <MonthCalendar
          year={year}
          month={month}
          activitiesByDate={activitiesByDate}
          onSelectDay={(date, activities) => setSelectedDay({ date, activities })}
        />
      )}

      {selectedDay && (
        <DayActivitiesModal
          date={selectedDay.date}
          activities={selectedDay.activities}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  );
}
