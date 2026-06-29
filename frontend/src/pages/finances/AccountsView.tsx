import { useState } from 'react';
import { useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount } from '../../hooks/finances/useAccounts';
import AccountCard from '../../components/finances/AccountCard';
import AccountForm from '../../components/finances/AccountForm';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import type { Account, CreateAccountDto } from '../../types';

export default function AccountsView() {
  const { data: accounts = [], isLoading, isError } = useAccounts();
  const { mutateAsync: create, isPending: isCreating } = useCreateAccount();
  const { mutateAsync: update, isPending: isUpdating } = useUpdateAccount();
  const { mutate: remove, isPending: isDeleting } = useDeleteAccount();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [toDelete, setToDelete] = useState<Account | null>(null);

  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(account: Account) { setEditing(account); setModalOpen(true); }
  function closeModal() { setModalOpen(false); setEditing(null); }

  async function handleSubmit(dto: CreateAccountDto) {
    if (editing) { await update({ id: editing.id, dto }); }
    else { await create(dto); }
    closeModal();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Cuentas</h1>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-700 dark:bg-blue-600 text-white hover:bg-blue-800 dark:hover:bg-blue-700 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nueva cuenta
        </button>
      </div>

      {isLoading && <p className="text-sm text-gray-400 dark:text-gray-500">Cargando…</p>}
      {isError && <p className="text-sm text-red-500 dark:text-red-400">Error al cargar las cuentas.</p>}
      {!isLoading && accounts.length === 0 && <EmptyState message="No hay cuentas registradas." />}

      <div className="grid gap-3 sm:grid-cols-2">
        {accounts.map((account) => (
          <AccountCard key={account.id} account={account} onEdit={openEdit} onDelete={setToDelete} />
        ))}
      </div>

      {modalOpen && (
        <Modal title={editing ? 'Editar cuenta' : 'Nueva cuenta'} onClose={closeModal}>
          <AccountForm initial={editing ?? undefined} onSubmit={handleSubmit} onCancel={closeModal} loading={isCreating || isUpdating} />
        </Modal>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar cuenta"
        message={`¿Eliminar "${toDelete?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={() => remove(toDelete!.id, { onSuccess: () => setToDelete(null) })}
        onCancel={() => setToDelete(null)}
        loading={isDeleting}
      />
    </div>
  );
}
