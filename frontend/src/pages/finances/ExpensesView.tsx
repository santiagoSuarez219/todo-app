import { useState } from 'react';
import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense } from '../../hooks/finances/useExpenses';
import ExpenseCard from '../../components/finances/ExpenseCard';
import ExpenseForm from '../../components/finances/ExpenseForm';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import type { Expense, CreateExpenseDto } from '../../types';

export default function ExpensesView() {
  const { data: expenses = [], isLoading, isError } = useExpenses();
  const { mutateAsync: create, isPending: isCreating } = useCreateExpense();
  const { mutateAsync: update, isPending: isUpdating } = useUpdateExpense();
  const { mutate: remove, isPending: isDeleting } = useDeleteExpense();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [toDelete, setToDelete] = useState<Expense | null>(null);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(expense: Expense) {
    setEditing(expense);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  async function handleSubmit(dto: CreateExpenseDto) {
    if (editing) {
      await update({ id: editing.id, dto });
    } else {
      await create(dto);
    }
    closeModal();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Gastos</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-700 dark:bg-blue-600 text-white hover:bg-blue-800 dark:hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nuevo gasto
        </button>
      </div>

      {isLoading && <p className="text-sm text-gray-400 dark:text-gray-500">Cargando…</p>}
      {isError && <p className="text-sm text-red-500 dark:text-red-400">Error al cargar los gastos.</p>}

      {!isLoading && expenses.length === 0 && (
        <EmptyState message="No hay gastos registrados." />
      )}

      <div className="flex flex-col gap-2">
        {expenses.map((expense) => (
          <ExpenseCard
            key={expense.id}
            expense={expense}
            onEdit={openEdit}
            onDelete={setToDelete}
          />
        ))}
      </div>

      {modalOpen && (
        <Modal title={editing ? 'Editar gasto' : 'Nuevo gasto'} onClose={closeModal}>
          <ExpenseForm
            initial={editing ?? undefined}
            onSubmit={handleSubmit}
            onCancel={closeModal}
            loading={isCreating || isUpdating}
          />
        </Modal>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar gasto"
        message={`¿Eliminar "${toDelete?.description}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={() => remove(toDelete!.id, { onSuccess: () => setToDelete(null) })}
        onCancel={() => setToDelete(null)}
        loading={isDeleting}
      />
    </div>
  );
}
