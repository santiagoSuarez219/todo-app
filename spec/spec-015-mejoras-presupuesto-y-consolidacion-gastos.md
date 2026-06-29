# spec-015 — [IN PROGRESS] Mejoras al presupuesto y consolidación de gastos mensuales

## Contexto

El módulo de finanzas tiene un sistema de presupuesto mensual funcional, pero con tres fricciones identificadas durante el uso:

1. Los ítems del presupuesto no se pueden editar una vez creados — solo eliminar y volver a crear.
2. El resumen por tipo ya muestra el porcentaje sobre el ingreso del mes, pero la funcionalidad estaba pendiente de verificación de UX.
3. No existe una vista consolidada del gasto real del mes: el presupuesto (gastos fijos planificados) y los gastos variables (`expenses`) son entidades separadas sin ningún punto de unión.

Este spec resuelve las tres fricciones de manera cohesiva.

## Alcance

- Edición inline de ítems del presupuesto (tipo, monto, descripción) directamente en la card.
- Verificar y ajustar el resumen por tipo con porcentaje sobre ingreso del mes (ya implementado en backend; revisar UX).
- Nuevo endpoint backend que consolida gastos del mes: `budget items` (fijos) + `expenses` (variables).
- Sección de resumen de gastos totales del mes en `BudgetDetailView`, distinguiendo fijos vs variables.

### Lo que NO incluye

- Edición inline de `expenses` (gastos variables) — queda para un spec futuro.
- Gráficas o visualizaciones avanzadas.
- Comparativa entre meses.
- Relación con cuentas bancarias.

## Impacto en el sistema

- **Backend:**
  - Nuevo endpoint `PATCH /finances/budgets/:budgetId/items/:itemId` con `UpdateBudgetItemDto`.
  - Nuevo endpoint `GET /finances/monthly-summary` con query params `year` y `month` — devuelve totales consolidados.
- **Frontend:**
  - Nuevo hook `useUpdateBudgetItem` y función de servicio correspondiente.
  - Nuevo tipo `UpdateBudgetItemDto` en `types/index.ts`.
  - UI de edición inline en la tabla de ítems de `BudgetDetailView`.
  - Nuevo hook `useMonthlyExpenseSummary` y servicio para el endpoint de consolidado.
  - Sección de consolidado en `BudgetDetailView`.

## Fases de implementación

### Fase 1 — Edición de ítems (backend)

- [x] Crear `backend/src/finances/dto/update-budget-item.dto.ts` — `PartialType` de `CreateBudgetItemDto` con campos opcionales: `description`, `plannedAmount`, `type`.
- [x] Agregar endpoint `PATCH /finances/budgets/:budgetId/items/:itemId` en `BudgetsController`.
- [x] Implementar método `updateItem(budgetId, itemId, dto)` en `BudgetsService` — verificar que el ítem pertenece al presupuesto antes de actualizar.

### Fase 2 — Consolidado mensual (backend)

- [x] Crear `backend/src/finances/dto/monthly-summary-query.dto.ts` — `year: number` y `month: number`, ambos requeridos.
- [x] Crear interfaz de respuesta `MonthlySummary` en `budgets.service.ts`:
  ```ts
  interface MonthlySummary {
    year: number;
    month: number;
    budgetTotal: number;       // suma de plannedAmount de budget_items del presupuesto del mes
    expensesTotal: number;     // suma de amount de expenses del mes
    combinedTotal: number;     // budgetTotal + expensesTotal
    budgetId: string | null;   // id del presupuesto si existe, null si no
  }
  ```
- [x] Agregar endpoint `GET /finances/monthly-summary` en `BudgetsController`, delegando a `BudgetsService`.
- [x] Implementar `getMonthlySummary(year, month)` en `BudgetsService` — consulta `budget_items` (a través del presupuesto del mes) y `expenses` filtrando por año/mes sobre `date`.

### Fase 3 — Edición inline (frontend)

- [ ] Agregar `UpdateBudgetItemDto` en `frontend/src/types/index.ts` — `Partial<Pick<BudgetItem, 'description' | 'plannedAmount' | 'type'>>`.
- [ ] Agregar función `updateBudgetItem(budgetId, itemId, dto)` en `frontend/src/services/finances/budgets.service.ts`.
- [ ] Agregar hook `useUpdateBudgetItem()` en `frontend/src/hooks/finances/useBudgets.ts` — invalida `['budgets']` en `onSuccess`.
- [ ] Modificar `BudgetDetailView` para soportar edición inline por fila:
  - Botón de lápiz en cada fila que activa el modo edición de esa fila.
  - En modo edición: `description` como `<input text>`, `plannedAmount` como `<input number>`, `type` como `<select>` con los valores de `ExpenseType`.
  - Botones de guardar (✓) y cancelar (✗) inline, sin modal.
  - El botón de eliminar se oculta mientras una fila está en modo edición.
  - Al guardar, llamar a `useUpdateBudgetItem` y volver al modo lectura.

### Fase 4 — Consolidado mensual (frontend)

- [ ] Agregar tipo `MonthlySummary` en `frontend/src/types/index.ts`.
- [ ] Agregar función `getMonthlyExpenseSummary(year, month)` en `frontend/src/services/finances/budgets.service.ts`.
- [ ] Agregar hook `useMonthlyExpenseSummary(year, month)` en `frontend/src/hooks/finances/useBudgets.ts`.
- [ ] Agregar sección "Gastos del mes" en `BudgetDetailView` debajo del resumen por tipo:
  - Fila "Presupuesto (fijos)" → `budgetTotal` en COP
  - Fila "Gastos variables" → `expensesTotal` en COP
  - Fila total resaltada → `combinedTotal` en COP
  - Si `totalIncome > 0`, mostrar el porcentaje de `combinedTotal / totalIncome` en la fila de total.
  - Si no hay gastos variables ese mes, mostrar la sección igualmente con `expensesTotal = 0`.

## Criterios de aceptación

- El usuario puede editar la descripción, el monto y el tipo de un ítem directamente en la tabla, sin abrir un modal.
- Al guardar un ítem editado, la tabla se actualiza inmediatamente (React Query invalida la query).
- El resumen por tipo muestra el porcentaje de cada tipo sobre el ingreso del mes cuando `totalIncome > 0`.
- En la vista de detalle de un presupuesto, el usuario puede ver el total combinado de gastos del mes (presupuesto + gastos variables).
- Los totales de la sección consolidada son correctos: si hay un presupuesto de $1.000.000 y gastos variables de $500.000, el total combinado es $1.500.000.
- Si no existe un presupuesto para ese mes/año, `GET /finances/monthly-summary` devuelve `budgetTotal: 0` y `budgetId: null`.

## Pruebas e2e (si aplica)

No aplican pruebas e2e automatizadas para este spec. Los criterios de aceptación se verificarán manualmente.
