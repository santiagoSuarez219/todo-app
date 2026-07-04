# spec-020 — [DONE] Duplicar mes financiero de un presupuesto a otro mes

## Contexto

Cada mes el usuario reconstruye manualmente su presupuesto y sus movimientos:
vuelve a ingresar uno a uno los ítems del presupuesto, los ingresos y los
gastos recurrentes. La mayoría se repite mes a mes (arriendo, servicios,
sueldo, pagos con tarjeta), por lo que rehacerlo desde cero es tedioso y
propenso a olvidos.

Esta funcionalidad permite **duplicar el mes financiero completo** de un
presupuesto origen (ej. Junio) hacia un mes/año destino (ej. Julio) en una
sola acción, evitando el reingreso manual.

## Alcance

Duplicar, a partir de un presupuesto origen, hacia un mes/año destino:

- El **presupuesto** (`Budget`) con sus **ítems** (`BudgetItem`: descripción,
  monto planificado, tipo).
- Todos los **ingresos** (`Income`) del mes/año del presupuesto origen.
- Todos los **gastos** (`Expense`) del mes/año del presupuesto origen,
  **preservando la asociación a tarjeta de crédito** (`creditCardId`).

Las fechas de ingresos y gastos copiados se **desplazan** al mes/año destino
conservando el día, con **clamp** al último día del mes destino (ej. día 31
copiado a un mes de 30 días → día 30; enero-31 → febrero-28/29).

### Decisiones tomadas con el usuario

- **Qué se copia:** todo el mes financiero (presupuesto + ítems + ingresos +
  gastos), no solo el presupuesto.
- **Conflicto en el destino:** si ya existe un presupuesto para el mes/año
  destino, la operación se **bloquea por completo** (error 409) y **no crea
  ninguna fila** (ni presupuesto, ni ítems, ni ingresos, ni gastos). Este
  guard, al crear siempre el presupuesto destino, actúa además como
  protección de idempotencia: no se puede duplicar dos veces al mismo mes.

### Lo que NO incluye

- Copiar CDTs, cuentas, tarjetas, compras (wishlist) o deudas — son entidades
  no ligadas al ciclo mensual del presupuesto.
- Fusionar con un presupuesto existente en el destino (se descartó a favor de
  "bloquear y avisar").
- Edición previa de los ítems/movimientos antes de copiar (se copian tal
  cual; el usuario ajusta después con la edición inline ya existente).
- Recurrencia automática o programada de la duplicación.

## Impacto en el sistema

- **Backend:**
  - Nuevo DTO `DuplicateBudgetDto` (`month`, `year`, `name?`).
  - Nuevo endpoint `POST /finances/budgets/:id/duplicate`.
  - Nuevo método `BudgetsService.duplicate(sourceId, dto)` (transaccional) +
    helper privado de desplazamiento de fecha con clamp + interfaz
    `DuplicateBudgetResult`.
  - **No requiere migración**: solo lee entidades existentes y crea filas con
    columnas ya definidas.
- **Frontend:**
  - Nuevos tipos `DuplicateBudgetDto` y `DuplicateBudgetResult`.
  - Nuevo servicio `duplicateBudget(id, dto)` y hook `useDuplicateBudget()`.
  - Nuevo componente `DuplicateBudgetForm.tsx` (mes + año + nombre opcional).
  - Botón "Duplicar" en `BudgetsView` (por card) y en `BudgetDetailView`
    (barra de acciones), con feedback de contadores y manejo del 409.
- **MCP (`todo-api`):**
  - Nueva tool `duplicate_budget` en `mcp.service.ts`.
  - Actualización del system prompt `finanzas-personales.system-prompt.md`.

## Evaluación MCP

**¿Aplica MCP?** **Sí.**

| Pregunta | Respuesta |
|----------|-----------|
| ¿Expone datos que un agente podría consultar? | No directamente (es acción de escritura). |
| ¿Permite acciones que un agente debería poder ejecutar? | **Sí** — "duplica mi presupuesto y movimientos de junio a julio" es una petición natural. |
| ¿Ya existe una tool que cubra el dominio? | Existe `registerBudgetTools`, pero ninguna cubre la duplicación → se **agrega** una tool nueva, no un MCP nuevo. |
| ¿Hay un system prompt que se beneficie? | **Sí** — `finanzas-personales.system-prompt.md`. |

- **MCP existente a modificar:** `todo-api` — agregar tool `duplicate_budget`
  dentro de `registerBudgetTools()` en `backend/src/mcp/mcp.service.ts`.
- **MCP nuevo a crear:** No aplica.
- **System prompt afectado:** `docs/mcps/finanzas-personales.system-prompt.md`.
- **Fase de MCP en este spec:** Fase 4 (después del backend, antes de las
  pruebas e2e).

## Contrato del endpoint

`POST /finances/budgets/:id/duplicate`

**Body — `DuplicateBudgetDto`** (validado con `class-validator`, alineado con
`CreateBudgetDto`; `ValidationPipe` corre con whitelist + forbidNonWhitelisted):

| Campo | Tipo | Validación | Notas |
|-------|------|-----------|-------|
| `month` | `number` | requerido · int · `min 1` · `max 12` | Mes destino |
| `year` | `number` | requerido · int · `min` = mismo criterio que `CreateBudgetDto` | Año destino |
| `name` | `string` | opcional · no vacío si se envía · `maxLength 255` | Si se omite, se reutiliza el `name` del presupuesto origen |

**Respuesta (`.data.data`) — `DuplicateBudgetResult`:**

| Campo | Tipo | Significado |
|-------|------|-------------|
| `budget` | `Budget` | Presupuesto destino creado, con sus `items` cargados |
| `itemsCopied` | `number` | Ítems clonados |
| `incomesCopied` | `number` | Ingresos recreados en el mes destino |
| `expensesCopied` | `number` | Gastos recreados en el mes destino |

**Errores:** `404` si el presupuesto origen no existe · `409` si ya existe un
presupuesto en el mes/año destino.

> Decisiones por defecto (marcadas para revisión del usuario):
> 1. `DuplicateBudgetResult` se declara en `budgets.service.ts`, junto al
>    método, consistente con cómo `getMonthlySummary` arma su retorno inline.
> 2. Al omitir `name`, se reutiliza el nombre del origen tal cual. El
>    formulario del frontend lo pre-rellena para que el usuario lo ajuste.

## Fases de implementación

### Fase 1 — Backend: DTO y lógica de servicio

- [x] Crear `backend/src/finances/dto/duplicate-budget.dto.ts` con
      `DuplicateBudgetDto` (`month`, `year`, `name?`) y validaciones
      `class-validator` alineadas con `CreateBudgetDto`.
- [x] Declarar la interfaz `DuplicateBudgetResult` en `budgets.service.ts`.
- [x] Implementar helper privado de desplazamiento de fecha: dado un `date`
      origen `'YYYY-MM-DD'` y el mes/año destino, devolver `'YYYY-MM-DD'` con
      el mismo día recortado al último día del mes destino (bisiesto incluido),
      **sin desfase de zona horaria** (construir por componentes numéricos, no
      `new Date('YYYY-MM-DD')` en local — el proyecto ya tuvo incidentes de tz).
- [x] Implementar `duplicate(sourceId, dto)` en `budgets.service.ts`:
  - [x] `findOne(sourceId)` → 404 si no existe.
  - [x] **Guard de conflicto**: buscar Budget en `(dto.month, dto.year)`; si
        existe → `ConflictException` (409) antes de escribir nada.
  - [x] Calcular el rango de fechas del mes/año origen (`sourceBudget.month` /
        `sourceBudget.year`) para filtrar `Income` y `Expense` por su columna
        `date` (rango, no manipulación de strings).
  - [x] Dentro de `dataSource.transaction` (repos del `manager`):
    - [x] Crear Budget destino: `name = dto.name ?? sourceBudget.name`,
          `month`/`year` del DTO; clonar cada `BudgetItem` copiando solo
          `description`, `plannedAmount`, `type` (nunca `id`/`budget`/timestamps),
          reutilizando el patrón de cascada de `create`.
    - [x] Recrear los `Income` del mes origen: copiar `description`, `amount`,
          `type` y `date` desplazada con clamp (nunca `id`/timestamps).
    - [x] Recrear los `Expense` del mes origen: copiar `description`, `amount`,
          `type`, `creditCardId` y `date` desplazada con clamp.
    - [x] Acumular `itemsCopied`, `incomesCopied`, `expensesCopied`.
  - [x] Releer el budget destino con sus items (`findOne`) y devolver
        `DuplicateBudgetResult`.
- [x] Verificar que cualquier excepción dentro de la transacción revierte todo
      (copia atómica: todo o nada).

### Fase 2 — Backend: endpoint REST

- [x] Agregar `POST /:id/duplicate` en `budgets.controller.ts`
      (`@Param('id')` UUID + `@Body() DuplicateBudgetDto`) delegando en
      `service.duplicate`.
- [x] Revisar el orden de rutas frente a `:id` para evitar colisiones de
      matching.
- [x] Añadir decoradores Swagger coherentes (`@ApiOperation`, respuestas
      201/404/409).
- [x] Confirmar que la respuesta pasa por `TransformInterceptor` y los errores
      por `HttpExceptionFilter`.

### Fase 3 — Frontend: tipos, servicio, hook y UI

> Leer `DESIGN.md` antes de escribir cualquier UI (tokens, clases de
> input/label/botón, dark mode). Reutilizar el patrón de `BudgetForm.tsx`.

- [x] En `types/index.ts`, añadir `DuplicateBudgetDto` (`month`, `year`,
      `name?`) y `DuplicateBudgetResult` (Budget + `itemsCopied`,
      `incomesCopied`, `expensesCopied`), coincidiendo exactamente con el
      contrato backend.
- [x] En `services/finances/budgets.service.ts`, añadir
      `duplicateBudget(id, dto): Promise<DuplicateBudgetResult>` (POST →
      `data.data`, mismo patrón que `createBudget`).
- [x] En `hooks/finances/useBudgets.ts`, añadir `useDuplicateBudget()` que en
      `onSuccess` invalide `['budgets']`, `['expenses']` e `['incomes']`
      (confirmar los prefijos reales de las query keys leyendo `useExpenses` y
      `useIncomes` antes de codificar).
- [x] Crear `components/finances/DuplicateBudgetForm.tsx` (React Hook Form +
      Zod): select de mes (constante `MONTHS`), input de año, input de nombre
      opcional. `defaultValues` prellenados al mes/año siguiente al del origen;
      recibe `origin: Budget` por props.
- [x] En `BudgetsView.tsx`: botón "Duplicar" por card con
      `e.stopPropagation()` (la card navega al detalle), estado del modal, y
      manejo de éxito (contadores) / conflicto 409 (mensaje no destructivo, el
      modal no se cierra).
- [x] En `BudgetDetailView.tsx`: botón "Duplicar a otro mes" en la barra de
      acciones (junto a "Editar"), reutilizando `DuplicateBudgetForm` y el
      panel de feedback.
- [x] Panel de feedback de éxito: mostrar los tres contadores y un botón "Ver
      presupuesto" que navegue a `/finances/budgets/${result.budget.id}`.
- [x] Manejo del 409: el interceptor Axios colapsa el error a
      `new Error(message)` (sin `status`); mostrar `error.message` como bloque
      de error sin cerrar el modal ni perder lo escrito.

### Fase 4 — MCP: actualizar `todo-api`

> Ejecutar después del backend y antes de las pruebas e2e, para que
> `@tester` valide también la tool.

- [x] Agregar la tool `duplicate_budget` en `registerBudgetTools()`
      (`backend/src/mcp/mcp.service.ts`), después de
      `get_monthly_expense_summary`, con handler `ok()/err()` que invoca
      `BudgetsService.duplicate(sourceBudgetId, { month, year, name? })`.
- [x] Schema Zod exacto a `DuplicateBudgetDto` + `sourceBudgetId` (UUID del
      origen); sin campos inventados. **No** replicar el bug de `create_budget`
      (que omite `type` en items) — aquí no se declaran ítems manualmente.
- [x] Actualizar `docs/mcps/finanzas-personales.system-prompt.md`:
  - [x] Añadir `duplicate_budget` a la tabla de tools de la sección
        **Presupuestos**.
  - [x] Regla de comportamiento: **confirmar explícitamente con el usuario
        antes de invocar** `duplicate_budget` (indicando mes origen, mes/año
        destino y qué se copia), por crear registros financieros reales en masa.
  - [x] Indicar que ante 409 el agente debe consultar `list_budgets` del
        destino y avisar, no reintentar.
- [x] Actualizar `docs/mcps/README.md` (no enumera tools individuales → sin
      cambios) y la tabla de tools de `backend/CLAUDE.md` (fila
      `duplicate_budget` agregada).
- [ ] Verificar que la tool responde vía `/mcp` contra un destino libre (éxito
      con contadores) y contra uno ocupado (409). → **Pendiente** (lo ejecuta
      `@tester` con los `TC-MCP-*`).

### Fase 5 — Pruebas

- [x] Crear `docs/testing/test-020-duplicar-mes-financiero.md` con casos
      manuales de UI (`@tester` de frontend). Incluye TC-001…TC-012 (UI) y
      TC-MCP-001…TC-MCP-003.
- [ ] Backend/e2e (`@tester`): caso feliz (ítems + ingresos + gastos, uno con
      tarjeta) verificando contadores y clamp de fecha (incluir día 31 → mes
      corto); conflicto 409 con **cero** filas creadas; origen inexistente 404.
      → **Pendiente**: se ejecuta tras la aprobación de los casos manuales.
- [x] Casos `TC-MCP-001` / `TC-MCP-002` (+ `TC-MCP-003`) para la tool
      `duplicate_budget` redactados en el `test-020`.

> **Estado de la Fase 5:** El archivo de pruebas manuales está listo y el spec
> pasa a `[TESTING]`. El usuario debe ejecutar los casos manuales (UI) y
> reportar cuáles pasan; luego `@tester` de backend ejecuta las pruebas e2e y
> los `TC-MCP-*` como última fase antes de `[DONE]`.

## Criterios de aceptación

- `POST /finances/budgets/:id/duplicate` con mes/año destino libre crea el
  presupuesto con sus ítems y recrea todos los ingresos y gastos del mes
  origen con fechas desplazadas y clampeadas, preservando `creditCardId`.
- Si el destino ya tiene presupuesto, responde 409 y **no crea ninguna fila**.
- Si el origen no existe, responde 404.
- La respuesta incluye el budget creado y los contadores `itemsCopied`,
  `incomesCopied`, `expensesCopied`.
- Desde la UI, el usuario puede duplicar un presupuesto a otro mes desde la
  lista o el detalle, ve cuántos ítems/ingresos/gastos se copiaron, y ante un
  conflicto recibe un mensaje claro sin perder lo ingresado.
- (MCP) El agente puede invocar `duplicate_budget` y obtener el mismo
  resultado, confirmando con el usuario antes de ejecutarlo.

## Pruebas e2e (si aplica)

- Backend e2e: duplicación feliz con verificación de contadores y clamp de
  fecha; conflicto 409 atómico (cero filas); origen 404.
- MCP: `TC-MCP-001` (duplicar a período libre) y `TC-MCP-002` (conflicto 409).
