import { useState } from 'react';
import { useScheduleActivities } from '../hooks/useActivities';
import { groupActivitiesByDate, toLocalDateKey } from '../lib/calendar';
import MonthNavigator from '../components/schedule/MonthNavigator';
import MonthCalendar from '../components/schedule/MonthCalendar';
import DayActivitiesModal from '../components/schedule/DayActivitiesModal';
import EmptyState from '../components/EmptyState';

export default function ScheduleView() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  // Solo la fecha seleccionada vive en estado — las actividades de ese día se
  // derivan en cada render desde `activitiesByDate` (bug fix: guardar el
  // array de actividades junto con la fecha lo dejaba congelado en el
  // momento del clic, así que una edición inline dentro del modal no se
  // reflejaba aunque el backend sí la persistiera).
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { data, isLoading, isError } = useScheduleActivities(year, month);
  const activitiesByDate = groupActivitiesByDate(data ?? []);
  const selectedDayActivities = selectedDate
    ? activitiesByDate.get(toLocalDateKey(selectedDate)) ?? []
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Cronograma</h1>
        <MonthNavigator year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
      </div>

      {isLoading && !data && <p className="text-sm text-gray-400">Cargando…</p>}
      {isError && <p className="text-sm text-red-500">Error al cargar el cronograma.</p>}

      {/* spec-025 (TC-025-007): mes sin actividades — EmptyState en vez de la
          grilla, mismo patrón que TodayView/WeekView/OverdueView. */}
      {!isLoading && !isError && (data?.length ?? 0) === 0 && (
        <EmptyState message="No tienes actividades este mes." />
      )}

      {!isError && (data?.length ?? 0) > 0 && (
        <MonthCalendar
          year={year}
          month={month}
          activitiesByDate={activitiesByDate}
          onSelectDay={setSelectedDate}
        />
      )}

      {selectedDate && (
        <DayActivitiesModal
          date={selectedDate}
          activities={selectedDayActivities}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  );
}
