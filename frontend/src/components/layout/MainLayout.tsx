import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Tabbar from './Tabbar';
import Modal from '../Modal';
import ActivityForm from '../ActivityForm';
import { useProjects } from '../../hooks/useProjects';
import { useCreateActivity } from '../../hooks/useActivities';
import type { CreateActivityDto } from '../../types';

// ─── Create Activity Modal ────────────────────────────────────────────────────

function CreateActivityModal({ onClose }: { onClose: () => void }) {
  const { data: projects } = useProjects();
  const { mutateAsync, isPending } = useCreateActivity();

  async function handleSubmit(dto: CreateActivityDto) {
    await mutateAsync(dto);
    onClose();
  }

  return (
    <Modal title="Nueva actividad" onClose={onClose}>
      <ActivityForm
        projects={projects ?? []}
        onSubmit={handleSubmit}
        onCancel={onClose}
        loading={isPending}
      />
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
      {createOpen && <CreateActivityModal onClose={() => setCreateOpen(false)} />}
    </div>
  );
}
