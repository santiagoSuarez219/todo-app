import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBudget, useUpdateBudget, useAddBudgetItem, useUpdateBudgetItem, useDeleteBudgetItem } from '../../hooks/finances/useBudgets';
import BudgetForm from '../../components/finances/BudgetForm';
import BudgetItemForm from '../../components/finances/BudgetItemForm';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { ExpenseType } from '../../types';
import type { BudgetItem, CreateBudgetItemDto, UpdateBudgetDto, UpdateBudgetItemDto } from '../../types';

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

interface EditState {
  description: string;
  plannedAmount: string;
  type: ExpenseType;
}

export default function BudgetDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: budget, isLoading, isError } = useBudget(id!);
  const { mutateAsync: update, isPending: isUpdating } = useUpdateBudget();
  const { mutateAsync: addItem, isPending: isAddingItem } = useAddBudgetItem();
  const { mutateAsync: updateItem, isPending: isUpdatingItem } = useUpdateBudgetItem();
  const { mutate: deleteItem, isPending: isDeletingItem } = useDeleteBudgetItem();

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<BudgetItem | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ description: '', plannedAmount: '', type: ExpenseType.basico });

  function startEditing(item: BudgetItem) {
    setEditingItemId(item.id);
    setEditState({
      description: item.description,
      plannedAmount: String(item.plannedAmount),
      type: item.type,
    });
  }

  function cancelEditing() {
    setEditingItemId(null);
  }

  async function saveEditing(item: BudgetItem) {
    const dto: UpdateBudgetItemDto = {};
    if (editState.description !== item.description) dto.description = editState.description;
    if (Number(editState.plannedAmount) !== Number(item.plannedAmount)) dto.plannedAmount = Number(editState.plannedAmount);
    if (editState.type !== item.type) dto.type = editState.type;

    if (Object.keys(dto).length > 0) {
      await updateItem({ budgetId: id!, itemId: item.id, dto });
    }
    setEditingItemId(null);
  }

  async function handleUpdateBudget(dto: UpdateBudgetDto) {
    await update({ id: id!, dto });
    setEditModalOpen(false);
  }

  async function handleAddItem(dto: CreateBudgetItemDto) {
    await addItem({ budgetId: id!, dto });
  }

  if (isLoading) {
    return <p className="text-sm text-gray-400 dark:text-gray-500">Cargando…</p>;
  }

  if (isError || !budget) {
    return <p className="text-sm text-red-500 dark:text-red-400">Error al cargar el presupuesto.</p>;
  }

  const items = budget.items ?? [];
  const total = items.reduce((sum, item) => sum + Number(item.plannedAmount), 0);
  const totalIncome = budget.totalIncome ?? 0;
  const typeSummary = budget.typeSummary ?? [];

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

      {/* Resumen por tipo */}
      {typeSummary.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Resumen por tipo</h2>
            {totalIncome > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Ingresos del mes: <span className="font-medium text-gray-700 dark:text-gray-300">{COP.format(totalIncome)}</span>
              </p>
            )}
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {typeSummary.map((s) => (
              <div key={s.type} className="px-4 py-3 flex items-center justify-between gap-3">
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[s.type as ExpenseType]}`}>
                  {TYPE_LABELS[s.type as ExpenseType]}
                </span>
                <div className="flex items-center gap-4 text-sm">
                  <span className="tabular-nums text-gray-700 dark:text-gray-300">{COP.format(s.total)}</span>
                  {totalIncome > 0 && (
                    <span className="tabular-nums text-gray-400 dark:text-gray-500 w-14 text-right">
                      {s.percentage.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div className="px-4 py-3 flex items-center justify-between gap-3 bg-gray-50 dark:bg-gray-700/50">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Total planificado</span>
              <div className="flex items-center gap-4 text-sm font-semibold">
                <span className="tabular-nums text-gray-900 dark:text-white">{COP.format(total)}</span>
                {totalIncome > 0 && (
                  <span className="tabular-nums text-gray-500 dark:text-gray-400 w-14 text-right">
                    {totalIncome > 0 ? (Math.round((total / totalIncome) * 10000) / 100).toFixed(1) : 0}%
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ítems */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Ítems del presupuesto</h2>
          <span className="text-xs text-gray-500 dark:text-gray-400">{items.length} ítem{items.length !== 1 ? 's' : ''}</span>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 px-4 py-6 text-center">
            No hay ítems. Agrega el primero abajo.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 dark:text-gray-400">
                <th className="text-left px-4 py-2 font-medium">Descripción</th>
                <th className="text-left px-4 py-2 font-medium">Tipo</th>
                <th className="text-right px-4 py-2 font-medium">Monto planificado</th>
                <th className="px-4 py-2 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {items.map((item) => {
                const isEditing = editingItemId === item.id;
                const isSaving = isUpdatingItem && isEditing;

                if (isEditing) {
                  return (
                    <tr key={item.id} className="bg-blue-50 dark:bg-blue-900/10">
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
                          className="w-full text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-right text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          disabled={isSaving}
                          min={0}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => saveEditing(item)}
                            disabled={isSaving || !editState.description.trim() || Number(editState.plannedAmount) <= 0}
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

                return (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{item.description}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[item.type]}`}>
                        {TYPE_LABELS[item.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">
                      {COP.format(item.plannedAmount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEditing(item)}
                          disabled={!!editingItemId}
                          className="text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-30 transition-colors"
                          title="Editar ítem"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setItemToDelete(item)}
                          disabled={!!editingItemId}
                          className="text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-30 transition-colors"
                          title="Eliminar ítem"
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
                <td className="px-4 py-3 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400" colSpan={2}>Total planificado</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-900 dark:text-white">{COP.format(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}

        <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">Agregar ítem</p>
          <BudgetItemForm onSubmit={handleAddItem} loading={isAddingItem} />
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

      <ConfirmDialog
        open={!!itemToDelete}
        title="Eliminar ítem"
        message={`¿Eliminar "${itemToDelete?.description}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={() =>
          deleteItem(
            { budgetId: id!, itemId: itemToDelete!.id },
            { onSuccess: () => setItemToDelete(null) },
          )
        }
        onCancel={() => setItemToDelete(null)}
        loading={isDeletingItem}
      />
    </div>
  );
}
