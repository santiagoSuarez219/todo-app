# spec-035 — [TESTING] Unificación de presupuesto y gastos

> Estado inicial obligatorio: `[NOT STARTED]`.
> Actualizar a `[IN PROGRESS]`, `[TESTING]` o `[DONE]` según avance.

## Contexto

Hoy el dominio financiero tiene **dos entidades gemelas que representan lo mismo**:

- `BudgetItem` (`budget_items`) — un gasto **planeado**: `description`,
  `plannedAmount`, `type` (`ExpenseType`), colgando de un `Budget` (mes/año).
- `Expense` (`expenses`) — un gasto **real**: `description`, `amount`, `date`,
  `type` (el mismo `ExpenseType`), `creditCard`.

Comparten enum, comparten semántica y no comparten nada más: no hay FK entre
ellas, ni conciliación, ni forma de decir "este gasto real corresponde a este
ítem que había planeado". El spec-015 intentó cerrar la brecha con
`getMonthlySummary()`, pero se limitó a **sumar** ambos mundos
(`budgetTotal + expensesTotal = combinedTotal`).

Esa suma tiene un defecto de fondo: **si el usuario planea "Arriendo" en el
presupuesto y además registra el gasto real cuando lo paga, el mes lo cuenta
dos veces.** El único modo de evitarlo hoy es no registrar el gasto real, con lo
que el presupuesto deja de reflejar lo que de verdad pasó. El propio spec-026
dejó fuera de alcance, explícitamente, la *"conciliación automática entre el
`BudgetItem` de cuota y un `Expense` real de ese mes"*.

Este spec elimina la dualidad de raíz: **un presupuesto es un conjunto de
gastos**. Sobrevive una sola entidad, `Expense`, que lleva plan y ejecución en
la misma fila.

## Alcance

### Incluye

- Fusión de `BudgetItem` en `Expense`: `plannedAmount` en la misma fila que
  `amount` y `date`, ambos pasan a nullable.
- FK `Expense.budget` (nullable) — el presupuesto como contenedor de gastos.
- Eliminación de la entidad y la tabla `budget_items`, y de sus tres endpoints.
- Migración TypeORM con traslado íntegro de datos, incluido el vínculo con
  deudas (`debtId` + `installmentNumber`).
- Anclaje temporal por presupuesto y auto-vínculo al crear un gasto.
- Rediseño de los agregados: planeado vs ejecutado vs varianza, sin doble conteo.
- Portado de toda la maquinaria de cuotas de deuda (spec-026) a `Expense`.
- Fase de MCP: eliminación de las tres tools `*_budget_item`, nuevo contrato de
  `get_monthly_expense_summary`, y `creditCardId` expuesto por primera vez.
- Rediseño de `BudgetDetailView` a una tabla de plan vs real con acción
  "Registrar ejecución".

### No incluye

- **Los `Income` no se tocan.** Siguen anclados solo por su `date`; unificarlos
  con el presupuesto sería otro spec.
- Intereses, mora o refinanciación de deudas (fuera desde spec-026).
- Gráficas, comparativas entre meses o proyecciones.
- Conciliación difusa (emparejar automáticamente un gasto real suelto con un
  planeado por descripción o monto similar). Aquí la relación es explícita: es
  la misma fila.
- Relación entre gastos y cuentas bancarias (`Account` sigue desconectada).
- Compatibilidad hacia atrás de los contratos rotos (ver "Decisiones tomadas", 7).

## Impacto en el sistema

### Backend (`backend/src/`)

| Archivo | Cambio |
|---|---|
| `finances/entities/expense.entity.ts` | + `plannedAmount`, `budget`, `debt`, `installmentNumber`; `amount` y `date` pasan a nullable |
| `finances/entities/budget.entity.ts` | `items` → `expenses` (sin `cascade`); conserva `UQ_budgets_month_year` |
| `finances/entities/budget-item.entity.ts` | **Eliminado** |
| `finances/dto/create-expense.dto.ts` | `amount`/`date` opcionales; + `plannedAmount`, `budgetId`; validación cruzada |
| `finances/dto/update-expense.dto.ts` | Sigue `PartialType`; la validación cruzada se evalúa sobre el estado resultante |
| `finances/dto/expenses-query.dto.ts` | + `budgetId`, `planned`, `executed`; `year`/`month` cambian de semántica |
| `finances/dto/create-budget.dto.ts` | − `items` (el presupuesto nace vacío) |
| `finances/dto/{create,update}-budget-item.dto.ts` | **Eliminados** |
| `finances/expenses.service.ts` | Auto-vínculo, helper de alcance mensual, `duplicate` tolerante a plan-only, `ORDER BY ... NULLS LAST` |
| `finances/budgets.service.ts` | − `addItem`/`updateItem`/`removeItem`/`computeTypeSummary`; rediseño de `findOne`, `findAll`, `getMonthlySummary`, `duplicate`, `remove` |
| `finances/debts.service.ts` | Portado íntegro de `BudgetItem` → `Expense` (7 métodos) |
| `finances/budgets.controller.ts` | − 3 handlers de items; Swagger actualizado |
| `finances/expenses.controller.ts` | Swagger actualizado (plan vs ejecución, auto-vínculo) |
| `finances/finances.module.ts` | − `BudgetItem` de `forFeature` |
| `mcp/mcp.service.ts` | Ver Fase 6 |
| `migrations/` | 1 migración nueva (Fase 1) |

### Frontend (`frontend/src/`)

| Archivo | Cambio |
|---|---|
| `types/index.ts` | − `BudgetItem`, `CreateBudgetItemDto`, `UpdateBudgetItemDto`; `Expense`, `Budget`, `MonthlySummary`, `CardTotal`, `DuplicateBudgetResult` con shape nuevo |
| `services/finances/budgets.service.ts` | − `addBudgetItem`, `updateBudgetItem`, `deleteBudgetItem` |
| `services/finances/expenses.service.ts` | `getExpenses` acepta `budgetId` y flags de plan/ejecución |
| `hooks/finances/useBudgets.ts` | − `useAddBudgetItem`, `useUpdateBudgetItem`, `useDeleteBudgetItem` |
| `hooks/finances/useExpenses.ts` | Todas las mutations invalidan también `['budgets']` |
| `pages/finances/BudgetDetailView.tsx` | Cambio mayor: tabla plan vs real, acción "Registrar ejecución", 3 bloques de resumen rediseñados |
| `pages/finances/BudgetsView.tsx` | `items.length` → `expenses`; total desde el backend |
| `pages/finances/ExpensesView.tsx` | + `plannedAmount` en edición inline, filtro plan/ejecutado |
| `components/finances/BudgetItemForm.tsx` | **Eliminado** → `PlannedExpenseForm.tsx` (o modo `planned` de `ExpenseForm`) |
| `components/finances/ExpenseForm.tsx` | `amount`/`date` opcionales en Zod; + `plannedAmount` |
| `components/finances/ExpenseCard.tsx` | Tolerar `amount`/`date` nulos; mostrar plan y real |
| `components/finances/DuplicateBudgetForm.tsx` | Corregir el texto: solo se copia el plan |

### Base de datos

Migración obligatoria (`synchronize: false` siempre en este proyecto):
`1787100000000-UnifyBudgetItemsIntoExpenses.ts` — altera `expenses`, traslada los
datos de `budget_items`, hace backfill de `budgetId` y elimina `budget_items`.

## Decisiones tomadas

> Decisiones del usuario tomadas al redactar este spec. No se re-litigan durante
> la implementación; si alguna debe cambiar, se actualiza el spec primero.

1. **Una sola entidad con plan y ejecución.** Sobrevive `Expense` con
   `plannedAmount` (nullable), `amount` (pasa a nullable) y `date` (pasa a
   nullable). `BudgetItem` se elimina.
2. **`Budget` sobrevive con metadatos** (`id`, `name`, `month`, `year`). Ya no
   tiene ítems propios: su contenido son los `Expense` que lo referencian.
3. **Manda el presupuesto sobre la fecha.** Un gasto pertenece al mes de su
   `budget`, sin importar su `date`. Solo si `budgetId` es null se ubica por
   `date`. Consecuencia aceptada: un gasto planeado en junio y pagado el 2 de
   julio **cuenta en junio**, y al filtrar gastos por julio **no aparece**.
4. **Auto-vínculo, sin auto-creación.** Al crear un gasto con `date` en un mes
   que ya tiene presupuesto, el backend le asigna ese `budgetId`. Si el mes no
   tiene presupuesto, el gasto queda suelto y aun así aparece en el resumen de
   ese mes por su `date`. Nunca se crea un presupuesto automáticamente desde un
   gasto (a diferencia de las cuotas de deuda, que sí lo hacen desde spec-026).
5. **Duplicar un mes copia solo el plan.** Los gastos se copian con su
   `plannedAmount`; `amount` y `date` quedan en null en el destino. Cambio de
   comportamiento observable respecto del spec-020, que hoy recrea también los
   gastos ejecutados con fecha desplazada.
6. **Duplicar un gasto suelto copia todo.** `duplicate_expense` /
   `POST /expenses/:id/duplicate` sigue clonando el gasto tal cual, incluidos
   `amount` y `date` desplazados. Asimetría deliberada con el punto 5: duplicar
   un mes es planificar, duplicar un gasto es clonar un hecho.
7. **Corte limpio de contratos, sin capa de compatibilidad.** Desaparecen
   `budgetTotal`, `expensesTotal` y `combinedTotal` del endpoint
   `GET /finances/budgets/monthly-summary` y de la tool
   `get_monthly_expense_summary`. La app es monousuario con un solo cliente, que
   se migra en este mismo spec.
8. **Migración completa, sin pérdida.** Todos los `budget_items` existentes pasan
   a `expenses` preservando su `id`, su vínculo con el presupuesto y con las
   deudas. Los gastos preexistentes reciben `budgetId` por backfill según el mes
   de su `date`.
9. **Se eliminan las tools `add_budget_item` / `update_budget_item` /
   `delete_budget_item`.** Quedan cubiertas por `create_expense` /
   `update_expense` / `delete_expense` con `plannedAmount` + `budgetId`.
   Eliminación confirmada explícitamente por el usuario (requisito de CLAUDE.md
   para retirar una tool activa); los únicos consumidores conocidos son los
   system prompts de este repo, actualizados en la misma fase.
10. **`creditCardId` se expone en el MCP.** `create_expense` y `update_expense`
    pasan a aceptarlo. Cierra un hueco actual: el desglose por tarjeta del
    spec-018 existe en la UI, pero el agente no podía alimentarlo.
11. **El presupuesto nace vacío.** `CreateBudgetDto` pierde el array `items`
    anidado; los gastos se agregan después vía `POST /finances/expenses`. Una
    sola forma de crear un gasto.
12. **Borrar un presupuesto borra sus gastos en cascada**, incluidos los ya
    ejecutados.
    > ⚠️ **Advertencia registrada.** Esta opción destruye historial real: hoy los
    > gastos ejecutados sobreviven a la eliminación de un presupuesto porque
    > viven fuera de él. Decisión conscientemente tomada por el usuario por
    > coherencia con "el presupuesto es el conjunto de gastos". Mitigación
    > obligatoria (Fase 8): el `ConfirmDialog` de borrado debe indicar
    > explícitamente **cuántos gastos ejecutados** se perderán y por qué monto
    > total, no un mensaje genérico.
13. **`POST /debts/:id/sync-budget-items` conserva su ruta.** Solo se renombra la
    implementación interna, para no ampliar el blast radius al frontend.

## Evaluación MCP

**¿Aplica MCP?** Sí — el cambio rompe el contrato de tools ya existentes en
`todo-api` y elimina el concepto "ítem de presupuesto" que hoy exponen.

- **MCP existente a modificar:** `todo-api` (`backend/src/mcp/mcp.service.ts`).
  No se crea un MCP nuevo: el dominio ya vive ahí y la unificación es
  estructural, no un dominio distinto.
- **System prompt afectado:** `docs/mcps/finanzas-personales.system-prompt.md`
  (reescritura significativa) y la nota de inventario en `docs/mcps/README.md`.
  `docs/mcps/asistente-personal.system-prompt.md` **no requiere cambios**:
  verificado por lectura completa, no menciona `budgets`, `expenses` ni finanzas
  en ningún flujo.
- **Fase de MCP en este spec:** Fase 6 (después de la migración y del backend,
  antes de las pruebas, para que `@tester` valide también las tools).

### Tools afectadas

| Tool | Línea | Cambio |
|---|---|---|
| `add_budget_item` | :1527 | **Eliminada** |
| `update_budget_item` | :1547 | **Eliminada** |
| `delete_budget_item` | :1568 | **Eliminada** |
| `create_expense` | :849 | + `plannedAmount`, `budgetId`, `creditCardId`; `amount`/`date` opcionales con `.refine()` |
| `update_expense` | :869 | Idem, validando el estado resultante |
| `list_expenses` | :784 | + filtros `budgetId` y `status`; `year`/`month` con anclaje por presupuesto |
| `get_expense` | :836 | Shape de salida con plan, ejecución y `executionStatus` |
| `get_budget` | :1456 | `items` → `expenses`; `typeSummary` → `byType` |
| `create_budget` | :1469 | − array `items` |
| `get_monthly_expense_summary` | :1586 | **Contrato roto**: nuevo shape (abajo) |
| `duplicate_budget` | :1601 | Copia solo el plan; contadores nuevos |
| `duplicate_expense` | :902 | Tolera origen plan-only |

### Nuevo contrato de `get_monthly_expense_summary`

```jsonc
{
  "year": 2026, "month": 8,
  "budgetId": "uuid | null",
  "totalIncome": 5000000,
  "plannedTotal": 3500000,        // SUM(plannedAmount) del mes
  "executedTotal": 2100000,       // SUM(amount) del mes
  "variance": 1400000,            // plannedTotal - executedTotal
  "pendingPlannedTotal": 1400000, // SUM(plannedAmount) WHERE amount IS NULL
  "unplannedTotal": 300000,       // SUM(amount) WHERE plannedAmount IS NULL
  "byType": [ { "type": "basico", "planned": 0, "executed": 0, "variance": 0,
                "plannedPct": 0, "executedPct": 0 } ],
  "cardTotals": [ { "creditCardId": "uuid", "name": "string",
                    "planned": 0, "executed": 0 } ]
}
```

### Mitigación del riesgo de ambigüedad para el agente

Con `amount` y `date` nullable, un agente podría crear gastos a medias. Reglas
obligatorias, declaradas en el **schema Zod** (`.refine()`), no solo en la
descripción textual:

- `create_expense` exige **al menos uno** de: `plannedAmount`, o (`amount` **y**
  `date` juntos). Nunca un gasto sin ningún monto.
- `amount` y `date` van siempre juntos: no existe "ejecutado sin fecha", ni al
  crear ni al actualizar (se valida sobre el estado resultante, no sobre el dto).
- La descripción de la tool nombra los tres estados válidos: `planned`,
  `executed`, `settled`.
- El system prompt gana una regla: ante una petición ambigua ("agrega 200 mil de
  streaming"), el agente pregunta si es un gasto ya realizado o uno planeado,
  en vez de asumir.

## Semántica derivada

El estado de un gasto **no se persiste**: se deriva de qué campos están
presentes. No hay columna de estado que mantener sincronizada.

| Estado | Condición | Significado |
|---|---|---|
| `planned` | `plannedAmount != null` y `amount == null` | Planeado, aún no ejecutado |
| `executed` | `plannedAmount == null` y `amount != null` | Gasto real no presupuestado |
| `settled` | ambos no nulos | Planeado y ya ejecutado |

Se expone como campo calculado `executionStatus` (más `variance = plannedAmount −
amount` cuando aplica) al serializar, para que ni la UI ni el MCP repliquen la
regla.

Invariantes, protegidas por CHECK en base de datos **y** por DTO:

- `CHK_expenses_has_amount` — no pueden ser `plannedAmount` y `amount` ambos
  null (fila vacía sin sentido).
- `CHK_expenses_amount_date_together` — `("amount" IS NULL) = ("date" IS NULL)`.

## Fases de implementación

### Fase 0 — Paquete de pruebas

> Se escribe **junto con el spec**, antes de la aprobación de implementación.
> Arranca en rojo y define la aceptación por adelantado.

- [x] `docs/testing/test-035-unificacion-presupuesto-gastos.md` con casos
      `TC-035-xxx` y `TC-MCP-035-xxx`.
- [x] `backend/test/e2e-035-unificacion-presupuesto-gastos.e2e-spec.ts` en rojo,
      un bloque por criterio de aceptación.
- [x] Revisar `backend/test/e2e-026-deudas-cuotas-en-presupuesto.e2e-spec.ts`:
      sus aserciones sobre `/budgets/:id/items` y `budget.items` deben apuntar a
      `expenses`. Se ajustan en la Fase 4, **sin relajarlas y sin borrarlas**.
- [x] Revisar `backend/test/e2e-023-duplicar-gasto-individual.e2e-spec.ts`.

### Fase 1 — Modelo y migración de datos

**1.1 Entidades**

- [x] `entities/expense.entity.ts`:
  - `plannedAmount` `decimal(12,2)` nullable
  - `amount` `decimal(12,2)` → **nullable**
  - `date` `date` → **nullable**
  - `budget` `ManyToOne → Budget`, nullable, `@JoinColumn({ name: 'budgetId' })`,
    `onDelete: 'CASCADE'` (decisión 12)
  - `debt` `ManyToOne → Debt`, nullable, `onDelete: 'CASCADE'` (de `BudgetItem`)
  - `installmentNumber` `int` nullable (de `BudgetItem`)
  - `creditCard` sin cambios
  - índice único parcial `UQ_expenses_debt_installment` sobre
    `(debtId, installmentNumber) WHERE "debtId" IS NOT NULL` — portado 1:1
  - índice `IDX_expenses_budgetId`
- [x] `entities/budget.entity.ts`: `items: BudgetItem[]` → `expenses: Expense[]`
      (`OneToMany`, **sin `cascade: true`**). Conserva `UQ_budgets_month_year`.
- [x] **Eliminar** `entities/budget-item.entity.ts`.
- [x] `finances.module.ts`: quitar `BudgetItem` de `TypeOrmModule.forFeature`.

**1.2 Migración `1787100000000-UnifyBudgetItemsIntoExpenses.ts`**

`up()`, en este orden exacto:

- [x] `ALTER TABLE "expenses"`: + `plannedAmount numeric(12,2) NULL`,
      `budgetId uuid NULL`, `debtId uuid NULL`, `installmentNumber int NULL`.
- [x] FKs: `budgetId → budgets(id) ON DELETE CASCADE`;
      `debtId → debts(id) ON DELETE CASCADE`.
- [x] `ALTER COLUMN "amount" DROP NOT NULL`; `ALTER COLUMN "date" DROP NOT NULL`.
- [x] Copia `budget_items → expenses` **preservando el `id` original** (ambas PK
      son uuid; conservarlo mantiene estables los IDs que ya circulan por la UI y
      el MCP), con `amount` y `date` en NULL.
- [x] Backfill de `budgetId` en gastos preexistentes por el mes de su `date`,
      con guard `WHERE e."budgetId" IS NULL` para no tocar las filas recién
      insertadas. Los gastos de meses sin presupuesto quedan sueltos.
- [x] Índices `UQ_expenses_debt_installment` e `IDX_expenses_budgetId`.
- [x] CHECKs `CHK_expenses_has_amount` y `CHK_expenses_amount_date_together`.
- [x] `DROP TABLE "budget_items"`.

`down()` — reconstrucción best-effort, **documentar en el encabezado que es
lossy**: recrea `budget_items` desde las filas con `plannedAmount IS NOT NULL`,
y **elimina las filas plan-only** (`amount IS NULL`), que no tienen
representación posible en el esquema anterior. Es un recurso de emergencia
local, no un camino soportado en producción.

- [x] Verificación tras `migration:run`: el conteo de `expenses` con
      `plannedAmount IS NOT NULL` debe igualar el conteo previo de
      `budget_items`, y el de filas con `debtId IS NOT NULL` debe coincidir con
      el previo.

### Fase 2 — Semántica y validación (`expenses.service.ts` + DTOs)

- [x] DTOs según "Semántica derivada": `amount`/`date` opcionales,
      `plannedAmount` y `budgetId` nuevos, validación cruzada de las dos
      invariantes. En `update`, evaluar sobre el **estado resultante**
      (entidad + dto), no solo sobre el dto.
- [x] **Eliminar** `create-budget-item.dto.ts` y `update-budget-item.dto.ts`.
- [x] `expenses-query.dto.ts`: + `budgetId`, `planned`, `executed`.
- [x] **Auto-vínculo** (`create`): si no viene `budgetId` y sí `date`, buscar el
      `Budget` por `(month, year)` derivados de `date` parseando el string
      `YYYY-MM-DD` **por partes, nunca con `new Date()`** (precedente de
      timezone del spec-025 y del bug de `dueDate` en `spec/backlog.md`).
- [x] `update`: si cambia `date` y el gasto no tenía presupuesto, reintentar el
      auto-vínculo. Si ya tenía, **no** se re-ancla por fecha (decisión 3); solo
      un `budgetId` explícito lo cambia. Aceptar `budgetId: null` para desvincular.
- [x] Validar que el `budgetId` recibido existe → `NotFoundException`.
- [x] **Helper compartido `applyMonthScope(qb, year, month)`**, usado por
      `ExpensesService.findAll` y por los agregados de `BudgetsService`:
      pertenece al mes si `budgetId = (budget de ese mes)` **O**
      (`budgetId IS NULL` **Y** `date` cae en ese mes). Reemplaza los filtros por
      `EXTRACT(...)` sueltos de `expenses.service.ts:43-44` y
      `budgets.service.ts:121-128, 201-214, 262-270`.
- [x] `findAll`: `ORDER BY date DESC NULLS LAST, createdAt DESC` — con `date`
      nullable, el `DESC` actual pondría todos los planeados primero.
- [x] `duplicate` (:83-99): hoy asume `date` no nulo en `sourceExpense.date.split('-')`
      (:86) y **rompe con gastos plan-only**. Debe copiar `plannedAmount` y dejar
      `amount`/`date` en null cuando el origen no tiene fecha.

### Fase 3 — Rediseño de los agregados (`budgets.service.ts`)

> ⚠️ Rompe el contrato público de `GET /finances/budgets/monthly-summary`,
> `GET /finances/budgets/:id` y la tool `get_monthly_expense_summary`
> (decisión 7).

- [x] **Eliminar `computeTypeSummary`** (:137-157) — su acumulador único de
      `plannedAmount` + `amount` es la causa del doble conteo. Sustituir por
      `computeTypeBreakdown`, que devuelve por `ExpenseType`:
      `{ type, planned, executed, variance, plannedPct, executedPct }`, con los
      `%` sobre `totalIncome`.
- [x] Nuevo `MonthlySummary` (:33-41) con el shape declarado en "Evaluación MCP".
      Desaparecen `budgetTotal`, `expensesTotal`, `combinedTotal`.
- [x] `cardTotals` (:205-224): `CardTotal` pasa a
      `{ creditCardId, name, planned, executed }`, con el nuevo alcance mensual,
      filtrando `creditCardId IS NOT NULL`, ordenado por `executed DESC`.
- [x] `findOne` (:107-135): `BudgetDetail` expone `expenses: Expense[]` (con
      `creditCard` y `debt` en `leftJoinAndSelect`) + `totalIncome`,
      `plannedTotal`, `executedTotal`, `variance`, `byType`. Ya no `items` ni
      `typeSummary`. `totalIncome` se sigue calculando por `EXTRACT` sobre
      `incomes.date` (los ingresos no entran en este spec).
- [x] `findAll` (:87-105): joins `budget.items`/`items.debt` →
      `budget.expenses`/`expenses.debt`; + `plannedTotal` derivado, para que
      `BudgetsView` deje de recalcularlo en cliente (`BudgetsView.tsx:20`).
- [x] **Eliminar** `addItem` (:170-174), `updateItem` (:176-183),
      `removeItem` (:237-243) y el repositorio `budgetItemsRepository` (:55-56).
- [x] `create` (:64-85): eliminar el bloque de creación anidada de `items`
      (:73-81) — el presupuesto nace vacío (decisión 11).
- [x] `remove` (:165-168): borrado en cascada de todos los gastos del presupuesto
      (decisión 12). El servicio debe **devolver el conteo y el monto total de
      gastos ejecutados eliminados**, para que la UI lo muestre en la
      confirmación (Fase 8).
- [x] `duplicate` (:245-365): copia **solo el plan** (decisión 5).
  - Origen: `Expense` del mes origen con `plannedAmount IS NOT NULL`, excluyendo
    los de deuda (`debt != null`) — se conserva la decisión 9 de spec-026 (:290-292).
  - Destino: `description`, `plannedAmount`, `type`, `creditCard` preservado,
    `budgetId` del destino, `amount`/`date` en **null**.
  - Los `Income` se siguen recreando con `shiftDate` (:307-318). **Se elimina**
    el bloque que recreaba `Expense` ejecutados (:321-333).
  - `DuplicateBudgetResult` → `{ budget, plannedExpensesCopied, incomesCopied }`.
  - Se conserva el guard de conflicto 409 (:249-256).

### Fase 4 — Portado de la maquinaria de deudas (spec-026)

> `debts.service.ts` es el único escritor de la relación con deudas. El porte es
> mecánico pero debe conservar **cada** regla de spec-026.

- [x] Reemplazar `budgetItemsRepository` (:152-153) por `expensesRepository`
      (ya inyectado, :150-151); eliminar el import de `BudgetItem`.
- [x] `findDebtItems` (:531-540) → `findDebtExpenses`, con
      `innerJoinAndSelect('expense.budget','budget')` y `WHERE expense."debtId" = :debtId`.
- [x] `create` (:237-273): cada cuota se materializa como `Expense` con `budget`,
      `description` = `installmentDescription(...)` (:546-552),
      `plannedAmount` = `installmentValue`, `type: PAGO_DEUDA`, `debt`,
      `installmentNumber`, y **`amount`/`date` en null** — una cuota es plan
      hasta que se paga. `findOrCreateBudget` (:516-529) no cambia.
- [x] `update` (:275-343): borrar y recrear solo las cuotas de meses
      **estrictamente futuros** (`isFutureMonth` sobre `expense.budget.year/month`);
      propagar `description` a todas. Guard defensivo por `expense.budget` null.
- [x] `remove` (:350-372): las cuotas **vencidas** quedan con `debt = null` e
      `installmentNumber = null` (siguen siendo gastos planeados válidos); las
      **futuras** se eliminan.
- [x] `payOff` (:379-434): borra las cuotas futuras y crea un `Expense` real
      (`plannedAmount: null`, `amount: remainingValue`, `date: hoy`,
      `type: PAGO_DEUDA`). Debe pasar por el **auto-vínculo** de la Fase 2
      (reutilizar el helper, no duplicar la lógica).
- [x] `syncBudgetItems` (:441-512): idempotencia intacta; el `Set` de
      `installmentNumber` (:470-472) se construye sobre `Expense`. **La ruta
      `POST /debts/:id/sync-budget-items` no cambia** (decisión 13).
- [x] El índice único parcial `(debtId, installmentNumber)` vive ahora en
      `expenses` y sigue protegiendo la idempotencia frente a carreras.
- [x] Actualizar `e2e-026-...` para apuntar a `expenses`, sin relajar aserciones.

### Fase 5 — Endpoints y capa HTTP

| Endpoint | Acción |
|---|---|
| `POST /finances/budgets/:id/items` | **Eliminado** |
| `PATCH /finances/budgets/:budgetId/items/:itemId` | **Eliminado** |
| `DELETE /finances/budgets/:budgetId/items/:itemId` | **Eliminado** |
| `POST /finances/budgets` | Sin array `items` |
| `GET /finances/budgets/:id` | Devuelve `expenses` + totales; ya no `items`/`typeSummary` |
| `GET /finances/budgets` | Cada budget trae `expenses` y `plannedTotal` |
| `GET /finances/budgets/monthly-summary` | **Contrato roto**: shape de la Fase 3 |
| `POST /finances/budgets/:id/duplicate` | Resultado `plannedExpensesCopied` |
| `DELETE /finances/budgets/:id` | Devuelve el conteo de ejecutados eliminados |
| `POST /finances/expenses` | + `plannedAmount`, `budgetId`; `amount`/`date` opcionales |
| `PATCH /finances/expenses/:id` | Idem + reglas de re-anclaje |
| `GET /finances/expenses` | + `budgetId`/`planned`/`executed`; anclaje por presupuesto |
| `POST /finances/expenses/:id/duplicate` | Soporta origen plan-only |
| `POST /finances/debts/:id/sync-budget-items` | Ruta sin cambios |

- [x] `budgets.controller.ts`: quitar los 3 handlers de items y sus imports;
      actualizar Swagger de `findOne`, `findAll`, `getMonthlySummary`, `duplicate`.
- [x] `expenses.controller.ts`: Swagger de `POST`/`PATCH`/`GET` (plan vs
      ejecución, auto-vínculo). Sin rutas nuevas.
- [x] Sin alias ni campos legacy: frontend y MCP se migran en este mismo spec.

### Fase 6 — MCP: actualizar `todo-api`

> Ejecutada por `@mcp-builder`. Va **antes** de las pruebas, para que `@tester`
> valide también las tools.

- [x] `create_expense` / `update_expense`: + `plannedAmount`, `budgetId`,
      `creditCardId`; `amount`/`date` opcionales con `.refine()` de consistencia.
- [x] **Eliminar** `add_budget_item`, `update_budget_item`, `delete_budget_item`
      (decisión 9, confirmada por el usuario).
- [x] Redefinir `get_monthly_expense_summary` con el contrato nuevo.
- [x] `get_budget`: `items` → `expenses`; `typeSummary` → `byType`.
- [x] `list_expenses`: + filtros `budgetId` y `status` (implementado como
      `planned`/`executed`, los nombres reales de `ExpensesQueryDto` — no
      existe un campo `status` en el DTO; ver discrepancia reportada).
- [x] `create_budget`: − array `items`.
- [x] Ajustar descripciones de `duplicate_budget` ("copia solo el plan") y
      `duplicate_expense` ("copia el gasto tal cual, ejecución incluida") — la
      asimetría debe quedar explícita para el agente.
- [x] Evaluar migrar las tools tocadas a `server.registerTool()` con
      `z.object({...}).strict()`, siguiendo el precedente de `create_activity`
      (ver deuda técnica en `spec/backlog.md`). Aplicado a `create_expense`,
      `update_expense` y `create_budget` (las que reciben payload de escritura
      con campos nuevos); el resto de tools tocadas en esta fase son de solo
      lectura/borrado por UUID o cambian solo su descripción, sin payload
      nuevo que valga la pena migrar ahora.
- [x] Reescribir `docs/mcps/finanzas-personales.system-prompt.md`: modelo de
      datos de gastos (incluida la nota de `creditCardId` "no expuesto" que
      deja de ser cierta), bloque `BudgetItem` (eliminado), tabla de tools,
      reglas de presupuestos, proyecciones y flujos frecuentes.
- [x] Actualizar la nota de inventario en `docs/mcps/README.md` — revisada:
      no mencionaba ítems de presupuesto explícitamente, no requirió cambios.
- [x] Verificar por JSON-RPC directo que las tools responden (precedente:
      spec-033), incluidos los casos de `.refine()` fallando con mensaje claro.
      Desbloqueado: usuario levantó Docker. `create_expense` con
      `plannedAmount`/`budgetId`/`creditCardId` verificado end-to-end contra
      `/mcp` (creación real + `get_monthly_expense_summary.cardTotals`
      reflejando el gasto). `create_expense` sin ningún monto verificado
      rechazado: el SDK MCP no propaga el `.refine()` fallido como error de
      protocolo JSON-RPC top-level (a diferencia de lo asumido originalmente
      en el e2e) sino como resultado de tool con `isError: true` y el
      mensaje del `.refine()` en `content[0].text` — misma convención
      ok()/err() que `NotFoundException` (ver nota de e2e-023). Confirmado
      por SQL directo que no crea ninguna fila. `e2e-035` (Fase 0) corregido
      para reflejar el mecanismo real en vez del asumido.

### Fase 7 — Frontend: tipos, servicios y hooks

> No puede empezar antes de que la Fase 5 congele los DTOs reales: los tipos de
> `types/index.ts` copian el backend, nunca se inventan.

- [x] `types/index.ts`: `Expense` (:202-211) gana `plannedAmount`, `budget`,
      `debt`, `installmentNumber`, `executionStatus`; `amount`/`date` pasan a
      nullable. **Eliminar** `BudgetItem` (:339-353), `CreateBudgetItemDto`,
      `UpdateBudgetItemDto`. `Budget` (:361-371): `items` → `expenses`,
      `typeSummary` → `byType`, + `plannedTotal`/`executedTotal`/`variance`.
      `MonthlySummary` (:415-423), `CardTotal` y `DuplicateBudgetResult` con el
      shape nuevo. `CreateBudgetDto` sin `items`.
- [x] `services/finances/budgets.service.ts`: eliminar `addBudgetItem` (:45),
      `updateBudgetItem` (:50), `deleteBudgetItem` (:62).
- [x] `services/finances/expenses.service.ts`: `getExpenses` acepta `budgetId` y
      los flags de plan/ejecución.
- [x] `hooks/finances/useBudgets.ts`: eliminar `useAddBudgetItem` (:55),
      `useUpdateBudgetItem` (:72), `useDeleteBudgetItem` (:81).
- [x] `hooks/finances/useExpenses.ts`: **todas** las mutations invalidan también
      `['budgets']` — hoy solo lo hace `useDuplicateExpense` (:56-62), pero
      ahora un gasto modifica el presupuesto.
- [x] Decidir una **sola fuente** para la lista de gastos del presupuesto:
      el `expenses` embebido en `GET /budgets/:id`, o `GET /expenses?budgetId=`.
      Dos cachés que invalidar sería un bug esperando a pasar.

### Fase 8 — Frontend: UI

> Leer `frontend/DESIGN.md` **antes** de escribir código de esta fase.

- [x] `BudgetDetailView.tsx` (506 líneas) — el cambio mayor:
  - "Resumen por tipo" (:161-200): pasa a **Planeado / Real / Varianza** por
    tipo, conservando el `%` sobre ingresos.
  - "Gastos del mes" (:203-245): las filas `Presupuesto (fijos)` / `Gastos
    variables` / `Total del mes` (:213, :224, :235) se reemplazan por
    `Planeado` / `Ejecutado` / `Varianza`, + `Pendiente por ejecutar` y
    `No presupuestado`. Sin doble conteo.
  - "Total por tarjeta" (:248-270): dos columnas (planeado / ejecutado).
  - Tabla (:273-426): columnas `Descripción` · `Tipo` · `Planeado` · `Real` ·
    `Fecha` · acciones. Fila planeada: `Real`/`Fecha` vacíos y acción
    **"Registrar ejecución"** (rellena `amount` + `date` vía `PATCH`). Fila
    ejecutada sin plan: marcada como "no presupuestado". Conservar el badge
    "Deuda" (:366-373).
  - Edición inline (`EditState` :34-38, `saveEditing` :73-83): de `updateItem` a
    `useUpdateExpense`, con `plannedAmount`, `amount` y `date`.
  - Borrado (:490-503): a `useDeleteExpense`.
  - `total` (:115): desde `budget.plannedTotal`, sin recalcular en cliente.
  - Modal de duplicación (:457-488): `itemsCopied` (:463) →
    `plannedExpensesCopied`; **eliminar la línea de gastos recreados** (:465).
- [x] **`ConfirmDialog` de borrado de presupuesto** (decisión 12): debe indicar
      cuántos gastos **ejecutados** se eliminarán y por qué monto total. No un
      mensaje genérico.
- [x] `BudgetItemForm.tsx`: **eliminar** → `PlannedExpenseForm.tsx` (o modo
      `planned` de `ExpenseForm`), que envía `POST /finances/expenses` con
      `budgetId` + `plannedAmount`.
- [x] `ExpenseForm.tsx`: `amount`/`date` dejan de ser obligatorios en Zod;
      + `plannedAmount` y la validación cruzada.
- [x] `ExpenseCard.tsx` (240 líneas): mostrar plan y real; tolerar
      `date === null` / `amount === null` en el formato de fecha y COP.
- [x] `ExpensesView.tsx`: `EditState` (:20-25) gana `plannedAmount`; filtro
      visible de plan/ejecutado; el filtro mes/año pasa a significar "mes del
      presupuesto o, si no tiene, de la fecha".
- [x] `BudgetsView.tsx`: `computeTotal` (:20) y `budget.items.length` (:106) →
      `expenses`/`plannedTotal`.
- [x] `DuplicateBudgetForm.tsx` (:85): corregir el texto "Se copiarán: N ítems,
      todos los ingresos y gastos del mes" — ahora es solo el plan y los ingresos.

### Fase 9 — Documentación

- [x] `backend/CLAUDE.md`: entidad `Expense`, sección `Budget`/`BudgetItem`,
      lista de migraciones, tabla de rutas de `budgets` (:206-208), "Lógica de
      Negocio → Deudas" y "→ Presupuestos" (:566), tabla de tools MCP.
- [x] `frontend/CLAUDE.md`: sección de finanzas y lista de componentes.
- [x] `spec/backlog.md`: registrar la deuda técnica detectada al portar.

### Fase 10 — Pruebas

- [x] `npm run test` (backend): 110/110 en verde, incluidos los ajustes a
      `expenses.service.spec.ts`, `expenses.service.duplicate.spec.ts` y
      `debts.service.spec.ts` (mocks actualizados al constructor nuevo de
      `ExpensesService`/`DebtsService`, sin relajar ninguna aserción).
- [x] `npm run build` en `backend/` y `frontend/`: ambos sin errores.
- [x] `npx tsc --noEmit` y `npm run lint` (frontend) verificados sin errores
      nuevos atribuibles a este spec (los 4 preexistentes en `Login.tsx` y
      `auth.service.ts` no fueron tocados).
- [x] **Desbloqueado**: usuario levantó Docker (Postgres local, puerto 5433).
      Migración `UnifyBudgetItemsIntoExpenses1787100000000` ejecutada contra
      el entorno local — verificado sin pérdida de datos: 34 gastos con
      `plannedAmount` no nulo migrados desde `budget_items` (tabla eliminada),
      0 gastos con `debtId` en este entorno (no había deudas activas).
      `e2e-035-unificacion-presupuesto-gastos.e2e-spec.ts` corrido contra la
      BD migrada: **32/32 falló → verde**, tras encontrar y corregir:
      - 🔴 **Bug real de backend**: `ExpensesService.findAll()`/`findOne()`
        (`expenses.service.ts:66-69, 92-96`) no hacían
        `leftJoinAndSelect('expense.debt', 'debt')` — `GET /finances/expenses`
        y `GET /finances/expenses/:id` nunca devolvían `debt`/`debtId`, pese a
        que la relación existe en la entidad desde la Fase 1 y
        `budgets.service.ts` sí la unía (`findOne`/`findAll` de presupuestos,
        líneas 106-107 y 131-133) — inconsistencia entre ambos servicios.
        Rompía silenciosamente AC-8 y AC-9 (cualquier consumidor de
        `GET /expenses`, incluida la UI del badge "Deuda" en
        `ExpenseCard.tsx`, no podía identificar el vínculo con la deuda).
        **Corregido**: se agregó el join en ambos métodos.
      - 🟡 Dos aserciones de test con supuestos incorrectos sobre mecanismos
        de la plataforma, no sobre el comportamiento del backend: AC-1
        esperaba `201` con un campo `items` no declarado, cuando
        `ValidationPipe` corre con `forbidNonWhitelisted: true` (`main.ts`) y
        correctamente devuelve `400`; AC-12 esperaba el error de `.refine()`
        de Zod como error de protocolo JSON-RPC top-level, cuando
        `registerTool` del SDK MCP lo devuelve como `isError: true` con el
        mensaje en `content[0].text` (misma convención ok()/err() de
        `NotFoundException`, ver nota de e2e-023) — verificado en vivo que la
        tool rechaza y no crea nada. Ambas aserciones corregidas para
        reflejar el comportamiento real y correcto.
      `e2e-023` y `e2e-026` reejecutados: **22/22 en verde**, sin relajar
      ninguna aserción (la red de seguridad del portado de deudas del spec-026
      queda intacta). `npm run test:e2e` completo: **198/200** — los 2
      restantes (`app.e2e-spec.ts`, `auth.e2e-spec.ts`) son preexistentes y
      ajenos al spec, confirmado corriendo la misma suite sin los cambios de
      este spec (falla igual). Verificación JSON-RPC de las tools MCP: ver
      Fase 6, ítem actualizado arriba.
- [ ] El usuario ejecuta `docs/testing/test-035-...md`; Claude prepara los datos
      vía API, registra hallazgos caso por caso y limpia al cerrar la ronda.
- [ ] `@tester` cierra la ronda automática; `@reviewer` revisa antes de `[DONE]`.

## Dependencias entre fases

```
Fase 0 (pruebas en rojo)
   └─ Fase 1 (entidades + migración)
         ├─ Fase 2 (ExpensesService)  ──┐
         ├─ Fase 3 (BudgetsService)   ──┤  (2, 3 y 4 comparten el helper de
         └─ Fase 4 (DebtsService)     ──┤   alcance mensual → se escribe en la 2)
                                        └─ Fase 5 (controllers/DTOs)
                                              ├─ Fase 6 (MCP, @mcp-builder)
                                              └─ Fase 7 (tipos/servicios/hooks)
                                                    └─ Fase 8 (UI)
                                                          └─ Fase 9 → Fase 10
```

## Criterios de aceptación

1. Existe una sola entidad de gasto: la tabla `budget_items` no existe y
   `BudgetItem` no aparece en el código de backend ni de frontend.
2. Un gasto puede crearse solo con `plannedAmount` (planeado), solo con
   `amount` + `date` (ejecutado), o con ambos (liquidado). Crear uno sin ningún
   monto devuelve 400, y crear uno con `amount` sin `date` (o al revés) también.
3. Al crear un gasto con `date` en un mes que ya tiene presupuesto, el gasto
   queda vinculado a ese presupuesto automáticamente. Si el mes no tiene
   presupuesto, queda con `budgetId` null y **no** se crea ningún presupuesto.
4. Un gasto planeado en el presupuesto de junio y ejecutado con fecha de julio
   sigue contando en junio: aparece en el resumen de junio y no en el de julio.
5. `GET /finances/budgets/monthly-summary` devuelve `plannedTotal`,
   `executedTotal`, `variance`, `pendingPlannedTotal`, `unplannedTotal`,
   `byType` y `cardTotals`, y **no** devuelve `budgetTotal`, `expensesTotal` ni
   `combinedTotal`.
6. **No hay doble conteo**: un gasto planeado en 100.000 y ejecutado en 95.000
   aporta 100.000 a `plannedTotal` y 95.000 a `executedTotal`, y nunca 195.000 a
   ningún total.
7. Duplicar un mes copia los gastos con su `plannedAmount` y deja `amount` y
   `date` en null en el destino, incluso si el origen los tenía. Duplicar un
   gasto individual, en cambio, copia también `amount` y `date` desplazados.
8. Tras la migración, el número de gastos con `plannedAmount` no nulo iguala al
   número de `budget_items` que existían antes, y todas las cuotas de deuda
   conservan su `debtId` e `installmentNumber`.
9. Toda la lógica de spec-026 sigue funcionando sobre `Expense`: crear una deuda
   de N cuotas genera N gastos planeados de tipo `pago_deuda` (uno por mes),
   editarla regenera solo los futuros, eliminarla desasocia los vencidos y borra
   los futuros, y `pay-off` borra los futuros y crea un gasto real.
10. En `BudgetDetailView` el usuario ve, por cada gasto, su monto planeado y su
    monto real en la misma fila, y puede registrar la ejecución de un gasto
    planeado sin salir de la vista.
11. Al eliminar un presupuesto, la confirmación indica cuántos gastos ejecutados
    se perderán y por qué monto total antes de proceder.
12. El agente puede invocar `create_expense` con `plannedAmount` y `budgetId`
    para agregar un gasto planeado a un presupuesto, y con `creditCardId` para
    asociarlo a una tarjeta. Las tools `add_budget_item`, `update_budget_item` y
    `delete_budget_item` ya no existen.

## Pruebas asociadas

> Estos archivos se crean junto con el spec (ver "Artefactos que acompañan al spec").

- **Manuales:** `docs/testing/test-035-unificacion-presupuesto-gastos.md` —
  casos `TC-035-xxx` y `TC-MCP-035-xxx`.
- **Automáticas (backend):**
  `backend/test/e2e-035-unificacion-presupuesto-gastos.e2e-spec.ts`, más los
  ajustes a `e2e-026` y `e2e-023`, y los unitarios de
  `backend/src/finances/*.spec.ts`.

## Riesgos

1. **Es el spec más invasivo del dominio financiero hasta ahora.** Toca 3
   servicios, 2 controllers, 12 tools MCP, 8 archivos de frontend y elimina una
   tabla. La migración es de una sola vía en la práctica (el `down()` es lossy).
2. **Borrar un presupuesto destruye historial real** (decisión 12). Mitigado con
   la confirmación explícita de la Fase 8, pero el riesgo permanece por diseño.
3. **Rendimiento de los agregados.** El alcance mensual
   (`budgetId = X OR (budgetId IS NULL AND date IN mes)`) impide un índice
   simple; mitigado con `IDX_expenses_budgetId` y el índice existente sobre
   `date`. Volumen actual bajo, queda anotado.
4. **Ventana de inconsistencia entre fases.** Entre la Fase 5 y la Fase 8 el
   frontend queda roto contra el backend nuevo. La rama no debe mergearse a
   `development` en un estado intermedio.
5. **`e2e-026` es la red de seguridad del portado de deudas.** Si se relajan sus
   aserciones para que pase, se pierde la única garantía de que spec-026 sigue
   funcionando. No se relajan.

## Aprobación de implementación

> Claude no escribe código de implementación hasta que esta sección esté marcada.

- [x] Paquete (spec + pruebas) aprobado por el usuario
- **Fecha de aprobación:** 2026-08-22
