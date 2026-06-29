import { useState, useRef, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Tabbar from './Tabbar';
import Modal from '../Modal';
import { useCreateActivity } from '../../hooks/useActivities';

// ─── Quick-add to backlog modal ───────────────────────────────────────────────

function QuickAddModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const { mutateAsync, isPending } = useCreateActivity();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    await mutateAsync({ name: trimmed });
    onClose();
  }

  return (
    <Modal title="Nueva tarea" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la tarea"
          className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-colors"
        />
        <div className="flex justify-end gap-3 pt-1 border-t border-gray-100 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending || !name.trim()}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-700 dark:bg-blue-600 text-white hover:bg-blue-800 dark:hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── MainLayout ───────────────────────────────────────────────────────────────

export default function MainLayout() {
  const [createOpen, setCreateOpen] = useState(false);

  function openCreate() {
    setCreateOpen(true);
  }

  return (
    <div className="flex min-h-screen bg-white dark:bg-gray-900">
      <Sidebar onCreateActivity={openCreate} />
      <main className="flex-1 overflow-auto p-4 pb-24 sm:p-6 md:p-8 md:pb-8 bg-gray-50 dark:bg-gray-900">
        <Outlet />
      </main>
      <Tabbar onCreateActivity={openCreate} />
      {createOpen && <QuickAddModal onClose={() => setCreateOpen(false)} />}
    </div>
  );
}
