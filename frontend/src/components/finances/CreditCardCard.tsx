import type { CreditCard } from '../../types';

const COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

function fmtRate(rate: number) {
  return `${(rate * 100).toFixed(2)}%`;
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
  creditCard: CreditCard;
  onEdit: (creditCard: CreditCard) => void;
  onDelete: (creditCard: CreditCard) => void;
}

export default function CreditCardCard({ creditCard, onEdit, onDelete }: Props) {
  const usedLimit = creditCard.totalLimit - creditCard.availableLimit;
  const usedPercent = creditCard.totalLimit > 0
    ? Math.round((usedLimit / creditCard.totalLimit) * 100)
    : 0;

  const barColor = usedPercent >= 90
    ? 'bg-red-500 dark:bg-red-400'
    : usedPercent >= 70
      ? 'bg-yellow-500 dark:bg-yellow-400'
      : 'bg-green-500 dark:bg-green-400';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{creditCard.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{creditCard.bank}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onEdit(creditCard)} title="Editar"
            className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-blue-700 dark:hover:text-blue-400 px-1.5 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
            <EditIcon /><span>Editar</span>
          </button>
          <button onClick={() => onDelete(creditCard)} title="Eliminar"
            className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 px-1.5 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
            <TrashIcon /><span>Eliminar</span>
          </button>
        </div>
      </div>

      {/* Barra de uso de cupo */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">Cupo disponible</span>
          <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
            {COP.format(creditCard.availableLimit)} / {COP.format(creditCard.totalLimit)}
          </span>
        </div>
        <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${usedPercent}%` }} />
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{usedPercent}% utilizado</p>
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span>Tasa: <strong className="text-gray-700 dark:text-gray-200">{fmtRate(creditCard.interestRate)} M.V.</strong></span>
        <span>Cuota manejo: <strong className="text-gray-700 dark:text-gray-200">{COP.format(creditCard.monthlyFee)}</strong></span>
      </div>
    </div>
  );
}
