import { useState } from 'react';
import { useCreditCards, useCreateCreditCard, useUpdateCreditCard, useDeleteCreditCard } from '../../hooks/finances/useCreditCards';
import CreditCardCard from '../../components/finances/CreditCardCard';
import CreditCardForm from '../../components/finances/CreditCardForm';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import type { CreditCard, CreateCreditCardDto } from '../../types';

export default function CreditCardsView() {
  const { data: creditCards = [], isLoading, isError } = useCreditCards();
  const { mutateAsync: create, isPending: isCreating } = useCreateCreditCard();
  const { mutateAsync: update, isPending: isUpdating } = useUpdateCreditCard();
  const { mutate: remove, isPending: isDeleting } = useDeleteCreditCard();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CreditCard | null>(null);
  const [toDelete, setToDelete] = useState<CreditCard | null>(null);

  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(card: CreditCard) { setEditing(card); setModalOpen(true); }
  function closeModal() { setModalOpen(false); setEditing(null); }

  async function handleSubmit(dto: CreateCreditCardDto) {
    if (editing) { await update({ id: editing.id, dto }); }
    else { await create(dto); }
    closeModal();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Tarjetas de crédito</h1>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-700 dark:bg-blue-600 text-white hover:bg-blue-800 dark:hover:bg-blue-700 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nueva tarjeta
        </button>
      </div>

      {isLoading && <p className="text-sm text-gray-400 dark:text-gray-500">Cargando…</p>}
      {isError && <p className="text-sm text-red-500 dark:text-red-400">Error al cargar las tarjetas.</p>}
      {!isLoading && creditCards.length === 0 && <EmptyState message="No hay tarjetas de crédito registradas." />}

      <div className="grid gap-3 sm:grid-cols-2">
        {creditCards.map((card) => (
          <CreditCardCard key={card.id} creditCard={card} onEdit={openEdit} onDelete={setToDelete} />
        ))}
      </div>

      {modalOpen && (
        <Modal title={editing ? 'Editar tarjeta' : 'Nueva tarjeta'} onClose={closeModal}>
          <CreditCardForm initial={editing ?? undefined} onSubmit={handleSubmit} onCancel={closeModal} loading={isCreating || isUpdating} />
        </Modal>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar tarjeta"
        message={`¿Eliminar "${toDelete?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={() => remove(toDelete!.id, { onSuccess: () => setToDelete(null) })}
        onCancel={() => setToDelete(null)}
        loading={isDeleting}
      />
    </div>
  );
}
