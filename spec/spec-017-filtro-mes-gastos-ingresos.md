# spec-017 — [DONE] Filtro por mes en gastos e ingresos

## Contexto

Las vistas de Gastos e Ingresos muestran todos los registros sin ningún filtro temporal, lo
que hace difícil revisar un mes en particular cuando hay muchos registros acumulados.
El patrón de filtro por año/mes ya existe en Presupuestos (`BudgetsQueryDto`) y puede
replicarse de forma consistente.

Adicionalmente, se detectó un bug en la card de presupuestos de `BudgetsView`: muestra
"0 ítems" y "$0" aunque el presupuesto tenga ítems registrados. La causa es que
`BudgetsService.findAll()` no carga la relación `items` (falta `leftJoinAndSelect`).

## Alcance

- Corrección del bug: cargar ítems en `BudgetsService.findAll()`.
- Nuevo query param `year` y `month` en `GET /finances/expenses`.
- Nuevo query param `year` y `month` en `GET /finances/incomes`.
- UI de filtro en `ExpensesView` e `IncomesView` (selects de mes y año, mes actual por defecto).

### Lo que NO incluye

- Filtro por tipo/categoría.
- Agrupación o totales en la vista de gastos/ingresos.
- Paginación explícita en la UI (sigue usando el limit por defecto).

## Impacto en el sistema

- **Backend:**
  - `budgets.service.ts` — agregar `leftJoinAndSelect` en `findAll`.
  - `dto/expenses-query.dto.ts` (nuevo) — `year` y `month` opcionales.
  - `expenses.service.ts` — `findAll` acepta `year?` y `month?`, filtra con QueryBuilder.
  - `expenses.controller.ts` — usa `ExpensesQueryDto` en lugar de `PaginationDto`.
  - `dto/incomes-query.dto.ts` (nuevo) — igual que `ExpensesQueryDto`.
  - `incomes.service.ts` — igual que `ExpensesService`.
  - `incomes.controller.ts` — usa `IncomesQueryDto`.
- **Frontend:**
  - `services/finances/expenses.service.ts` — agrega `year?` y `month?`.
  - `services/finances/incomes.service.ts` — igual.
  - `hooks/finances/useExpenses.ts` — acepta y pasa `year` y `month`.
  - `hooks/finances/useIncomes.ts` — igual.
  - `pages/finances/ExpensesView.tsx` — selects de mes y año en el header.
  - `pages/finances/IncomesView.tsx` — igual.

## Fases de implementación

### Fase 1 — Bug fix (backend)

- [x] En `BudgetsService.findAll()`, agregar `.leftJoinAndSelect('budget.items', 'items')`
  antes de aplicar los filtros opcionales.

### Fase 2 — Filtro por mes en backend

- [x] Crear `backend/src/finances/dto/expenses-query.dto.ts` extendiendo `PaginationDto`
  con `year?: number` y `month?: number` (mismo patrón que `BudgetsQueryDto`).
- [x] Crear `backend/src/finances/dto/incomes-query.dto.ts` con la misma estructura.
- [x] Modificar `ExpensesService.findAll()` para aceptar `year?` y `month?` y filtrar
  con `EXTRACT(month FROM expense.date)` / `EXTRACT(year FROM expense.date)`.
- [x] Modificar `ExpensesController.findAll()` para usar `ExpensesQueryDto`.
- [x] Modificar `IncomesService.findAll()` — igual que Expenses.
- [x] Modificar `IncomesController.findAll()` — igual.

### Fase 3 — Filtro por mes en frontend

- [x] Modificar `services/finances/expenses.service.ts`: `getExpenses(params?, year?, month?)`.
- [x] Modificar `services/finances/incomes.service.ts`: igual.
- [x] Modificar `hooks/finances/useExpenses.ts`: `useExpenses(params?, year?, month?)`.
- [x] Modificar `hooks/finances/useIncomes.ts`: igual.
- [x] Modificar `pages/finances/ExpensesView.tsx`: agregar estado `filterMonth` y
  `filterYear` (mes y año actuales como default), selects en el header, pasarlos al hook.
- [x] Modificar `pages/finances/IncomesView.tsx`: igual.

## Criterios de aceptación

- En la vista de presupuestos, las cards muestran el número real de ítems y el total
  en COP correctamente.
- El usuario puede filtrar gastos por mes y año desde `ExpensesView`.
- El usuario puede filtrar ingresos por mes y año desde `IncomesView`.
- Al cambiar el filtro, la lista se actualiza inmediatamente.
- Si no hay registros para el mes seleccionado, se muestra el estado vacío.
- El filtro inicializa en el mes y año actuales.

## Pruebas manuales

Ver `docs/testing/test-017-filtro-mes-gastos-ingresos.md`.
