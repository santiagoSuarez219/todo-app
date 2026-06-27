import { useState, useRef, useEffect, type FormEvent } from 'react';
import { useBacklogActivities, useCreateActivity } from '../hooks/useActivities';
import ActivityCard from '../components/ActivityCard';
import EmptyState from '../components/EmptyState';

// ─── QuickAddCard ──────────────────────────────────────────────────────────────

function QuickAddCard() {
  const [active, setActive] = useState(false);
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { mutate, isPending } = useCreateActivity();

  useEffect(() => {
    if (active) inputRef.current?.focus();
  }, [active]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    mutate({ name: trimmed }, {
      onSuccess: () => {
        setName('');
        inputRef.current?.focus();
      },
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setName('');
      setActive(false);
    }
  }

  if (!active) {
    return (
      <button
        onClick={() => setActive(true)}
        className="flex items-center justify-center gap-2 w-full rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 px-4 py-3 text-sm text-gray-400 dark:text-gray-500 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
      >
        <span className="text-lg leading-none">+</span>
        Nueva tarea
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 rounded-lg border-2 border-blue-400 dark:border-blue-500 bg-white dark:bg-gray-800 px-4 py-3"
    >
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Nombre de la tarea…"
        disabled={isPending}
        className="flex-1 text-sm bg-transparent text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none"
      />
      <button
        type="submit"
        disabled={isPending || !name.trim()}
        className="shrink-0 px-3 py-1 text-xs font-medium bg-blue-700 dark:bg-blue-600 text-white rounded-md hover:bg-blue-800 dark:hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {isPending ? '…' : 'Agregar'}
      </button>
      <button
        type="button"
        onClick={() => { setName(''); setActive(false); }}
        className="shrink-0 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      >
        Cancelar
      </button>
    </form>
  );
}

// ─── BacklogView ───────────────────────────────────────────────────────────────

export default function BacklogView() {
  const { data = [], isLoading, isError } = useBacklogActivities();

  const visible = data.filter((a) => !a.parent && !a.isTemplate);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Backlog</h1>
        {visible.length > 0 && (
          <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold px-2.5 py-0.5 rounded-full">
            {visible.length}
          </span>
        )}
      </div>

      {/* States */}
      {isLoading && <p className="text-sm text-gray-400">Cargando…</p>}
      {isError && <p className="text-sm text-red-500">Error al cargar el backlog.</p>}
      {!isLoading && visible.length === 0 && (
        <EmptyState message="El backlog está vacío. Agrega tu primera tarea." />
      )}

      {/* Activity list + inline add card */}
      {!isLoading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} />
          ))}
          <QuickAddCard />
        </div>
      )}
    </div>
  );
}
