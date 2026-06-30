import { useState } from 'react';
import { useIncomes, useCreateIncome, useUpdateIncome, useDeleteIncome } from '../../hooks/finances/useIncomes';
import IncomeCard from '../../components/finances/IncomeCard';
import IncomeForm from '../../components/finances/IncomeForm';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import type { Income, CreateIncomeDto } from '../../types';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export default function IncomesView() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [filterYear, setFilterYear] = useState<number>(currentYear);
  const [filterMonth, setFilterMonth] = useState<number>(currentMonth);

  const { data: incomes = [], isLoading, isError } = useIncomes(undefined, filterYear, filterMonth);
  const { mutateAsync: create, isPending: isCreating } = useCreateIncome();
  const { mutateAsync: update, isPending: isUpdating } = useUpdateIncome();
  const { mutate: remove, isPending: isDeleting } = useDeleteIncome();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Income | null>(null);
  const [toDelete, setToDelete] = useState<Income | null>(null);

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 1 + i);

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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Ingresos</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(Number(e.target.value))}
            className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-200 dark:focus:ring-green-800 transition-colors"
          >
            {MONTHS.map((name, i) => (
              <option key={i + 1} value={i + 1}>{name}</option>
            ))}
          </select>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(Number(e.target.value))}
            className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-200 dark:focus:ring-green-800 transition-colors"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
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
      </div>

      {isLoading && <p className="text-sm text-gray-400 dark:text-gray-500">Cargando…</p>}
      {isError && <p className="text-sm text-red-500 dark:text-red-400">Error al cargar los ingresos.</p>}

      {!isLoading && incomes.length === 0 && (
        <EmptyState message={`No hay ingresos en ${MONTHS[filterMonth - 1]} ${filterYear}.`} />
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
