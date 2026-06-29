import { useState } from 'react';
import { usePurchases, useCreatePurchase, useUpdatePurchase, useDeletePurchase } from '../../hooks/finances/usePurchases';
import PurchaseCard from '../../components/finances/PurchaseCard';
import PurchaseForm from '../../components/finances/PurchaseForm';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import { PurchaseStatus, type Purchase, type CreatePurchaseDto } from '../../types';

type TabStatus = 'todos' | PurchaseStatus;

const TABS: { value: TabStatus; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: PurchaseStatus.PENDIENTE, label: 'Pendiente' },
  { value: PurchaseStatus.COMPRADO, label: 'Comprado' },
  { value: PurchaseStatus.DESCARTADO, label: 'Descartado' },
];

export default function PurchasesView() {
  const [activeTab, setActiveTab] = useState<TabStatus>('todos');
  const statusFilter = activeTab === 'todos' ? undefined : activeTab;

  const { data: purchases = [], isLoading, isError } = usePurchases(undefined, statusFilter);
  const { mutateAsync: create, isPending: isCreating } = useCreatePurchase();
  const { mutateAsync: update, isPending: isUpdating } = useUpdatePurchase();
  const { mutate: remove, isPending: isDeleting } = useDeletePurchase();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Purchase | null>(null);
  const [toDelete, setToDelete] = useState<Purchase | null>(null);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(purchase: Purchase) {
    setEditing(purchase);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  async function handleSubmit(dto: CreatePurchaseDto) {
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
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Lista de compras</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-700 dark:bg-blue-600 text-white hover:bg-blue-800 dark:hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nueva compra
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {TABS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setActiveTab(value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === value
                ? 'border-blue-600 dark:border-blue-400 text-blue-700 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-gray-400 dark:text-gray-500">Cargando…</p>}
      {isError && <p className="text-sm text-red-500 dark:text-red-400">Error al cargar las compras.</p>}

      {!isLoading && purchases.length === 0 && (
        <EmptyState message="No hay compras en esta lista." />
      )}

      <div className="flex flex-col gap-3">
        {purchases.map((purchase) => (
          <PurchaseCard
            key={purchase.id}
            purchase={purchase}
            onEdit={openEdit}
            onDelete={setToDelete}
          />
        ))}
      </div>

      {modalOpen && (
        <Modal title={editing ? 'Editar compra' : 'Nueva compra'} onClose={closeModal}>
          <PurchaseForm
            initial={editing ?? undefined}
            onSubmit={handleSubmit}
            onCancel={closeModal}
            loading={isCreating || isUpdating}
          />
        </Modal>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar compra"
        message={`¿Eliminar "${toDelete?.description}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={() => remove(toDelete!.id, { onSuccess: () => setToDelete(null) })}
        onCancel={() => setToDelete(null)}
        loading={isDeleting}
      />
    </div>
  );
}
