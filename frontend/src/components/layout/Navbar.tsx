import { useState } from 'react';
import { useCreateActivity } from '../../hooks/useActivities';
import { useProjects } from '../../hooks/useProjects';
import type { CreateActivityDto } from '../../types';
import Modal from '../Modal';
import ActivityForm from '../ActivityForm';

interface NavbarProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function HamburgerIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 1 0 0 10A5 5 0 0 0 12 7z" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35m0 0A7.5 7.5 0 1 0 6.5 6.5a7.5 7.5 0 0 0 10.15 10.15z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

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

// ─── Navbar ───────────────────────────────────────────────────────────────────

export default function Navbar({ onToggleSidebar }: NavbarProps) {
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains('dark')
  );
  const [createOpen, setCreateOpen] = useState(false);

  function toggleDark() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('color-theme', next ? 'dark' : 'light');
  }

  return (
    <>
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-14 flex items-center px-4 gap-3 shrink-0 z-10">
        {/* Hamburger */}
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
          className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <HamburgerIcon />
        </button>

        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <SearchIcon />
          <input
            type="text"
            placeholder="Buscar tareas..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700 transition-colors"
          />
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Dark mode toggle */}
          <button
            onClick={toggleDark}
            aria-label="Toggle dark mode"
            className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>

          {/* Add task */}
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg transition-colors"
          >
            <PlusIcon />
            Agregar Tarea
          </button>
        </div>
      </nav>

      {createOpen && <CreateActivityModal onClose={() => setCreateOpen(false)} />}
    </>
  );
}
