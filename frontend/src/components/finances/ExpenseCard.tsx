import type { CreditCard, Expense, ExpenseType } from '../../types';
import { ExpenseType as ExpenseTypeEnum } from '../../types';

const TYPE_LABELS: Record<ExpenseType, string> = {
  basico: 'Básico',
  lujo: 'Lujo',
  ahorro: 'Ahorro',
  pago_deuda: 'Pago de deuda',
};

const TYPE_COLORS: Record<ExpenseType, string> = {
  basico: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  lujo: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  ahorro: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  pago_deuda: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
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

interface EditState {
  description: string;
  amount: string;
  date: string;
  type: ExpenseType;
  creditCardId: string;
}

interface Props {
  expense: Expense;
  isEditing: boolean;
  editDisabled: boolean;
  creditCards: CreditCard[];
  editState: EditState;
  onEditStateChange: (patch: Partial<EditState>) => void;
  onStartEdit: (expense: Expense) => void;
  onSaveEdit: (expense: Expense) => void;
  onCancelEdit: () => void;
  onDelete: (expense: Expense) => void;
  isSaving: boolean;
}

const inputCls =
  'w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-colors';

export default function ExpenseCard({
  expense,
  isEditing,
  editDisabled,
  creditCards,
  editState,
  onEditStateChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  isSaving,
}: Props) {
  if (isEditing) {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
        <div>
          <input
            type="text"
            value={editState.description}
            onChange={(e) => onEditStateChange({ description: e.target.value })}
            className={inputCls}
            placeholder="Descripción"
            disabled={isSaving}
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div>
            <input
              type="number"
              step="0.01"
              min="0"
              value={editState.amount}
              onChange={(e) => onEditStateChange({ amount: e.target.value })}
              className={inputCls}
              placeholder="Monto"
              disabled={isSaving}
            />
          </div>
          <div>
            <input
              type="date"
              value={editState.date}
              onChange={(e) => onEditStateChange({ date: e.target.value })}
              className={inputCls}
              disabled={isSaving}
            />
          </div>
          <div>
            <select
              value={editState.type}
              onChange={(e) => onEditStateChange({ type: e.target.value as ExpenseType })}
              className={inputCls}
              disabled={isSaving}
            >
              {Object.values(ExpenseTypeEnum).map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={editState.creditCardId}
              onChange={(e) => onEditStateChange({ creditCardId: e.target.value })}
              className={inputCls}
              disabled={isSaving}
            >
              <option value="">Sin tarjeta</option>
              {creditCards.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={() => onSaveEdit(expense)}
            disabled={isSaving || !editState.description.trim() || Number(editState.amount) <= 0 || !editState.date}
            className="p-1.5 rounded text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-40 transition-colors"
            title="Guardar"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </button>
          <button
            onClick={onCancelEdit}
            disabled={isSaving}
            className="p-1.5 rounded text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
            title="Cancelar"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between gap-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 min-w-0">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{expense.description}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{fmt(expense.date)}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[expense.type]}`}>
          {TYPE_LABELS[expense.type]}
        </span>
        {expense.creditCard && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
            {expense.creditCard.name}
          </span>
        )}
        <span className="text-sm font-semibold text-red-600 dark:text-red-400 tabular-nums">
          {COP.format(expense.amount)}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onStartEdit(expense)}
            disabled={editDisabled}
            title="Editar"
            className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-blue-700 dark:hover:text-blue-400 px-1.5 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-30 transition-colors"
          >
            <EditIcon />
            <span>Editar</span>
          </button>
          <button
            onClick={() => onDelete(expense)}
            disabled={editDisabled}
            title="Eliminar"
            className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 px-1.5 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-30 transition-colors"
          >
            <TrashIcon />
            <span>Eliminar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
