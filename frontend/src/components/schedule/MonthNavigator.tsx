interface Props {
  year: number;
  month: number; // 1–12
  onChange: (year: number, month: number) => void;
}

const MONTH_LABELS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export default function MonthNavigator({ year, month, onChange }: Props) {
  function go(delta: number) {
    let nextMonth = month + delta;
    let nextYear = year;
    if (nextMonth < 1) { nextMonth = 12; nextYear -= 1; }
    if (nextMonth > 12) { nextMonth = 1; nextYear += 1; }
    onChange(nextYear, nextMonth);
  }

  function goToday() {
    const now = new Date();
    onChange(now.getFullYear(), now.getMonth() + 1);
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => go(-1)}
        aria-label="Mes anterior"
        className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <h2 className="text-base font-semibold text-gray-900 dark:text-white min-w-[150px] text-center">
        {MONTH_LABELS[month - 1]} {year}
      </h2>
      <button
        onClick={() => go(1)}
        aria-label="Mes siguiente"
        className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
      <button
        onClick={goToday}
        className="ml-2 text-xs font-medium px-2.5 py-1.5 rounded-md text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
      >
        Hoy
      </button>
    </div>
  );
}
