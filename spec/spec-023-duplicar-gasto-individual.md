# spec-023 — [TESTING] Duplicar un gasto individual a otro mes

## Contexto

Muchos gastos se repiten mes a mes de forma idéntica (una suscripción, un pago
fijo con tarjeta, un servicio). Hoy, la única forma de "arrastrar" un gasto de
un mes al siguiente es duplicar el mes financiero completo (spec-020) o volver
a crearlo a mano. Falta la acción granular: **"tengo este gasto en Junio y
quiero que también exista en Julio, tal cual"**, sin tocar el resto del mes.

Esta funcionalidad permite **duplicar un único gasto** (`Expense`) desde su mes
de origen hacia un mes/año destino elegido por el usuario, en una sola acción,
directamente desde la card del gasto en la lista.

## Alcance

Duplicar **un solo `Expense`** hacia un mes/año destino, copiando:

- `description`, `amount`, `type` y `creditCardId` (**preservando la tarjeta**
  de crédito asociada, si la tenía).
- La `date`, **desplazada** al mes/año destino conservando el **mismo día**, con
  **clamp** al último día del mes destino (ej. día 31 → mes de 30 días = día 30;
  enero-31 → febrero-28/29).

La construcción de la fecha destino se hace **por componentes numéricos** (mismo
criterio anti-desfase de zona horaria que ya usa el helper de spec-020), nunca
con `new Date('YYYY-MM-DD')` en zona local.

### Decisiones tomadas con el usuario

- **Destino:** el usuario elige **MES + AÑO** destino (no una fecha completa). El
  día se hereda del gasto original y se clampa al mes destino.
- **Alcance atómico:** **un gasto a la vez**, desde su card en la lista de
  gastos. **No** hay selección múltiple ni duplicación en lote.
- **Se copia tal cual:** no se edita descripción ni monto antes de copiar. El
  usuario ajusta después con la edición inline ya existente (spec-019).
- **MCP:** aplica — se agrega la tool `duplicate_expense`.

### Lo que NO incluye

- Selección múltiple ni duplicar varios gastos en una sola acción.
- Editar `description`/`amount`/`type` antes de copiar (se copian sin cambios).
- Duplicar ingresos, ítems de presupuesto u otras entidades — eso ya lo cubre
  spec-020 a nivel de mes.
- Recurrencia automática o programada de la duplicación.

## Impacto en el sistema

- **Backend:**
  - Nuevo DTO `DuplicateExpenseDto` (`month`, `year`) — sin `name`, no aplica a
    un gasto.
  - Nuevo endpoint `POST /finances/expenses/:id/duplicate`.
  - Nuevo método `ExpensesService.duplicate(sourceId, dto)` + helper de
    desplazamiento de fecha con clamp.
  - **No requiere migración**: solo lee un `Expense` existente y crea una fila
    con columnas ya definidas.
- **Frontend:**
  - Nuevo tipo `DuplicateExpenseDto` (`month`, `year`).
  - Nuevo servicio `duplicateExpense(id, dto)` y hook `useDuplicateExpense()`.
  - Nuevo componente `DuplicateExpenseForm.tsx` (select mes + input año).
  - Botón "Duplicar" en `ExpenseCard.tsx`; modal + estado de éxito/error en
    `ExpensesView.tsx`.
- **MCP (`todo-api`):**
  - Nueva tool `duplicate_expense` en `mcp.service.ts` (dentro de
    `registerExpenseTools`).
  - Actualización del system prompt `finanzas-personales.system-prompt.md` y de
    la tabla de tools de `backend/CLAUDE.md`.

## Evaluación MCP

**¿Aplica MCP?** **Sí.**

| Pregunta | Respuesta |
|----------|-----------|
| ¿Expone datos que un agente podría consultar? | No directamente (es acción de escritura). |
| ¿Permite acciones que un agente debería poder ejecutar? | **Sí** — "duplica el gasto X de junio a julio" es una petición natural. |
| ¿Ya existe una tool que cubra el dominio? | Existe `registerExpenseTools` (list/get/create/update/delete), pero ninguna duplica → se **agrega** una tool nueva, no un MCP nuevo. |
| ¿Hay un system prompt que se beneficie? | **Sí** — `finanzas-personales.system-prompt.md`. |

- **MCP existente a modificar:** `todo-api` — agregar tool `duplicate_expense`
  dentro de `registerExpenseTools()` en `backend/src/mcp/mcp.service.ts`.
- **MCP nuevo a crear:** No aplica.
- **System prompt afectado:** `docs/mcps/finanzas-personales.system-prompt.md`.
- **Fase de MCP en este spec:** Fase 4 (después del backend, antes de las
  pruebas).

## Contrato del endpoint

`POST /finances/expenses/:id/duplicate`

**Body — `DuplicateExpenseDto`** (validado con `class-validator`;
`ValidationPipe` corre con whitelist + forbidNonWhitelisted, mismo estilo que
`DuplicateBudgetDto`):

| Campo | Tipo | Validación | Notas |
|-------|------|-----------|-------|
| `month` | `number` | requerido · int · `min 1` · `max 12` | Mes destino |
| `year` | `number` | requerido · int · `min 2020` | Año destino (mismo criterio que `DuplicateBudgetDto`) |

> No lleva `name` ni permite editar `description`/`amount`: el gasto se copia
> tal cual (decisión del usuario).

**Respuesta (`.data.data`) — `Expense`:**

El endpoint devuelve **el `Expense` recién creado**, con su relación
`creditCard` cargada (releer con `findOne(nuevoId)`, que ya hace `leftJoin` de
`creditCard`). **No** se devuelve objeto de contadores: a diferencia de spec-020
(que crea N filas), aquí se crea una sola fila y el propio recurso es la
respuesta natural.

**Errores:** `404` si el gasto origen no existe (reutiliza el 404 de `findOne`).

> **Decisiones por defecto (marcadas para revisión del usuario):**
> 1. **Sin transacción.** Es un único `save` de una sola fila; una transacción
>    no aporta atomicidad extra (a diferencia de budgets, que inserta budget +
>    ítems + ingresos + gastos). Default: no inyectar `dataSource` ni envolver
>    en `dataSource.transaction`.
> 2. **Ubicación del helper de fecha.** Los helpers `shiftDate` /
>    `getLastDayOfMonth` hoy son privados de `budgets.service.ts` (spec-020,
>    `[DONE]`). Para no tocar código de un spec cerrado, el **default es (a)
>    replicar** la misma lógica como métodos privados en `expenses.service.ts`.
>    Alternativa opcional **(b) extraer** ambos helpers a un util común
>    `backend/src/finances/utils/date-shift.util.ts` y consumirlo desde ambos
>    servicios (elimina duplicación, pero **requiere aprobación explícita** por
>    modificar `budgets.service.ts` de un spec `[DONE]`, más re-ejecutar los e2e
>    de spec-020 para descartar regresión del clamp).
> 3. **Validación de tarjeta.** El original ya referencia una `creditCard`
>    existente; al copiar solo el `creditCardId` no es necesario revalidar contra
>    `creditCardsRepository`. Default: no revalidar (a diferencia de `create`,
>    que sí valida porque el id llega del cliente).
> 4. **`404` en origen inexistente:** se mantiene, reutilizando el
>    `findOne(sourceId)` existente que ya lanza `NotFoundException`.

## Fases de implementación

### Fase 1 — Backend: DTO y lógica de servicio

- [x] Crear `backend/src/finances/dto/duplicate-expense.dto.ts` con
      `DuplicateExpenseDto` (`month`: IsInt/Min 1/Max 12; `year`: IsInt/Min
      2020), mismo estilo de validación que `DuplicateBudgetDto`.
- [x] **Helper de fecha** (opción por defecto): replicar
      `shiftDate(date, srcMonth, srcYear, destMonth, destYear)` y
      `getLastDayOfMonth(year, month)` como métodos privados en
      `expenses.service.ts`, con construcción **por componentes numéricos** (sin
      desfase de zona horaria).
- [x] Implementar `duplicate(sourceId, dto)` en `expenses.service.ts`:
  - [x] `findOne(sourceId)` → 404 si no existe (reutiliza el existente, ya hace
        leftJoin de `creditCard`).
  - [x] Derivar el `srcMonth`/`srcYear` a partir de la `date` del gasto origen
        (parsear `'YYYY-MM-DD'` por componentes).
  - [x] Calcular la `date` destino con `shiftDate` (mismo día, clamp al último
        día del mes destino).
  - [x] Construir el nuevo `Expense` copiando **solo** `description`, `amount`,
        `type`, `creditCardId` y la `date` desplazada; **nunca** `id`,
        `createdAt`, `updatedAt` ni la instancia de `creditCard`.
  - [x] `save` de la fila nueva (sin transacción — decisión por defecto #1).
  - [x] Releer con `findOne(nuevoId)` para devolver el `Expense` con
        `creditCard` cargada.

### Fase 2 — Backend: endpoint REST

- [x] Agregar `POST /:id/duplicate` en `expenses.controller.ts` (`@Param('id',
      ParseUUIDPipe)` + `@Body() DuplicateExpenseDto`) delegando en
      `service.duplicate`.
- [x] Revisar el **orden de rutas** frente a `:id` para evitar colisiones de
      matching (colocar junto al resto de rutas con parámetro, después de `POST /`).
- [x] Añadir decoradores Swagger coherentes (`@ApiOperation`, respuestas
      201/404).
- [x] Confirmar que la respuesta pasa por `TransformInterceptor` (`.data.data`)
      y los errores por `HttpExceptionFilter`.

### Fase 3 — Frontend: tipos, servicio, hook y UI

> Leer `DESIGN.md` antes de escribir cualquier UI (tokens, clases de
> input/label/botón, dark mode). Reutilizar el patrón de `DuplicateBudgetForm.tsx`.

- [x] En `frontend/src/types/index.ts`, añadir `DuplicateExpenseDto` (`month`,
      `year`), coincidiendo exactamente con el contrato backend. (Sin
      `DuplicateExpenseResult`: la respuesta es un `Expense`, tipo ya existente.)
- [x] En `frontend/src/services/finances/expenses.service.ts`, añadir
      `duplicateExpense(id, dto): Promise<Expense>` (POST → `data.data`, mismo
      patrón que `createExpense`).
- [x] En `frontend/src/hooks/finances/useExpenses.ts`, añadir
      `useDuplicateExpense()` que en `onSuccess`:
  - [x] Invalide el/los query key(s) de expenses (confirmado: `['expenses']`).
  - [x] Invalide también `['budgets']`, porque el gasto duplicado cae en otro
        mes que puede tener presupuesto.
- [x] Crear `frontend/src/components/finances/DuplicateExpenseForm.tsx` (React
      Hook Form + Zod): select de mes (constante `MONTHS` reutilizada) + input de
      año. `defaultValues` prellenados al **mes/año siguiente** al del gasto
      origen (derivar de la `date` del origen, con rollover diciembre→enero/año+1).
      Recibe `origin: Expense` por props.
- [x] En `frontend/src/components/finances/ExpenseCard.tsx`: añadir botón
      "Duplicar" junto a "Editar"/"Eliminar", con icono `DuplicateIcon` (símbolo
      de copiar) e icono.
- [x] En `frontend/src/pages/finances/ExpensesView.tsx` (contenedora): añadir
      el estado del modal de duplicar, render del modal con
      `DuplicateExpenseForm`, y feedback de éxito (mensaje "Gasto duplicado a
      {mes} {año}") / error.
- [x] Manejo de error: mostrar `error.message` como bloque de error sin cerrar
      el modal; auto-cierre tras 2 segundos en caso de éxito.

### Fase 4 — MCP: actualizar `todo-api`

> Ejecutar después del backend y antes de las pruebas, para que `@tester` valide
> también la tool.

- [x] Agregar la tool `duplicate_expense` en `registerExpenseTools()`
      (`backend/src/mcp/mcp.service.ts`), junto a las demás tools de gasto, con
      handler `ok()/err()` que invoca `ExpensesService.duplicate(expenseId,
      { month, year })`.
- [x] Schema Zod **exacto** al `DuplicateExpenseDto` + `expenseId` (UUID del
      gasto origen); sin campos inventados. No exponer `creditCardId` en el
      schema (se preserva automáticamente desde el origen).
- [x] Actualizar `docs/mcps/finanzas-personales.system-prompt.md`:
  - [x] Añadir `duplicate_expense` a la tabla de tools de la sección **Gastos**.
  - [x] Regla de comportamiento: **confirmar explícitamente con el usuario antes
        de invocar** `duplicate_expense` (indicando qué gasto, mes origen y
        mes/año destino), por crear un registro financiero real.
  - [x] Indicar que el día se clampa al mes destino, para que el agente no
        prometa un día inexistente.
- [x] Actualizar la tabla de tools de `backend/CLAUDE.md` (fila
      `duplicate_expense` agregada). `docs/mcps/README.md` no enumera tools
      individuales → sin cambios.
- [ ] Verificar que la tool responde vía `/mcp` (éxito devolviendo el gasto
      creado). → lo ejecuta `@tester` con los `TC-MCP-*`.

### Fase 5 — Pruebas

- [ ] Crear `docs/testing/test-023-duplicar-gasto-individual.md` con casos
      manuales de UI (`@tester` de frontend): duplicar un gasto sin tarjeta;
      duplicar uno con tarjeta (verificar que se preserva); clamp de día (gasto
      día 31 → mes de 30/28 días); prellenado del formulario al mes siguiente;
      feedback de éxito; manejo de error. Más `TC-MCP-001…` para
      `duplicate_expense`.
- [ ] Backend/e2e (`@tester`): caso feliz (gasto con y sin tarjeta) verificando
      `description`/`amount`/`type`/`creditCardId` copiados y `date`
      desplazada+clampeada (incluir día 31 → mes corto y febrero bisiesto);
      origen inexistente → 404. Si se extrajo el helper a util común (opción b),
      re-ejecutar los e2e de spec-020 para descartar regresión del clamp.
- [ ] Casos `TC-MCP-001` (duplicar a período válido) y `TC-MCP-002` (origen
      inexistente → error) para la tool `duplicate_expense`, redactados en el
      `test-023`.

## Criterios de aceptación

- `POST /finances/expenses/:id/duplicate` con mes/año destino crea un nuevo
  `Expense` que copia `description`, `amount`, `type` y `creditCardId` del
  origen, con la `date` desplazada al mes/año destino conservando el día
  (clampeado al último día del mes).
- La fecha destino nunca sufre desfase de zona horaria (día 31 origen → día
  correcto del mes destino, febrero bisiesto correcto).
- Si el gasto origen no existe, responde 404.
- La respuesta es el `Expense` creado, con su `creditCard` cargada; no incluye
  contadores.
- Desde la UI, el usuario puede duplicar un gasto desde su card, elige mes/año
  destino (prellenados al mes siguiente), ve confirmación de éxito, y la
  lista/resumen se refrescan sin recargar.
- (MCP) El agente puede invocar `duplicate_expense` y obtener el gasto
  duplicado, confirmando con el usuario antes de ejecutarlo.

## Pruebas e2e (si aplica)

- Backend e2e: duplicación feliz con verificación de campos copiados y clamp de
  fecha; con y sin tarjeta; origen 404.
- MCP: `TC-MCP-001` (duplicar a período válido) y `TC-MCP-002` (origen
  inexistente → error).
