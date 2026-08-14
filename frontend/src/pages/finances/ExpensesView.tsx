import { useState } from 'react';
import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense, useDuplicateExpense } from '../../hooks/finances/useExpenses';
import { useCreditCards } from '../../hooks/finances/useCreditCards';
import { useDebounce } from '../../hooks/useDebounce';
import ExpenseCard from '../../components/finances/ExpenseCard';
import ExpenseForm from '../../components/finances/ExpenseForm';
import DuplicateExpenseForm from '../../components/finances/DuplicateExpenseForm';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import { SearchBar } from '../../components/SearchBar';
import type { Expense, CreateExpenseDto, ExpenseType, UpdateExpenseDto, DuplicateExpenseDto } from '../../types';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

interface EditState {
  description: string;
  amount: string;
  date: string;
  type: ExpenseType;
  creditCardId: string;
}

export default function ExpensesView() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [filterYear, setFilterYear] = useState<number>(currentYear);
  const [filterMonth, setFilterMonth] = useState<number>(currentMonth);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);

  const { data: expenses = [], isLoading, isFetching, isError } = useExpenses(
    { limit: 100 },
    filterYear,
    filterMonth,
    debouncedSearch.trim().length >= 2 ? debouncedSearch : undefined,
  );

  // Refresco: ya hay datos previos visibles mientras llega el nuevo set
  // (al escribir o cambiar mes/año) → transición suave en vez de flash.
  const isRefreshing = isFetching && !isLoading;
  const { data: creditCards = [] } = useCreditCards();
  const { mutateAsync: create, isPending: isCreating } = useCreateExpense();
  const { mutateAsync: update, isPending: isUpdating } = useUpdateExpense();
  const { mutate: remove, isPending: isDeleting } = useDeleteExpense();
  const { mutateAsync: duplicate, isPending: isDuplicating } = useDuplicateExpense();

  const [modalOpen, setModalOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Expense | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({
    description: '',
    amount: '',
    date: '',
    type: 'basico' as ExpenseType,
    creditCardId: '',
  });
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [toDuplicate, setToDuplicate] = useState<Expense | null>(null);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [duplicateSuccess, setDuplicateSuccess] = useState<string | null>(null);

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 1 + i);

  function openCreate() {
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  function startEditing(expense: Expense) {
    setEditingExpenseId(expense.id);
    setEditState({
      description: expense.description,
      amount: String(expense.amount),
      date: expense.date,
      type: expense.type,
      creditCardId: expense.creditCard?.id ?? '',
    });
  }

  function cancelEditing() {
    setEditingExpenseId(null);
  }

  async function saveEditing(expense: Expense) {
    const dto: UpdateExpenseDto = {};
    if (editState.description !== expense.description) dto.description = editState.description;
    if (Number(editState.amount) !== Number(expense.amount)) dto.amount = Number(editState.amount);
    if (editState.date !== expense.date) dto.date = editState.date;
    if (editState.type !== expense.type) dto.type = editState.type;
    if ((editState.creditCardId || undefined) !== (expense.creditCard?.id || undefined)) {
      dto.creditCardId = editState.creditCardId || null;
    }

    if (Object.keys(dto).length > 0) {
      await update({ id: expense.id, dto });
    }
    setEditingExpenseId(null);
  }

  async function handleSubmit(dto: CreateExpenseDto) {
    await create(dto);
    closeModal();
  }

  function openDuplicate(expense: Expense) {
    setToDuplicate(expense);
    setDuplicateError(null);
    setDuplicateSuccess(null);
    setDuplicateModalOpen(true);
  }

  function closeDuplicateModal() {
    setDuplicateModalOpen(false);
    setToDuplicate(null);
    setDuplicateError(null);
    setDuplicateSuccess(null);
  }

  async function handleDuplicate(dto: DuplicateExpenseDto) {
    if (!toDuplicate) return;
    try {
      setDuplicateError(null);
      await duplicate({ id: toDuplicate.id, dto });
      setDuplicateSuccess(`Gasto duplicado a ${MONTHS[dto.month - 1]} ${dto.year}`);
      setTimeout(() => closeDuplicateModal(), 2000);
    } catch (err: any) {
      setDuplicateError(err.message || 'Error al duplicar el gasto');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Gastos</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(Number(e.target.value))}
            className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-colors"
          >
            {MONTHS.map((name, i) => (
              <option key={i + 1} value={i + 1}>{name}</option>
            ))}
          </select>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(Number(e.target.value))}
            className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-colors"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-700 dark:bg-blue-600 text-white hover:bg-blue-800 dark:hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nuevo gasto
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div>
        <SearchBar
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Buscar por descripción..."
          onClear={() => setSearchInput('')}
        />
      </div>

      {isLoading && <p className="text-sm text-gray-400 dark:text-gray-500">Cargando…</p>}
      {isError && <p className="text-sm text-red-500 dark:text-red-400">Error al cargar los gastos.</p>}

      {!isLoading && expenses.length === 0 && (
        <EmptyState
          message={
            debouncedSearch.trim().length >= 2
              ? `No hay resultados para "${debouncedSearch}" en ${MONTHS[filterMonth - 1]} ${filterYear}.`
              : `No hay gastos en ${MONTHS[filterMonth - 1]} ${filterYear}.`
          }
        />
      )}

      <div
        className={`flex flex-col gap-2 transition-opacity duration-200 ${
          isRefreshing ? 'opacity-50' : 'opacity-100'
        }`}
      >
        {expenses.map((expense) => (
          <ExpenseCard
            key={expense.id}
            expense={expense}
            isEditing={editingExpenseId === expense.id}
            editDisabled={editingExpenseId !== null && editingExpenseId !== expense.id}
            creditCards={creditCards}
            editState={editingExpenseId === expense.id ? editState : { description: '', amount: '', date: '', type: 'basico', creditCardId: '' }}
            onEditStateChange={(patch) => setEditState((s) => ({ ...s, ...patch }))}
            onStartEdit={startEditing}
            onSaveEdit={saveEditing}
            onCancelEdit={cancelEditing}
            onDelete={setToDelete}
            onDuplicate={openDuplicate}
            isSaving={isUpdating && editingExpenseId === expense.id}
          />
        ))}
      </div>

      {modalOpen && (
        <Modal title="Nuevo gasto" onClose={closeModal}>
          <ExpenseForm
            onSubmit={handleSubmit}
            onCancel={closeModal}
            loading={isCreating}
          />
        </Modal>
      )}

      {duplicateModalOpen && toDuplicate && (
        <Modal title="Duplicar gasto" onClose={closeDuplicateModal}>
          <div className="space-y-4">
            {duplicateSuccess && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-3 text-sm text-green-700 dark:text-green-400">
                ✓ {duplicateSuccess}
              </div>
            )}
            {duplicateError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3 text-sm text-red-700 dark:text-red-400">
                ✗ {duplicateError}
              </div>
            )}
            <DuplicateExpenseForm
              origin={toDuplicate}
              onSubmit={handleDuplicate}
              onCancel={closeDuplicateModal}
              loading={isDuplicating}
            />
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar gasto"
        message={`¿Eliminar "${toDelete?.description}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={() => remove(toDelete!.id, { onSuccess: () => setToDelete(null) })}
        onCancel={() => setToDelete(null)}
        loading={isDeleting}
      />
    </div>
  );
}
