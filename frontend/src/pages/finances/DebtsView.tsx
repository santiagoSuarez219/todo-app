import { useState } from 'react';
import {
  useDebts,
  useCreateDebt,
  useUpdateDebt,
  useDeleteDebt,
  usePayInstallment,
} from '../../hooks/finances/useDebts';
import DebtCard from '../../components/finances/DebtCard';
import DebtForm from '../../components/finances/DebtForm';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import type { Debt, CreateDebtDto, DebtStatus } from '../../types';

type Filter = 'all' | DebtStatus;

const FILTERS: { label: string; value: Filter }[] = [
  { label: 'Todas', value: 'all' },
  { label: 'Activas', value: 'activa' },
  { label: 'Pagadas', value: 'pagada' },
];

export default function DebtsView() {
  const [filter, setFilter] = useState<Filter>('all');
  const { data: debts = [], isLoading, isError } = useDebts(
    filter === 'all' ? undefined : filter,
  );

  const { mutateAsync: create, isPending: isCreating } = useCreateDebt();
  const { mutateAsync: update, isPending: isUpdating } = useUpdateDebt();
  const { mutate: remove, isPending: isDeleting } = useDeleteDebt();
  const { mutate: pay, isPending: isPaying, variables: payingId } = usePayInstallment();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Debt | null>(null);
  const [toDelete, setToDelete] = useState<Debt | null>(null);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(debt: Debt) {
    setEditing(debt);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  async function handleSubmit(dto: CreateDebtDto) {
    if (editing) {
      await update({ id: editing.id, dto });
    } else {
      await create(dto);
    }
    closeModal();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Deudas</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-700 dark:bg-blue-600 text-white hover:bg-blue-800 dark:hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nueva deuda
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
        {FILTERS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              filter === value
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-gray-400 dark:text-gray-500">Cargando…</p>}
      {isError && (
        <p className="text-sm text-red-500 dark:text-red-400">Error al cargar las deudas.</p>
      )}

      {!isLoading && debts.length === 0 && (
        <EmptyState message="No hay deudas registradas." />
      )}

      <div className="flex flex-col gap-3">
        {debts.map((debt) => (
          <DebtCard
            key={debt.id}
            debt={debt}
            onEdit={openEdit}
            onDelete={setToDelete}
            onPay={(d) => pay(d.id)}
            isPaying={isPaying && payingId === debt.id}
          />
        ))}
      </div>

      {modalOpen && (
        <Modal title={editing ? 'Editar deuda' : 'Nueva deuda'} onClose={closeModal}>
          <DebtForm
            initial={editing ?? undefined}
            onSubmit={handleSubmit}
            onCancel={closeModal}
            loading={isCreating || isUpdating}
          />
        </Modal>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar deuda"
        message={`¿Eliminar "${toDelete?.description}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={() => remove(toDelete!.id, { onSuccess: () => setToDelete(null) })}
        onCancel={() => setToDelete(null)}
        loading={isDeleting}
      />
    </div>
  );
}
