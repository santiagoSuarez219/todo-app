# Capacidades del MCP `todo-api` — dominio financiero

> **Qué es este archivo.** Un inventario de lo que el servidor MCP `todo-api`
> puede hacer **hoy** en el área de finanzas: las 42 herramientas expuestas,
> sus parámetros exactos y sus límites. Es una referencia descriptiva, no un
> system prompt — para las instrucciones de comportamiento del agente, ver
> [`finanzas-personales.system-prompt.md`](./finanzas-personales.system-prompt.md).
>
> **Alcance:** solo finanzas. El mismo servidor expone además ~26 herramientas
> de proyectos y actividades que aquí se omiten a propósito; están en
> [`asistente-personal.system-prompt.md`](./asistente-personal.system-prompt.md).
>
> **Verificado el 2026-09-05** contra `tools/list` del servidor en ejecución,
> después del despliegue de v2.0.0 (spec-035). Los nombres de parámetro de
> abajo son los reales, no los inferidos.

---

## Conexión

| | |
|---|---|
| Endpoint | `POST /mcp` (JSON-RPC 2.0 + SSE) — fuera del prefijo `/api/v1` |
| Autenticación | `Authorization: Bearer <MCP_API_KEY>` |
| Producción | `https://steadfast-ambition-production.up.railway.app/mcp` |
| Local | `http://localhost:3003/mcp` |
| Rate limit | 10 peticiones/minuto, global (`ThrottlerModule` en `app.module.ts`) |

La API key es independiente del login de usuario. Sin ella, `401`.

---

## El modelo que hay que entender antes de usar nada

Desde spec-035 **no existe la entidad "ítem de presupuesto"**. Un presupuesto
es, literalmente, un conjunto de gastos. Y un gasto lleva plan y ejecución en
la misma fila:

| Estado | Condición | Significa |
|---|---|---|
| `planned` | `plannedAmount` presente, `amount` nulo | Lo tengo presupuestado, no lo pagué |
| `executed` | `amount` presente, `plannedAmount` nulo | Lo pagué, no estaba presupuestado |
| `settled` | Ambos presentes | Lo presupuesté y lo pagué |

`executionStatus` no es una columna: se deriva al leer. Dos invariantes lo
protegen en la base de datos —un gasto nunca puede quedar sin ningún monto, y
`amount`/`date` van siempre juntos— así que la herramienta rechaza los
payloads inconsistentes en vez de crear filas a medias.

**Consecuencia para agregados:** planeado y ejecutado se reportan **siempre por
separado**. No hay ningún total combinado, precisamente porque sumarlos contaba
dos veces el mismo gasto.

**Regla de anclaje mensual:** un gasto pertenece al mes de su presupuesto, no
al de su fecha. Solo si no tiene presupuesto se ubica por `date`. Un gasto
planeado en junio y pagado el 2 de julio sigue contando en junio.

---

## Herramientas

`*` = parámetro obligatorio.

### Gastos — 6 herramientas

| Herramienta | Parámetros | Qué hace |
|---|---|---|
| `list_expenses` | `page`, `limit`, `year`, `month`, `creditCardId`, `budgetId`, `planned`, `executed`, `search` | Lista con filtros. `planned`/`executed` son booleanos que filtran por `amount IS NULL` / `IS NOT NULL`; en `false` **no filtran nada** (no son lo inverso entre sí) |
| `get_expense` | `id*` | Un gasto, con su presupuesto, tarjeta y vínculo de deuda |
| `create_expense` | `description*`, `type*`, `amount`, `date`, `plannedAmount`, `budgetId`, `creditCardId` | Crea en cualquiera de los tres estados. Si omitís `budgetId` y el mes de `date` ya tiene presupuesto, se vincula solo |
| `update_expense` | `id*`, `description`, `amount`, `date`, `plannedAmount`, `type`, `budgetId`, `creditCardId` | Mandar `amount`+`date` juntos es cómo se "registra la ejecución" de un planeado. `budgetId: null` lo desvincula |
| `delete_expense` | `id*` | Elimina |
| `duplicate_expense` | `expenseId*`, `month*`, `year*` | Clona **todo**, ejecución incluida, con la fecha desplazada al mes destino |

### Ingresos — 5 herramientas

| Herramienta | Parámetros |
|---|---|
| `list_incomes` | `page`, `limit` |
| `get_income` | `id*` |
| `create_income` | `description*`, `amount*`, `date*`, `type*` |
| `update_income` | `id*`, `description`, `amount`, `date`, `type` |
| `delete_income` | `id*` |

Los ingresos **no** participan del modelo plan/ejecución: siempre tienen monto
y fecha, y se anclan al mes por su `date`, no por presupuesto.

### Presupuestos — 7 herramientas

| Herramienta | Parámetros | Qué hace |
|---|---|---|
| `list_budgets` | `year`, `month`, `page`, `limit` | Lista, con `plannedTotal` ya calculado |
| `get_budget` | `id*` | Detalle con sus gastos, `totalIncome`, `plannedTotal`, `executedTotal`, `variance` y `byType` |
| `create_budget` | `name*`, `month*`, `year*` | **Nace vacío.** Los gastos se agregan después con `create_expense` + `budgetId` |
| `update_budget` | `id*`, `name`, `month`, `year` | |
| `delete_budget` | `id*` | ⚠️ **Borra en cascada todos sus gastos, incluidos los ya ejecutados.** Devuelve `executedExpensesRemoved` y `executedTotalRemoved` para poder advertirlo |
| `get_monthly_expense_summary` | `year*`, `month*` | El agregado del mes (abajo en detalle) |
| `duplicate_budget` | `sourceBudgetId*`, `month*`, `year*`, `name` | Copia **solo el plan**: los gastos llegan con `plannedAmount` y `amount`/`date` en null aunque el origen estuviera ejecutado. Devuelve `plannedExpensesCopied` e `incomesCopied` |

`get_monthly_expense_summary` devuelve: `totalIncome`, `plannedTotal`,
`executedTotal`, `variance` (planeado − ejecutado), `pendingPlannedTotal`
(planeado sin ejecutar), `unplannedTotal` (ejecutado sin plan), `byType` y
`cardTotals` por tarjeta. `budgetId` es `null` si el mes no tiene presupuesto.

> **La asimetría entre duplicar es deliberada:** `duplicate_budget` planifica un
> mes nuevo (solo plan); `duplicate_expense` clona un hecho (ejecución
> incluida). No es un descuido.

### Deudas — 3 herramientas

| Herramienta | Parámetros | Qué hace |
|---|---|---|
| `list_debts` | `status` | Cada deuda trae `paidInstallments`, `remainingValue` y `nextInstallment` **derivados del calendario**, sin pago manual |
| `create_debt` | `description*`, `productValue*`, `installmentValue*`, `totalInstallments*`, `startMonth*`, `startYear*`, `initialPayment` | Materializa **un gasto planeado (`pago_deuda`) por cada cuota**, uno por mes, creando el presupuesto del mes si falta |
| `pay_debt_full` | `debtId*` | Borra las cuotas futuras, registra el saldo restante como gasto ejecutado del mes en curso y marca la deuda `pagada` |

Las cuotas nacen **planeadas** (`amount`/`date` en null): una cuota es un plan
hasta que se paga. No hay que crearlas con `create_expense` — ya quedan puestas.

### Tarjetas de crédito — 5 herramientas

`list_credit_cards` (`page`, `limit`) · `get_credit_card` (`id*`) ·
`create_credit_card` (`name*`, `bank*`, `interestRate*`, `monthlyFee*`,
`totalLimit*`, `availableLimit*`) · `update_credit_card` (`id*` + los mismos,
opcionales) · `delete_credit_card` (`id*`)

Asociar una tarjeta a un gasto (`creditCardId`) alimenta el desglose
`cardTotals` del resumen mensual.

### Cuentas — 5 herramientas

`list_accounts` (`page`, `limit`) · `get_account` (`id*`) · `create_account`
(`name*`, `type*`, `bank*`, `currentBalance*`, `interestRate`) ·
`update_account` (`id*` + los mismos, opcionales) · `delete_account` (`id*`)

### CDTs — 6 herramientas

`list_cdts` (`page`, `limit`) · `get_cdt` (`id*`) · `get_active_cdts` (sin
parámetros; los de `endDate >= hoy`) · `create_cdt` (`bank*`,
`investedAmount*`, `interestRate*`, `startDate*`, `endDate*`) · `update_cdt`
(`id*` + los mismos, opcionales) · `delete_cdt` (`id*`)

### Lista de deseos — 5 herramientas

`list_purchases` (`status`, `page`, `limit`) · `get_purchase` (`id*`) ·
`create_purchase` (`description*`, `estimatedPrice`, `priority`, `store`,
`status`, `url`, `notes`) · `update_purchase` (`id*` + los mismos,
opcionales) · `delete_purchase` (`id*`)

---

## Lo que el MCP **no** puede hacer

Límites reales, verificados — no omisiones de este documento:

- **Editar o eliminar deudas.** `PATCH /finances/debts/:id` y `DELETE
  /finances/debts/:id` existen en REST, pero **no** están expuestos como
  tools. El agente puede crear una deuda y pagarla entera; corregirla o
  borrarla requiere la UI.
- **Resincronizar el calendario de cuotas.** `POST
  /finances/debts/:id/sync-budget-items` tampoco está expuesto.
- **Obtener una deuda puntual.** No hay `get_debt`; solo `list_debts`.
- **Conciliar automáticamente** un gasto real con uno planeado. La relación es
  explícita (la misma fila) o no existe: nada empareja por descripción o monto
  parecido. Los datos migrados en v2.0.0 quedaron como dos conjuntos disjuntos
  y solo se reconcilian a mano.
- **Vincular gastos con cuentas bancarias.** `Account` está desconectada del
  resto del dominio: no hay `accountId` en los gastos.
- **Tocar el mes de un ingreso por presupuesto.** Los ingresos se anclan solo
  por `date`.

---

## Trampas conocidas

**1. El nombre del identificador no es consistente entre herramientas.** Un
agente que generalice desde una tool a otra del mismo dominio falla con
`Unrecognized key`:

| Herramienta | Campo del id |
|---|---|
| Casi todas (`get_*`, `update_*`, `delete_*`) | `id` |
| `duplicate_expense` | `expenseId` |
| `duplicate_budget` | `sourceBudgetId` |
| `pay_debt_full` | `debtId` |

Registrado en `spec/backlog.md`.

**2. `planned` y `executed` en `list_expenses` no son opuestos.** Cada uno
filtra solo cuando vale `true`. `planned: false` no devuelve "los ejecutados":
no filtra nada.

**3. Los errores de validación no llegan como error de protocolo.** Un
`.refine()` fallido de Zod vuelve como resultado de tool con `isError: true` y
el mensaje dentro de `content[0].text`, no como error JSON-RPC de nivel
superior. Un cliente que solo mire el campo `error` de la respuesta creerá que
la llamada salió bien.

**4. El rate limit es de 10 req/min y es global**, compartido con la API REST.
Una secuencia de varias tools seguidas lo agota rápido y devuelve `429`.

---

## Mantenimiento

Este archivo describe el estado real del servidor, así que **se desactualiza
solo**. Al agregar, quitar o cambiar la firma de una tool financiera en
`backend/src/mcp/mcp.service.ts`, actualizar aquí y en el system prompt.

Para regenerar el inventario desde el servidor en ejecución:

```bash
curl -s -X POST http://localhost:3003/mcp \
  -H "Authorization: Bearer $MCP_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":"1","method":"tools/list","params":{}}'
```
