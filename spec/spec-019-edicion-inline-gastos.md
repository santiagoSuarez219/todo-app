# spec-019 — [DONE] Edición inline de gastos

## Contexto

Hoy, editar un gasto (`Expense`) desde `ExpensesView` (`frontend/src/pages/finances/ExpensesView.tsx`) abre un modal (`Modal` + `ExpenseForm`) igual al de creación. El usuario quiere el mismo patrón de edición inline que ya existe para los ítems de presupuesto (`BudgetItem`) en `BudgetDetailView.tsx` (implementado en spec-015, Fase 3): un botón de lápiz activa un modo de edición directamente en el elemento de la lista, con inputs en línea para cada campo y botones de guardar (✓) / cancelar (✗), sin abrir modal, ocultando el botón de eliminar mientras se edita.

La diferencia clave es de layout: los ítems de presupuesto se muestran en una `<table>` (una fila = un ítem, columnas fijas), mientras que los gastos se muestran como cards en una lista vertical (`ExpenseCard.tsx`, un `<div>` flex por gasto, sin columnas). El patrón de edición inline debe adaptarse a ese layout de card: no hay columnas de tabla que reemplazar por inputs, sino que la card completa debe transformar su contenido en un mini-formulario en línea.

Además, desde spec-018 (`[TESTING]`, en la misma rama `feature/gasto-con-tarjeta`), `Expense` tiene un campo opcional `creditCard: CreditCard | null`, seleccionable en `ExpenseForm` vía un `<select>` poblado con `useCreditCards()`. Ese campo también debe poder editarse inline.

El hook `useUpdateExpense` (`frontend/src/hooks/finances/useExpenses.ts`, líneas 34-40) ya existe y ya es usado por el modal de edición actual — no requiere cambios. Tampoco se requieren cambios de backend: `UpdateExpenseDto` (`frontend/src/types/index.ts`, línea 300) ya es `Partial<CreateExpenseDto>` y soporta actualizaciones parciales, incluyendo `creditCardId`.

## Alcance

**Incluye:**
- Edición inline de gastos directamente en `ExpenseCard`, reemplazando el flujo de edición vía modal.
- Los 5 campos editables: `description`, `amount`, `date`, `type`, `creditCardId` (opcional).
- Botón de lápiz ("Editar") en la card activa el modo edición; botones ✓ (guardar) / ✗ (cancelar) en línea, sin modal.
- Mientras una card está en modo edición: se oculta su botón "Eliminar", y se deshabilitan los botones "Editar"/"Eliminar" del resto de las cards (solo una card editable a la vez — mismo comportamiento que `BudgetDetailView`).
- El envío a `useUpdateExpense` solo incluye los campos que cambiaron respecto al gasto original (diffing), igual que `saveEditing` en `BudgetDetailView.tsx` (líneas 67-77).
- El modal (`Modal` + `ExpenseForm`) se mantiene **solo para creación** de gastos nuevos ("Nuevo gasto").

**No incluye:**
- Cambios en el backend (`expenses.service.ts`, DTOs, controller): no se requieren, el endpoint `PATCH /finances/expenses/:id` ya soporta actualizaciones parciales.
- Cambios en `ExpenseForm.tsx` más allá de que deja de usarse para edición (el componente no se borra: sigue usado para creación).
- Cambios en el listado de ítems de presupuesto (`BudgetDetailView.tsx`) — ya tiene su propia edición inline, no se toca.
- Validaciones con Zod/React Hook Form en el modo inline — se sigue el patrón ya validado en `BudgetDetailView.tsx`, que usa validación manual simple (deshabilitar guardar si campos requeridos están vacíos o el monto es ≤ 0), no un formulario de React Hook Form completo.
- Edición inline de gastos desde otras vistas (ej. si `ExpenseCard` se reutiliza en otro lugar en el futuro) — fuera de scope, este spec solo cubre `ExpensesView`.
- Cambios en `useExpenses.ts` o `expenses.service.ts` — se reutilizan tal cual.

## Impacto en el sistema

- **Frontend:**
  - `frontend/src/components/finances/ExpenseCard.tsx` — cambio principal: soporta un modo de edición inline con inputs, select y botones de guardar/cancelar, además del modo de solo lectura actual.
  - `frontend/src/pages/finances/ExpensesView.tsx` — gestiona el estado de edición (`editingExpenseId`, `editState`), quita la apertura del modal para "Editar" (mantiene el modal solo para "Nuevo gasto"), pasa las tarjetas de crédito (`useCreditCards()`) como prop a cada `ExpenseCard` para poblar el select sin refetch por card.
  - `frontend/src/components/finances/ExpenseForm.tsx` — sin cambios de código; sigue usándose únicamente para creación (`editing == null` deja de existir como caso de uso del modal, pero el componente no cambia su firma).
  - No hay cambios en `frontend/src/types/index.ts`, `frontend/src/hooks/finances/useExpenses.ts`, `frontend/src/services/finances/expenses.service.ts`, ni en `frontend/src/hooks/finances/useCreditCards.ts` (ya existe y ya se usa en `ExpenseForm.tsx`).

- **Backend:** sin impacto.

- **Base de datos:** sin impacto.

## Fases de implementación

### Fase 1 — Adaptar `ExpenseCard` para soportar modo edición inline

- [ ] Editar `frontend/src/components/finances/ExpenseCard.tsx`:
  - Extender `Props` para recibir: `isEditing: boolean`, `editDisabled: boolean` (true cuando otra card distinta está en edición, para deshabilitar los botones de esta card), `creditCards: CreditCard[]` (lista ya cargada, para el `<select>`), `editState: { description: string; amount: string; date: string; type: ExpenseType; creditCardId: string }`, `onEditStateChange: (patch: Partial<EditState>) => void`, `onStartEdit: (expense: Expense) => void`, `onSaveEdit: (expense: Expense) => void`, `onCancelEdit: () => void`, `isSaving: boolean`.
  - Importar `ExpenseType` (valor, no solo tipo) desde `../../types` para poblar el `<select>` de tipo, igual que en `ExpenseForm.tsx`.
  - Cuando `isEditing` es `true`, renderizar un layout alternativo dentro del mismo contenedor raíz (mismo `border`/`rounded-lg`/`padding`, con fondo distintivo `bg-blue-50 dark:bg-blue-900/10` igual que la fila editable de `BudgetDetailView.tsx` línea 271):
    - Input de texto para `description` (ancho completo, `autoFocus`).
    - Fila con `grid grid-cols-2 sm:grid-cols-4 gap-2`: input `number` para `amount`, input `date` para `date`, `select` para `type` (opciones desde `TYPE_LABELS`, ya definido en el archivo), `select` para `creditCardId` (opción "Sin tarjeta" + `creditCards.map(...)`, mismo patrón que `ExpenseForm.tsx` líneas 98-103).
    - Fila de acciones alineada a la derecha con los botones ✓ (guardar, invoca `onSaveEdit(expense)`) y ✗ (cancelar, invoca `onCancelEdit()`), reutilizando los mismos SVG de check/cancel que `BudgetDetailView.tsx` (líneas 312-314 y 322-323).
    - Botón guardar deshabilitado si `isSaving`, o `editState.description.trim() === ''`, o `Number(editState.amount) <= 0`, o `editState.date === ''` (mismo criterio de validación mínima que `saveEditing`/render condicional en `BudgetDetailView.tsx`).
  - Cuando `isEditing` es `false` (modo lectura actual, sin cambios de contenido): el botón "Editar" pasa a llamar `onStartEdit(expense)` en vez de `onEdit(expense)`; el botón "Editar" y el botón "Eliminar" quedan `disabled={editDisabled}` (mismo patrón `disabled={!!editingItemId}` de `BudgetDetailView.tsx` líneas 347 y 357). El botón "Eliminar" ya no se oculta condicionalmente en este modo (solo se oculta cuando la propia card entra en modo edición, lo cual ocurre naturalmente al renderizar el layout alternativo sin ese botón).
  - Quitar la prop `onEdit` (ya no se usa; se reemplaza por `onStartEdit`). Mantener `onDelete` sin cambios.

### Fase 2 — Actualizar `ExpensesView` para manejar el estado de edición inline

- [ ] Editar `frontend/src/pages/finances/ExpensesView.tsx`:
  - Importar `useCreditCards` desde `../../hooks/finances/useCreditCards` y obtener `const { data: creditCards = [] } = useCreditCards();`.
  - Reemplazar el estado `editing: Expense | null` (usado hoy para el modal de edición) por:
    - `editingExpenseId: string | null`
    - `editState: { description: string; amount: string; date: string; type: ExpenseType; creditCardId: string }`
  - Agregar funciones (mismo patrón que `startEditing` / `cancelEditing` / `saveEditing` de `BudgetDetailView.tsx` líneas 54-77):
    - `startEditing(expense: Expense)`: setea `editingExpenseId` y `editState` inicial a partir del gasto (`amount` y `date` como string, `creditCardId: expense.creditCard?.id ?? ''`).
    - `cancelEditing()`: limpia `editingExpenseId`.
    - `saveEditing(expense: Expense)`: construye un `UpdateExpenseDto` incluyendo solo los campos de `editState` que difieren del `expense` original (comparando `amount`/`date`/`description`/`type` y `creditCardId` vs `expense.creditCard?.id ?? ''`, mapeando `''` → `undefined`/`null` al armar el DTO); si hay cambios, llama a `update({ id: expense.id, dto })`; siempre limpia `editingExpenseId` al final.
  - Quitar `openEdit(expense)` (ya no se usa) y quitar el caso `editing` del modal: el `Modal` + `ExpenseForm` queda condicionado solo a `modalOpen` para creación (`openCreate` sigue igual, ya no setea `editing`).
  - Simplificar `handleSubmit` para que solo maneje creación (`await create(dto); closeModal();`), ya que la edición ahora pasa por `saveEditing`, no por el submit del formulario del modal.
  - Actualizar el `<Modal title=... >` para que el título sea siempre `'Nuevo gasto'` (ya no hay caso de edición vía modal); si `ExpenseForm` deja de recibir `initial`, quitar esa prop de la invocación.
  - Al renderizar `ExpenseCard` en el `.map`, pasar las nuevas props: `isEditing={editingExpenseId === expense.id}`, `editDisabled={editingExpenseId !== null && editingExpenseId !== expense.id}`, `creditCards={creditCards}`, `editState={editingExpenseId === expense.id ? editState : /* valor por defecto, no se usa mientras no está en edición */}`, `onEditStateChange={(patch) => setEditState((s) => ({ ...s, ...patch }))}`, `onStartEdit={startEditing}`, `onSaveEdit={saveEditing}`, `onCancelEdit={cancelEditing}`, `isSaving={isUpdating && editingExpenseId === expense.id}`. Quitar la prop `onEdit={openEdit}`.
  - Confirmar que `ConfirmDialog` de eliminación sigue funcionando igual (sin cambios), y que se deshabilita implícitamente durante edición porque el botón "Eliminar" de la card en edición no se renderiza y el de las demás cards queda `disabled`.

### Fase 3 — Verificación visual y de estados

- [ ] Verificar en `frontend/DESIGN.md` que los colores usados (`bg-blue-50 dark:bg-blue-900/10` para el fondo de edición, tokens de inputs/`select`) sean consistentes con el resto del sistema de diseño; ajustar si hay una clase semántica más apropiada ya definida.
- [ ] Probar manualmente responsive: en pantallas angostas, la card en modo edición debe apilar los campos legiblemente (grid `grid-cols-2` en mobile, `sm:grid-cols-4` en desktop, tal como se definió en Fase 1) sin overflow horizontal.
- [ ] Confirmar que abrir el modo edición en una card mientras otra ya está en edición no es posible (botones deshabilitados) y que cancelar/guardar libera correctamente el `editingExpenseId` para poder editar otra card después.

## Criterios de aceptación

- Al hacer clic en "Editar" sobre una card de gasto, la card se transforma en un formulario en línea (sin modal) con inputs para descripción, monto, fecha, tipo y tarjeta.
- El usuario puede guardar los cambios con el botón ✓, lo que dispara `PATCH /finances/expenses/:id` solo con los campos modificados, y la card vuelve a modo lectura con los datos actualizados.
- El usuario puede cancelar la edición con el botón ✗ sin persistir cambios, y la card vuelve a mostrar los datos originales.
- Mientras una card está en edición, su botón "Eliminar" no está visible, y los botones "Editar"/"Eliminar" de las demás cards están deshabilitados.
- El botón "Nuevo gasto" sigue abriendo el modal con `ExpenseForm` para crear un gasto nuevo, sin cambios de comportamiento.
- Un gasto puede editarse inline para quitarle la tarjeta asociada (seleccionando "Sin tarjeta") o para asignarle una tarjeta distinta.
- El botón guardar (✓) está deshabilitado si la descripción está vacía, el monto es ≤ 0, o la fecha está vacía.

## Pruebas e2e

No aplica — este spec es exclusivamente de frontend/UI. Las pruebas se documentan como casos manuales en `docs/testing/test-019-edicion-inline-gastos.md` una vez finalizada la implementación, siguiendo el flujo definido en `CLAUDE.md` (estado `[TESTING]` → casos aprobados por el usuario → `[DONE]`).

## Decisiones confirmadas por el usuario

1. Las tarjetas se cargan una vez en `ExpensesView` con `useCreditCards()` y se pasan como prop a cada `ExpenseCard`.
2. Solo una card puede estar en edición inline a la vez (mismo comportamiento que `BudgetDetailView`).
3. La validación en modo inline es manual simple (deshabilitar guardar si campos vacíos/inválidos), sin React Hook Form/Zod.
