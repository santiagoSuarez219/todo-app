import { useState } from 'react';
import { useCdts, useCreateCdt, useUpdateCdt, useDeleteCdt } from '../../hooks/finances/useCdts';
import CdtCard from '../../components/finances/CdtCard';
import CdtForm from '../../components/finances/CdtForm';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import type { Cdt, CreateCdtDto } from '../../types';

function isActive(endDate: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return endDate >= today;
}

export default function CdtsView() {
  const { data: cdts = [], isLoading, isError } = useCdts();
  const { mutateAsync: create, isPending: isCreating } = useCreateCdt();
  const { mutateAsync: update, isPending: isUpdating } = useUpdateCdt();
  const { mutate: remove, isPending: isDeleting } = useDeleteCdt();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Cdt | null>(null);
  const [toDelete, setToDelete] = useState<Cdt | null>(null);

  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(cdt: Cdt) { setEditing(cdt); setModalOpen(true); }
  function closeModal() { setModalOpen(false); setEditing(null); }

  async function handleSubmit(dto: CreateCdtDto) {
    if (editing) { await update({ id: editing.id, dto }); }
    else { await create(dto); }
    closeModal();
  }

  const activeCdts = cdts.filter((c) => isActive(c.endDate));
  const expiredCdts = cdts.filter((c) => !isActive(c.endDate));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">CDTs</h1>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-700 dark:bg-blue-600 text-white hover:bg-blue-800 dark:hover:bg-blue-700 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nuevo CDT
        </button>
      </div>

      {isLoading && <p className="text-sm text-gray-400 dark:text-gray-500">Cargando…</p>}
      {isError && <p className="text-sm text-red-500 dark:text-red-400">Error al cargar los CDTs.</p>}
      {!isLoading && cdts.length === 0 && <EmptyState message="No hay CDTs registrados." />}

      {activeCdts.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
            Activos ({activeCdts.length})
          </h2>
          <div className="flex flex-col gap-3">
            {activeCdts.map((cdt) => (
              <CdtCard key={cdt.id} cdt={cdt} onEdit={openEdit} onDelete={setToDelete} />
            ))}
          </div>
        </section>
      )}

      {expiredCdts.length > 0 && (
        <section>
          {activeCdts.length > 0 && <hr className="border-gray-200 dark:border-gray-700 mb-6" />}
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
            Vencidos ({expiredCdts.length})
          </h2>
          <div className="flex flex-col gap-3 opacity-60">
            {expiredCdts.map((cdt) => (
              <CdtCard key={cdt.id} cdt={cdt} onEdit={openEdit} onDelete={setToDelete} />
            ))}
          </div>
        </section>
      )}

      {modalOpen && (
        <Modal title={editing ? 'Editar CDT' : 'Nuevo CDT'} onClose={closeModal}>
          <CdtForm initial={editing ?? undefined} onSubmit={handleSubmit} onCancel={closeModal} loading={isCreating || isUpdating} />
        </Modal>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar CDT"
        message={`¿Eliminar el CDT de ${toDelete?.bank}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={() => remove(toDelete!.id, { onSuccess: () => setToDelete(null) })}
        onCancel={() => setToDelete(null)}
        loading={isDeleting}
      />
    </div>
  );
}
