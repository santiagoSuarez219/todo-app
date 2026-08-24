import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBudget, useUpdateBudget, useMonthlyExpenseSummary, useDuplicateBudget } from '../../hooks/finances/useBudgets';
import { useCreateExpense, useUpdateExpense, useDeleteExpense } from '../../hooks/finances/useExpenses';
import BudgetForm from '../../components/finances/BudgetForm';
import PlannedExpenseForm from '../../components/finances/PlannedExpenseForm';
import DuplicateBudgetForm from '../../components/finances/DuplicateBudgetForm';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { ExpenseType } from '../../types';
import { translateBudgetError } from '../../lib/translateBudgetError';
import type { Expense, CreateExpenseDto, UpdateBudgetDto, UpdateExpenseDto, DuplicateBudgetResult } from '../../types';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

const TYPE_LABELS: Record<ExpenseType, string> = {
  basico: 'Básico',
  lujo: 'Lujo',
  ahorro: 'Ahorro',
  pago_deuda: 'Pago deuda',
};

const TYPE_COLORS: Record<ExpenseType, string> = {
  basico: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  lujo: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  ahorro: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  pago_deuda: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
};

function pct(value: number, totalIncome: number): string {
  return totalIncome > 0 ? `${(Math.round((value / totalIncome) * 10000) / 100).toFixed(1)}%` : '—';
}

interface EditState {
  description: string;
  plannedAmount: string;
  amount: string;
  date: string;
  type: ExpenseType;
}

const EMPTY_EDIT_STATE: EditState = { description: '', plannedAmount: '', amount: '', date: '', type: ExpenseType.BASICO };

export default function BudgetDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: budget, isLoading, isError } = useBudget(id!);
  const { mutateAsync: update, isPending: isUpdating } = useUpdateBudget();
  const { mutateAsync: createExpense, isPending: isAddingExpense } = useCreateExpense();
  const { mutateAsync: updateExpense, isPending: isUpdatingExpense } = useUpdateExpense();
  const { mutate: deleteExpense, isPending: isDeletingExpense } = useDeleteExpense();
  const { data: monthlySummary } = useMonthlyExpenseSummary(budget?.year ?? 0, budget?.month ?? 0);
  const { mutateAsync: duplicate, isPending: isDuplicating } = useDuplicateBudget();

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>(EMPTY_EDIT_STATE);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [duplicateSuccess, setDuplicateSuccess] = useState<DuplicateBudgetResult | null>(null);

  function startEditing(expense: Expense) {
    setEditingExpenseId(expense.id);
    setEditState({
      description: expense.description,
      plannedAmount: expense.plannedAmount != null ? String(expense.plannedAmount) : '',
      amount: expense.amount != null ? String(expense.amount) : '',
      date: expense.date ?? '',
      type: expense.type,
    });
  }

  // Prellenar amount/date con hoy — "Registrar ejecución" de un planeado,
  // sin abandonar la fila de edición.
  function startRegisteringExecution(expense: Expense) {
    setEditingExpenseId(expense.id);
    setEditState({
      description: expense.description,
      plannedAmount: expense.plannedAmount != null ? String(expense.plannedAmount) : '',
      amount: expense.plannedAmount != null ? String(expense.plannedAmount) : '',
      date: new Date().toISOString().slice(0, 10),
      type: expense.type,
    });
  }

  function cancelEditing() {
    setEditingExpenseId(null);
  }

  async function saveEditing(expense: Expense) {
    const dto: UpdateExpenseDto = {};
    if (editState.description !== expense.description) dto.description = editState.description;
    const newPlanned = editState.plannedAmount ? Number(editState.plannedAmount) : undefined;
    if (newPlanned !== (expense.plannedAmount ?? undefined)) dto.plannedAmount = newPlanned;
    const newAmount = editState.amount ? Number(editState.amount) : undefined;
    if (newAmount !== (expense.amount ?? undefined)) dto.amount = newAmount;
    const newDate = editState.date || undefined;
    if (newDate !== (expense.date ?? undefined)) dto.date = newDate;
    if (editState.type !== expense.type) dto.type = editState.type;

    if (Object.keys(dto).length > 0) {
      await updateExpense({ id: expense.id, dto });
    }
    setEditingExpenseId(null);
  }

  async function handleUpdateBudget(dto: UpdateBudgetDto) {
    await update({ id: id!, dto });
    setEditModalOpen(false);
  }

  async function handleAddPlannedExpense(dto: CreateExpenseDto) {
    await createExpense(dto);
  }

  async function handleDuplicate(dto: { month: number; year: number; name?: string }) {
    try {
      setDuplicateError(null);
      const result = await duplicate({ id: id!, dto });
      setDuplicateSuccess(result);
      setDuplicateModalOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      setDuplicateError(translateBudgetError(message));
    }
  }

  if (isLoading) {
    return <p className="text-sm text-gray-400 dark:text-gray-500">Cargando…</p>;
  }

  if (isError || !budget) {
    return <p className="text-sm text-red-500 dark:text-red-400">Error al cargar el presupuesto.</p>;
  }

  const expenses = budget.expenses ?? [];
  const totalIncome = budget.totalIncome ?? 0;
  const byType = budget.byType ?? [];
  const plannedTotal = budget.plannedTotal ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <button
            onClick={() => navigate('/finances/budgets')}
            className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-2 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Presupuestos
          </button>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{budget.name}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {MONTHS[budget.month - 1]} {budget.year}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setDuplicateModalOpen(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-.621-.504-1.125-1.125-1.125H9.375c-.621 0-1.125.504-1.125 1.125v5.375c0 .621.504 1.125 1.125 1.125Z" />
            </svg>
            Duplicar
          </button>
          <button
            onClick={() => setEditModalOpen(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487z" />
            </svg>
            Editar
          </button>
        </div>
      </div>

      {/* Resumen por tipo — planeado vs real, sin doble conteo (spec-034) */}
      {byType.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Resumen por tipo</h2>
            {totalIncome > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Ingresos del mes: <span className="font-medium text-gray-700 dark:text-gray-300">{COP.format(totalIncome)}</span>
              </p>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 dark:text-gray-400">
                  <th className="text-left px-4 py-2 font-medium">Tipo</th>
                  <th className="text-right px-4 py-2 font-medium">Planeado</th>
                  <th className="text-right px-4 py-2 font-medium">Real</th>
                  <th className="text-right px-4 py-2 font-medium">Varianza</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {byType.map((s) => (
                  <tr key={s.type}>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[s.type]}`}>
                        {TYPE_LABELS[s.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">{COP.format(s.planned)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">{COP.format(s.executed)}</td>
                    <td className={`px-4 py-3 text-right tabular-nums ${s.variance < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      {COP.format(s.variance)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 dark:bg-gray-700/50 font-semibold">
                  <td className="px-4 py-3 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Total</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-900 dark:text-white">{COP.format(plannedTotal)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-900 dark:text-white">{COP.format(budget.executedTotal ?? 0)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-900 dark:text-white">{COP.format(budget.variance ?? 0)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Gastos del mes — planeado / ejecutado / varianza, sin doble conteo */}
      {monthlySummary && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Gastos del mes</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Planeado vs. ejecutado — cada gasto cuenta una sola vez</p>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            <div className="px-4 py-3 flex items-center justify-between gap-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">Planeado</span>
              <div className="flex items-center gap-4 text-sm">
                <span className="tabular-nums text-gray-700 dark:text-gray-300">{COP.format(monthlySummary.plannedTotal)}</span>
                <span className="tabular-nums text-gray-400 dark:text-gray-500 w-14 text-right">{pct(monthlySummary.plannedTotal, totalIncome)}</span>
              </div>
            </div>
            <div className="px-4 py-3 flex items-center justify-between gap-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">Ejecutado</span>
              <div className="flex items-center gap-4 text-sm">
                <span className="tabular-nums text-gray-700 dark:text-gray-300">{COP.format(monthlySummary.executedTotal)}</span>
                <span className="tabular-nums text-gray-400 dark:text-gray-500 w-14 text-right">{pct(monthlySummary.executedTotal, totalIncome)}</span>
              </div>
            </div>
            <div className="px-4 py-3 flex items-center justify-between gap-3 bg-gray-50 dark:bg-gray-700/50">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Varianza (planeado − ejecutado)</span>
              <div className="flex items-center gap-4 text-sm font-semibold">
                <span className={`tabular-nums ${monthlySummary.variance < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                  {COP.format(monthlySummary.variance)}
                </span>
                <span className="tabular-nums text-gray-500 dark:text-gray-400 w-14 text-right">{pct(monthlySummary.variance, totalIncome)}</span>
              </div>
            </div>
            {monthlySummary.pendingPlannedTotal > 0 && (
              <div className="px-4 py-3 flex items-center justify-between gap-3">
                <span className="text-xs text-yellow-700 dark:text-yellow-400">Pendiente por ejecutar</span>
                <span className="tabular-nums text-xs text-yellow-700 dark:text-yellow-400">{COP.format(monthlySummary.pendingPlannedTotal)}</span>
              </div>
            )}
            {monthlySummary.unplannedTotal > 0 && (
              <div className="px-4 py-3 flex items-center justify-between gap-3">
                <span className="text-xs text-gray-500 dark:text-gray-400">No presupuestado</span>
                <span className="tabular-nums text-xs text-gray-500 dark:text-gray-400">{COP.format(monthlySummary.unplannedTotal)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Total por tarjeta */}
      {monthlySummary && monthlySummary.cardTotals.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Total por tarjeta</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Gastos con tarjeta — planeado y ejecutado</p>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {monthlySummary.cardTotals.map((card) => (
              <div key={card.creditCardId} className="px-4 py-3 flex items-center justify-between gap-3">
                <span className="text-sm text-gray-600 dark:text-gray-400">{card.name}</span>
                <div className="flex items-center gap-4 text-sm">
                  <span className="tabular-nums text-gray-400 dark:text-gray-500" title="Planeado">{COP.format(card.planned)}</span>
                  <span className="tabular-nums text-gray-700 dark:text-gray-300" title="Ejecutado">{COP.format(card.executed)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gastos del presupuesto */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Gastos del presupuesto</h2>
          <span className="text-xs text-gray-500 dark:text-gray-400">{expenses.length} gasto{expenses.length !== 1 ? 's' : ''}</span>
        </div>

        {expenses.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 px-4 py-6 text-center">
            No hay gastos. Agrega el primero abajo.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 dark:text-gray-400">
                  <th className="text-left px-4 py-2 font-medium">Descripción</th>
                  <th className="text-left px-4 py-2 font-medium">Tipo</th>
                  <th className="text-right px-4 py-2 font-medium">Planeado</th>
                  <th className="text-right px-4 py-2 font-medium">Real</th>
                  <th className="text-left px-4 py-2 font-medium">Fecha</th>
                  <th className="px-4 py-2 w-32" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {expenses.map((expense) => {
                  const isEditing = editingExpenseId === expense.id;
                  const isSaving = isUpdatingExpense && isEditing;

                  if (isEditing) {
                    return (
                      <tr key={expense.id} className="bg-blue-50 dark:bg-blue-900/10">
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={editState.description}
                            onChange={(e) => setEditState((s) => ({ ...s, description: e.target.value }))}
                            className="w-full text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            disabled={isSaving}
                            autoFocus
                          />
                        </td>
                        <td className="px-4 py-2">
                          <select
                            value={editState.type}
                            onChange={(e) => setEditState((s) => ({ ...s, type: e.target.value as ExpenseType }))}
                            className="text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            disabled={isSaving}
                          >
                            {Object.values(ExpenseType).map((t) => (
                              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            value={editState.plannedAmount}
                            onChange={(e) => setEditState((s) => ({ ...s, plannedAmount: e.target.value }))}
                            className="w-24 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-right text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            disabled={isSaving}
                            min={0}
                            placeholder="—"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            value={editState.amount}
                            onChange={(e) => setEditState((s) => ({ ...s, amount: e.target.value }))}
                            className="w-24 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-right text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            disabled={isSaving}
                            min={0}
                            placeholder="—"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="date"
                            value={editState.date}
                            onChange={(e) => setEditState((s) => ({ ...s, date: e.target.value }))}
                            className="text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            disabled={isSaving}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => saveEditing(expense)}
                              disabled={
                                isSaving ||
                                !editState.description.trim() ||
                                (!editState.plannedAmount && !(editState.amount && editState.date)) ||
                                (!!editState.amount !== !!editState.date)
                              }
                              className="p-1.5 rounded text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-40 transition-colors"
                              title="Guardar"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                              </svg>
                            </button>
                            <button
                              onClick={cancelEditing}
                              disabled={isSaving}
                              className="p-1.5 rounded text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
                              title="Cancelar"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  const isPlannedOnly = expense.executionStatus === 'planned';

                  return (
                    <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
                      <td className="px-4 py-3 text-gray-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <span>{expense.description}</span>
                          {expense.debt && (
                            <span
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                              title="Cuota generada automáticamente por una deuda — editable, pero se desincroniza del valor de la deuda hasta la próxima regeneración"
                            >
                              Deuda
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[expense.type]}`}>
                          {TYPE_LABELS[expense.type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">
                        {expense.plannedAmount != null ? COP.format(expense.plannedAmount) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">
                        {expense.amount != null ? COP.format(expense.amount) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                        {expense.date ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {isPlannedOnly && (
                            <button
                              onClick={() => startRegisteringExecution(expense)}
                              disabled={!!editingExpenseId}
                              className="text-gray-400 dark:text-gray-500 hover:text-green-600 dark:hover:text-green-400 p-1 rounded hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-30 transition-colors"
                              title="Registrar ejecución"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => startEditing(expense)}
                            disabled={!!editingExpenseId}
                            className="text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-30 transition-colors"
                            title="Editar gasto"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setExpenseToDelete(expense)}
                            disabled={!!editingExpenseId}
                            className="text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-30 transition-colors"
                            title="Eliminar gasto"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 dark:bg-gray-700/50 font-semibold">
                  <td className="px-4 py-3 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400" colSpan={2}>Total</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-900 dark:text-white">{COP.format(plannedTotal)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-900 dark:text-white">{COP.format(budget.executedTotal ?? 0)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">Agregar gasto planeado</p>
          <PlannedExpenseForm budgetId={id!} onSubmit={handleAddPlannedExpense} loading={isAddingExpense} />
        </div>
      </div>

      {editModalOpen && (
        <Modal title="Editar presupuesto" onClose={() => setEditModalOpen(false)}>
          <BudgetForm
            initial={budget}
            onSubmit={handleUpdateBudget}
            onCancel={() => setEditModalOpen(false)}
            loading={isUpdating}
          />
        </Modal>
      )}

      {duplicateModalOpen && !duplicateSuccess && (
        <Modal title="Duplicar presupuesto" onClose={() => { setDuplicateModalOpen(false); setDuplicateError(null); }}>
          <div className="space-y-4">
            {duplicateError && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-300">
                {duplicateError}
              </div>
            )}
            <DuplicateBudgetForm
              origin={budget}
              onSubmit={handleDuplicate}
              onCancel={() => { setDuplicateModalOpen(false); setDuplicateError(null); }}
              loading={isDuplicating}
            />
          </div>
        </Modal>
      )}

      {duplicateSuccess && (
        <Modal title="Presupuesto duplicado" onClose={() => setDuplicateSuccess(null)}>
          <div className="space-y-4">
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
              <p className="text-sm font-medium text-green-700 dark:text-green-300">¡Duplicación completada!</p>
              <div className="text-xs text-green-600 dark:text-green-400 mt-2 space-y-1">
                <p>✓ {duplicateSuccess.plannedExpensesCopied} gasto{duplicateSuccess.plannedExpensesCopied !== 1 ? 's' : ''} planeado{duplicateSuccess.plannedExpensesCopied !== 1 ? 's' : ''} copiado{duplicateSuccess.plannedExpensesCopied !== 1 ? 's' : ''}</p>
                <p>✓ {duplicateSuccess.incomesCopied} ingreso{duplicateSuccess.incomesCopied !== 1 ? 's' : ''} recreado{duplicateSuccess.incomesCopied !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => {
                  const targetId = duplicateSuccess.budget.id;
                  setDuplicateSuccess(null);
                  navigate(`/finances/budgets/${targetId}`);
                }}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-700 dark:bg-blue-600 text-white hover:bg-blue-800 dark:hover:bg-blue-700 transition-colors"
              >
                Ver presupuesto
              </button>
              <button
                onClick={() => setDuplicateSuccess(null)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={!!expenseToDelete}
        title="Eliminar gasto"
        message={`¿Eliminar "${expenseToDelete?.description}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={() =>
          deleteExpense(expenseToDelete!.id, { onSuccess: () => setExpenseToDelete(null) })
        }
        onCancel={() => setExpenseToDelete(null)}
        loading={isDeletingExpense}
      />
    </div>
  );
}
