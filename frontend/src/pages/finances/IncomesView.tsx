import { useState } from 'react';
import { useIncomes, useCreateIncome, useUpdateIncome, useDeleteIncome } from '../../hooks/finances/useIncomes';
import IncomeCard from '../../components/finances/IncomeCard';
import IncomeForm from '../../components/finances/IncomeForm';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import type { Income, CreateIncomeDto } from '../../types';

export default function IncomesView() {
  const { data: incomes = [], isLoading, isError } = useIncomes();
  const { mutateAsync: create, isPending: isCreating } = useCreateIncome();
  const { mutateAsync: update, isPending: isUpdating } = useUpdateIncome();
  const { mutate: remove, isPending: isDeleting } = useDeleteIncome();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Income | null>(null);
  const [toDelete, setToDelete] = useState<Income | null>(null);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(income: Income) {
    setEditing(income);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  async function handleSubmit(dto: CreateIncomeDto) {
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
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Ingresos</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-green-700 dark:bg-green-600 text-white hover:bg-green-800 dark:hover:bg-green-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nuevo ingreso
        </button>
      </div>

      {isLoading && <p className="text-sm text-gray-400 dark:text-gray-500">Cargando…</p>}
      {isError && <p className="text-sm text-red-500 dark:text-red-400">Error al cargar los ingresos.</p>}

      {!isLoading && incomes.length === 0 && (
        <EmptyState message="No hay ingresos registrados." />
      )}

      <div className="flex flex-col gap-2">
        {incomes.map((income) => (
          <IncomeCard
            key={income.id}
            income={income}
            onEdit={openEdit}
            onDelete={setToDelete}
          />
        ))}
      </div>

      {modalOpen && (
        <Modal title={editing ? 'Editar ingreso' : 'Nuevo ingreso'} onClose={closeModal}>
          <IncomeForm
            initial={editing ?? undefined}
            onSubmit={handleSubmit}
            onCancel={closeModal}
            loading={isCreating || isUpdating}
          />
        </Modal>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar ingreso"
        message={`¿Eliminar "${toDelete?.description}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={() => remove(toDelete!.id, { onSuccess: () => setToDelete(null) })}
        onCancel={() => setToDelete(null)}
        loading={isDeleting}
      />
    </div>
  );
}
