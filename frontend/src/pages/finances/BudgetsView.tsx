import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBudgets, useCreateBudget, useDeleteBudget, useDuplicateBudget } from '../../hooks/finances/useBudgets';
import BudgetForm from '../../components/finances/BudgetForm';
import DuplicateBudgetForm from '../../components/finances/DuplicateBudgetForm';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import type { Budget, CreateBudgetDto, DuplicateBudgetResult } from '../../types';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

function totalPlanned(budget: Budget): number {
  return (budget.items ?? []).reduce((sum, item) => sum + Number(item.plannedAmount), 0);
}

export default function BudgetsView() {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const [filterYear, setFilterYear] = useState<number | undefined>(currentYear);

  const { data: budgets = [], isLoading, isError } = useBudgets(undefined, filterYear);
  const { mutateAsync: create, isPending: isCreating } = useCreateBudget();
  const { mutate: remove, isPending: isDeleting } = useDeleteBudget();
  const { mutateAsync: duplicate, isPending: isDuplicating } = useDuplicateBudget();

  const [modalOpen, setModalOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Budget | null>(null);
  const [duplicateFrom, setDuplicateFrom] = useState<Budget | null>(null);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [duplicateSuccess, setDuplicateSuccess] = useState<DuplicateBudgetResult | null>(null);

  async function handleSubmit(dto: CreateBudgetDto) {
    await create(dto);
    setModalOpen(false);
  }

  async function handleDuplicate(dto: { month: number; year: number; name?: string }) {
    if (!duplicateFrom) return;
    try {
      setDuplicateError(null);
      const result = await duplicate({ id: duplicateFrom.id, dto });
      setDuplicateSuccess(result);
      setDuplicateFrom(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      setDuplicateError(message);
    }
  }

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 1 + i);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Presupuestos</h1>
        <div className="flex items-center gap-3">
          <select
            value={filterYear ?? ''}
            onChange={(e) => setFilterYear(e.target.value ? Number(e.target.value) : undefined)}
            className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-colors"
          >
            <option value="">Todos los años</option>
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-700 dark:bg-blue-600 text-white hover:bg-blue-800 dark:hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nuevo presupuesto
          </button>
        </div>
      </div>

      {isLoading && <p className="text-sm text-gray-400 dark:text-gray-500">Cargando…</p>}
      {isError && <p className="text-sm text-red-500 dark:text-red-400">Error al cargar los presupuestos.</p>}
      {!isLoading && budgets.length === 0 && <EmptyState message="No hay presupuestos registrados." />}

      <div className="grid gap-3 sm:grid-cols-2">
        {budgets.map((budget) => {
          const total = totalPlanned(budget);
          return (
            <div
              key={budget.id}
              onClick={() => navigate(`/finances/budgets/${budget.id}`)}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{budget.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {MONTHS[budget.month - 1]} {budget.year}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {(budget.items ?? []).length} ítem{(budget.items ?? []).length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">
                    {COP.format(total)}
                  </p>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); setDuplicateFrom(budget); }}
                      className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 px-1.5 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      title="Duplicar a otro mes"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-.621-.504-1.125-1.125-1.125H9.375c-.621 0-1.125.504-1.125 1.125v5.375c0 .621.504 1.125 1.125 1.125Z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setToDelete(budget); }}
                      className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 px-1.5 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {modalOpen && (
        <Modal title="Nuevo presupuesto" onClose={() => setModalOpen(false)}>
          <BudgetForm onSubmit={handleSubmit} onCancel={() => setModalOpen(false)} loading={isCreating} />
        </Modal>
      )}

      {duplicateFrom && !duplicateSuccess && (
        <Modal title="Duplicar presupuesto" onClose={() => { setDuplicateFrom(null); setDuplicateError(null); }}>
          <div className="space-y-4">
            {duplicateError && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-300">
                {duplicateError}
              </div>
            )}
            <DuplicateBudgetForm
              origin={duplicateFrom}
              onSubmit={handleDuplicate}
              onCancel={() => { setDuplicateFrom(null); setDuplicateError(null); }}
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
                <p>✓ {duplicateSuccess.itemsCopied} ítem{duplicateSuccess.itemsCopied !== 1 ? 's' : ''} copiado{duplicateSuccess.itemsCopied !== 1 ? 's' : ''}</p>
                <p>✓ {duplicateSuccess.incomesCopied} ingreso{duplicateSuccess.incomesCopied !== 1 ? 's' : ''} recreado{duplicateSuccess.incomesCopied !== 1 ? 's' : ''}</p>
                <p>✓ {duplicateSuccess.expensesCopied} gasto{duplicateSuccess.expensesCopied !== 1 ? 's' : ''} recreado{duplicateSuccess.expensesCopied !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => navigate(`/finances/budgets/${duplicateSuccess.budget.id}`)}
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
        open={!!toDelete}
        title="Eliminar presupuesto"
        message={`¿Eliminar "${toDelete?.name}"? Se eliminarán también todos sus ítems.`}
        confirmLabel="Eliminar"
        onConfirm={() => remove(toDelete!.id, { onSuccess: () => setToDelete(null) })}
        onCancel={() => setToDelete(null)}
        loading={isDeleting}
      />
    </div>
  );
}
