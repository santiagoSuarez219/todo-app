import type { Income, IncomeType } from '../../types';

const TYPE_LABELS: Record<IncomeType, string> = {
  sueldo: 'Sueldo',
  freelance: 'Freelance',
  intereses: 'Intereses',
  dividendos: 'Dividendos',
  otro: 'Otro',
};

const TYPE_COLORS: Record<IncomeType, string> = {
  sueldo: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  freelance: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
  intereses: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  dividendos: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
  otro: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
};

const COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

function fmt(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function EditIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  );
}

interface Props {
  income: Income;
  onEdit: (income: Income) => void;
  onDelete: (income: Income) => void;
}

export default function IncomeCard({ income, onEdit, onDelete }: Props) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between gap-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 min-w-0">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{income.description}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{fmt(income.date)}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[income.type]}`}>
          {TYPE_LABELS[income.type]}
        </span>
        <span className="text-sm font-semibold text-green-600 dark:text-green-400 tabular-nums">
          {COP.format(income.amount)}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(income)}
            title="Editar"
            className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-blue-700 dark:hover:text-blue-400 px-1.5 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            <EditIcon />
            <span>Editar</span>
          </button>
          <button
            onClick={() => onDelete(income)}
            title="Eliminar"
            className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 px-1.5 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <TrashIcon />
            <span>Eliminar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
