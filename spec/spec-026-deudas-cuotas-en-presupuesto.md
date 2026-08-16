# spec-026 — [DONE] Deudas con cuotas materializadas en presupuestos

> Estado inicial obligatorio: `[NOT STARTED]`.
> Actualizar a `[IN PROGRESS]`, `[TESTING]` o `[DONE]` según avance.

## Contexto

Hoy una deuda (`backend/src/finances/debts.service.ts`, spec-016) solo existe como
registro contable: el usuario debe presionar "Pagar cuota" mes a mes, lo que crea un
`Expense` de tipo `pago_deuda` e incrementa `paidInstallments`. Esto tiene dos
problemas:

1. **El compromiso de pago no aparece en la planeación.** Los presupuestos de los
   meses siguientes no reflejan las cuotas ya comprometidas, así que el usuario
   planea un mes sin ver una obligación que sabe que existe.
2. **El avance depende de la memoria del usuario.** En la práctica una cuota se
   vence sola por el paso del tiempo; requerir un clic mensual para que el sistema
   se entere convierte un hecho automático en una tarea manual.

Este spec invierte el modelo: al crear la deuda se declara el plazo, el valor de
cuota y el mes de inicio, y el sistema **materializa cada cuota como un `BudgetItem`
de tipo `pago_deuda` en el presupuesto del mes correspondiente**, creando los
presupuestos que falten. El pago de cuota individual desaparece por completo y se
reemplaza por una única acción de **pagar deuda completa**, que borra las cuotas
futuras y registra el saldo restante como gasto del mes en curso.

## Alcance

### Incluye

- Campos `startMonth` / `startYear` en `Debt` y su captura en el formulario
  (default: mes siguiente al actual).
- Generación transaccional de N `BudgetItem` de cuota (uno por mes del plazo),
  creando los presupuestos faltantes con nombre autogenerado.
- Vínculo persistente `BudgetItem → Debt` (`debtId` + `installmentNumber`).
- Derivación de `paidInstallments`, `remainingValue` y del estado efectivo `pagada`
  a partir del calendario de cuotas.
- Nueva acción `POST /finances/debts/:id/pay-off` (pagar deuda completa).
- Endpoint idempotente `POST /finances/debts/:id/sync-budget-items`, necesario para
  las deudas heredadas y para reparar presupuestos borrados.
- Regeneración de ítems futuros al editar una deuda, y política de limpieza al
  eliminarla.
- Exclusión de los ítems de cuota en `budgets.duplicate()`.
- Eliminación total del pago de cuota individual: botón de UI, endpoint
  `POST /finances/debts/:id/pay`, `DebtsService.payInstallment()`, tool MCP
  `pay_debt_installment`, hook `usePayInstallment`, servicio `payInstallment` y
  tipo `PayInstallmentResult`.
- Migraciones TypeORM (esquema + backfill de las deudas existentes).

### No incluye

- Intereses, mora, refinanciación o abonos parciales a capital.
- Pago anticipado de una cuota puntual — queda **explícitamente eliminado** por
  decisión del usuario.
- Conciliación automática entre el `BudgetItem` de cuota y un `Expense` real de ese
  mes.
- Cambios en `Expense`, tarjetas de crédito o en el resto del dominio financiero.
- Notificaciones o cron de recordatorio de cuotas.

## Impacto en el sistema

### Backend (`backend/src/`)

| Archivo | Cambio |
|---|---|
| `finances/entities/debt.entity.ts` | + `startMonth`, `startYear`, `paidOffAt`; − `paidInstallments` (pasa a derivado, Fase 7) |
| `finances/entities/budget-item.entity.ts` | + relación `debt` (`ManyToOne`, nullable, `onDelete: CASCADE`) + `installmentNumber` |
| `finances/dto/create-debt.dto.ts` | + `startMonth` (1–12) y `startYear`, requeridos |
| `finances/dto/update-debt.dto.ts` | Sigue siendo `PartialType`; se documenta la semántica de regeneración |
| `finances/debts.service.ts` | Reescritura de `create`, `update`, `remove`, `withRemaining`; − `payInstallment`; + `payOff`, `syncBudgetItems`, helpers de calendario. Pasa a inyectar `DataSource` |
| `finances/debts.controller.ts` | − `POST :id/pay`; + `POST :id/pay-off`, `POST :id/sync-budget-items` |
| `finances/budgets.service.ts` | `duplicate()` filtra ítems con `debtId != null`; `findOne`/`findAll` exponen `debtId` e `installmentNumber` |
| `finances/finances.module.ts` | Sin cambios de providers (todas las entidades ya están en `forFeature`); `DataSource` está disponible globalmente |
| `mcp/mcp.service.ts` | Ver Fase 6 |
| `migrations/` | 2 migraciones nuevas (Fase 1 y Fase 7) |

### Frontend (`frontend/src/`)

| Archivo | Cambio |
|---|---|
| `types/index.ts` | `Debt` (+`startMonth`, `startYear`, `paidOffAt`, `nextInstallment`), `CreateDebtDto` (+`startMonth`, `startYear`), `BudgetItem` (+`debtId`, `installmentNumber`), + `PayOffDebtResult`, + `SyncBudgetItemsResult`; − `PayInstallmentResult` |
| `services/finances/debts.service.ts` | − `payInstallment`; + `payOffDebt`, `syncDebtBudgetItems` |
| `hooks/finances/useDebts.ts` | − `usePayInstallment`; + `usePayOffDebt`, `useSyncDebtBudgetItems` |
| `components/finances/DebtForm.tsx` | + selector de mes/año de inicio; aviso de regeneración al editar |
| `components/finances/DebtCard.tsx` | − botón "Pagar cuota"; + "Pagar deuda completa" y "Sincronizar presupuestos"; mostrar mes de inicio y próxima cuota |
| `pages/finances/DebtsView.tsx` | Sustituir `pay` por `payOff` + `ConfirmDialog` con el monto exacto |
| `pages/finances/BudgetDetailView.tsx` | Badge "Deuda" en los ítems de cuota (siguen siendo editables y borrables) |

> `frontend/DESIGN.md` debe leerse antes de tocar `DebtCard`, `DebtForm` y
> `BudgetDetailView`.

### Base de datos

Dos migraciones (esquema + backfill, y limpieza posterior). Recordar
`synchronize: false` siempre.

## Evaluación MCP

**¿Aplica MCP?** Sí

- **MCP existente a modificar:** `todo-api` (`backend/src/mcp/mcp.service.ts`,
  método `registerDebtTools()`, líneas 1388-1444 actuales).
- **Tools a eliminar:** `pay_debt_installment` (líneas 1430-1443). Se elimina junto
  con el endpoint REST `POST /finances/debts/:id/pay` y
  `DebtsService.payInstallment()`. **El usuario confirmó que ningún agente activo
  la consume.**
- **Tools a modificar:**
  - `create_debt` (líneas 1407-1428): agregar `startMonth` / `startYear` al schema
    Zod y documentar en la descripción el efecto colateral de creación automática
    de presupuestos e ítems.
  - `list_debts` (líneas 1389-1405): actualizar descripción y shape si
    `DebtWithRemaining` incorpora campos nuevos.
- **Tools a crear:** `pay_debt_full`, que envuelve `POST /finances/debts/:id/pay-off`.
- **System prompt afectado:** `docs/mcps/finanzas-personales.system-prompt.md` — es
  el único que menciona deudas (verificado; `asistente-personal.system-prompt.md`
  no las referencia).
- **Fase de MCP en este spec:** Fase 6.

## Decisiones técnicas

### 1. Vínculo `BudgetItem` ↔ deuda: FK `debtId` + `installmentNumber`

```ts
// budget_items (columnas nuevas)
debt: Debt | null                   // ManyToOne, nullable, onDelete: 'CASCADE'
installmentNumber: number | null    // 1..totalInstallments
// índice único parcial: (debtId, installmentNumber) WHERE "debtId" IS NOT NULL
```

**Alternativa evaluada — tabla puente `debt_installments`** (`debtId`, `number`,
`dueMonth`, `dueYear`, `budgetItemId`, `status`): más expresiva (permitiría cuotas
de valor variable y estado por cuota), pero su contenido es 100 % derivable de
`startMonth/startYear + totalInstallments + installmentValue`, obliga a un join
extra en toda lectura de presupuesto y duplica la fuente de verdad del calendario.
El alcance aprobado no contempla cuotas heterogéneas ni pagos parciales, así que
ese costo no se paga.

**Decisión: FK en `budget_items`.** Cumple los cuatro requisitos:

- **(a) borrar solo futuros:** filtrando por `debtId` y por los presupuestos cuyo
  `(year, month)` es posterior al mes en curso.
- **(b) derivar `paidInstallments`:** no depende de los ítems sino del calendario,
  así que sigue siendo correcto aunque falten ítems.
- **(c) eliminar deuda limpia sus ítems:** `ON DELETE CASCADE`, con el matiz de la
  decisión 7.
- **(d) borrar un presupuesto no rompe la deuda:** el cascade de
  `budgets → budget_items` solo elimina el ítem; la deuda conserva su calendario y
  `sync-budget-items` lo recrea.

### 2. Cuota vencida vs. futura, y saldo restante

Se compara siempre contra el mes/año **del servidor**, nunca contra el `date` de un
gasto:

```
monthIndex(y, m) = y * 12 + (m - 1)
elapsed          = monthIndex(hoy) - monthIndex(startYear, startMonth) + 1
paidInstallments = clamp(elapsed, 0, totalInstallments)
```

- La cuota **del mes en curso cuenta como vencida**: ya está presupuestada y se
  paga dentro del mes.
- **Futura** = cuota cuyo mes es estrictamente posterior al mes en curso.
- `remainingValue = (totalInstallments - paidInstallments) * installmentValue`
  (misma fórmula que hoy, con `paidInstallments` derivado).
- En el **pago total**, el monto del `Expense` es exactamente ese `remainingValue`
  — solo las cuotas futuras. La del mes en curso permanece en el presupuesto porque
  ya estaba comprometida. Si `remainingValue === 0`, se rechaza con
  `BadRequestException`.

### 3. Estado de la deuda sin pago manual

- `paidInstallments` **deja de persistirse**: se elimina la columna y pasa a ser
  campo calculado de `DebtWithRemaining`, mismo patrón que `remainingValue`.
- `status` **sí se persiste**, pero solo cambia a `pagada` en el pago total
  anticipado (junto con `paidOffAt`).
- El **estado efectivo** es `pagada` si `status === 'pagada'` **o** si
  `paidInstallments >= totalInstallments`. Para que el filtro `?status=` no mienta,
  `findAll()` normaliza de forma perezosa: lee todas las deudas (hoy `findAll` no
  pagina), persiste `status = 'pagada'` en las que el calendario ya completó y
  recién entonces filtra. Es idempotente y evita introducir un cron.
- Si la deuda está `pagada`, entonces `paidInstallments = totalInstallments` y
  `remainingValue = 0` por definición.

### 4. Migración de las deudas existentes

1. `startMonth` / `startYear` se calculan **preservando el progreso actual**:
   `start = mesActual - paidInstallments + 1`. Así la derivación de la decisión 2
   devuelve exactamente el `paidInstallments` que la deuda tiene hoy. Para deudas
   con `paidInstallments = 0`, `start = mes siguiente al actual` (misma regla que
   el default del formulario).
2. Deudas ya en `pagada`: `paidOffAt = updatedAt`.
3. **No se generan `BudgetItem` retroactivos ni futuros en la migración.** Los meses
   pasados ya fueron presupuestados a mano y crear ítems retroactivos alteraría
   presupuestos históricos cerrados. Las cuotas futuras de las deudas heredadas se
   materializan con una acción explícita del usuario: botón "Sincronizar
   presupuestos" en `DebtCard` → `POST /finances/debts/:id/sync-budget-items`
   (idempotente, decisión 8). Se documenta como paso post-despliegue.
4. `DROP COLUMN paidInstallments` va en la **segunda** migración (Fase 7), después
   de verificar el backfill, para que un rollback del deploy no pierda el dato.

### 5. Transaccionalidad

`create`, `update`, `payOff`, `remove` y `syncBudgetItems` se ejecutan dentro de
`this.dataSource.transaction(async (manager) => …)`, mismo patrón que
`budgets.service.ts:create/duplicate`. `DebtsService` pasa a inyectar `DataSource` y
opera con `manager` sobre `Debt`, `Budget`, `BudgetItem` y `Expense` — sin llamar a
`BudgetsService`, lo que evita romper la transacción usando repositorios fuera del
manager y evita acoplamiento entre servicios. Crear una deuda de 12 cuotas que toca
12 presupuestos es una sola unidad atómica.

### 6. Editar una deuda existente

Dentro de una transacción, según lo que cambie:

- `description` → se actualiza en **todos** los ítems (vencidos y futuros), por
  coherencia visual del histórico.
- `installmentValue`, `totalInstallments`, `startMonth`, `startYear` → se
  **regeneran solo los ítems futuros**: se borran los de meses estrictamente
  posteriores al actual y se recrean con el nuevo calendario, creando presupuestos
  faltantes si el plazo se alargó. Los vencidos (incluido el del mes en curso)
  **no se tocan**: representan compromisos ya presupuestados.
- `productValue` / `initialPayment` → no afectan ítems.
- Si la deuda está `pagada`, se rechaza la edición de campos de calendario con
  `BadRequestException`.
- El formulario advierte al usuario antes de guardar cuando el cambio implica
  regeneración.

### 7. Eliminar una deuda

`remove()` transaccional, **antes** de borrar la fila:

1. Ítems **vencidos** (mes ≤ actual): `debtId = NULL`, `installmentNumber = NULL`.
   Quedan como línea manual del presupuesto histórico — borrarlos reescribiría
   presupuestos de meses ya cerrados.
2. Ítems **futuros**: se eliminan.
3. Se borra la deuda. El `ON DELETE CASCADE` queda como red de seguridad.

### 8. Idempotencia y colisiones de presupuesto

- Al materializar cada cuota se busca `Budget` por `(month, year)`; si existe se
  **reutiliza** y solo se agrega el ítem; si no, se crea con nombre autogenerado
  `"Presupuesto <Mes> <Año>"` (ej. `Presupuesto Marzo 2027`).
- `syncBudgetItems` es idempotente gracias al índice único parcial
  `(debtId, installmentNumber)`: solo inserta las cuotas **futuras** que falten.
- La migración de esquema añade además el índice único `(month, year)` en `budgets`,
  que hoy `budgets.service.ts:duplicate()` **asume pero no garantiza** (lanza
  `ConflictException` tras un `findOne`, sin respaldo en base de datos; verificado:
  `budget.entity.ts` no declara ningún índice). La migración incluye un guard
  previo: si detecta pares `(month, year)` duplicados preexistentes, aborta con un
  mensaje que lista los IDs, para que el usuario los consolide manualmente en vez
  de perder datos.

### 9. Interacción con `budgets.duplicate()`

`duplicate()` copia hoy todos los `sourceBudget.items` (líneas 286-297). Si un mes
con cuota de deuda se duplica, la cuota quedaría duplicada en el destino además de
la generada por el calendario. **Solución:** filtrar
`sourceBudget.items.filter((i) => i.debt == null)` antes de clonar, ajustar
`itemsCopied` a la lista filtrada y usar esa misma lista en `computeTypeSummary`.
Se documenta en el system prompt del MCP de finanzas.

### 10. Los ítems de cuota siguen siendo editables

Por decisión explícita del usuario, un `BudgetItem` con `debtId` **se edita y se
borra como cualquier otro** desde `BudgetDetailView`; solo se marca con un badge
"Deuda" para que se distinga. No se añaden guards en `updateItem()` ni en
`removeItem()`.

Consecuencias asumidas, que deben quedar cubiertas por las pruebas:

- Si el usuario **borra** un ítem de cuota futuro, `sync-budget-items` lo recrea.
- Si **edita el monto**, el ítem queda desincronizado de `installmentValue` hasta
  la próxima regeneración (edición de la deuda), que lo sobrescribirá si el mes es
  futuro.

## Fases de implementación

### Fase 1 — Esquema y migración de datos ✅ Completada

- [x] `entities/debt.entity.ts`: agregadas `startMonth` (`int`), `startYear`
      (`int`), `paidOffAt` (`timestamptz`, nullable). Se mantiene
      `paidInstallments` (se elimina en Fase 7).
- [x] `entities/budget-item.entity.ts`: agregada relación `debt` (`ManyToOne`,
      nullable, `onDelete: 'CASCADE'`) + `installmentNumber` (`int`, nullable) +
      índice único parcial `(debtId, installmentNumber)`.
- [x] `entities/budget.entity.ts`: agregado índice único `(month, year)`.
- [x] Migración `AddDebtScheduleAndBudgetItemLink1786714977098` escrita a mano
      (el `migration:generate` automático arrastraba ruido no relacionado —
      renombraba el enum compartido `expenses_type_enum` y recreaba FKs de
      `activities`/`expenses` por diferencias de estrategia de nombres; se
      descartó ese diff y se escribió la migración quirúrgica): guard previo que
      aborta si hay `(month, year)` duplicados en `budgets` (no se encontraron en
      local), columnas nullable → backfill → `NOT NULL`, backfill de
      `startMonth`/`startYear` preservando el progreso (`start = mesActual −
      paidInstallments + 1`) y de `paidOffAt = updatedAt` en deudas `pagada`, FK +
      índices nuevos.
- [x] `down()` revierte columnas e índices sin tocar `paidInstallments`.
- [x] Ejecutada en local (`npm run migration:run`) y verificado el backfill: la
      deuda existente (`Nevera Samsung`, 12 cuotas, 1 pagada) quedó con
      `startMonth=8`, `startYear=2026` — coherente con el mes actual (agosto 2026)
      y con su progreso previo.
- [x] `npm run build` compila sin errores tras los cambios de entidades.

### Fase 2 — Servicio de deudas: calendario y creación ✅ Completada

- [ ] `create-debt.dto.ts`: agregar `startMonth` (`@IsInt() @Min(1) @Max(12)`) y
      `startYear` (`@IsInt() @Min(2000)`), ambos requeridos.
- [ ] `debts.service.ts`: inyectar `DataSource`; agregar los helpers de calendario
      como **funciones puras exportadas** del módulo (para que sean testeables sin
      instanciar el servicio) — los nombres son los que ya asumen
      `debts.service.spec.ts`, y deben respetarse:
      `monthIndex(year, month)`, `computePaidInstallments(debt, today)`,
      `computeRemainingValue(debt, today)`, `isDebtEffectivelyPaid(debt, today)`,
      `isFutureMonth(month, year, today)` y
      `buildInstallmentSchedule(debt)` (devuelve `{ number, month, year }[]`).
- [ ] Reescribir `withRemaining()` para devolver `paidInstallments` derivado,
      `remainingValue`, estado efectivo y `nextInstallment`
      (`{ number, month, year } | null`) para la UI.
- [ ] Reescribir `create()` como transacción: guardar la deuda, recorrer el
      calendario, reutilizar o crear el `Budget` de cada `(month, year)` con nombre
      autogenerado, e insertar un `BudgetItem` por cuota
      (`description: "Cuota N/M — <descripción>"`, `plannedAmount: installmentValue`,
      `type: ExpenseType.PAGO_DEUDA`, `debt`, `installmentNumber`).
- [ ] Normalización perezosa de `status` en `findAll()` / `findOne()` (decisión 3) y
      filtrado por estado efectivo.

### Fase 3 — Pago total, edición, borrado y sincronización ✅ Completada

- [x] `debts.service.ts`: eliminar `payInstallment()` por completo.
- [x] Agregar `payOff(id)` transaccional: validar que no esté `pagada` y que
      `remainingValue > 0`; borrar los `BudgetItem` de la deuda en meses
      estrictamente futuros; crear `Expense`
      (`description: "Pago total: <descripción>"`, `amount: remainingValue`,
      `date: hoy`, `type: PAGO_DEUDA`); setear `status = 'pagada'` y
      `paidOffAt = now()`. Devolver `{ debt, expenseId, itemsRemoved }`.
- [x] Agregar `syncBudgetItems(id)` idempotente: recrear solo las cuotas futuras
      faltantes (creando presupuestos si hace falta). No toca vencidas ni deudas
      `pagada`. Devolver `{ itemsCreated, budgetsCreated }`.
- [x] Reescribir `update()` con la política de regeneración de la decisión 6.
- [x] Reescribir `remove()` con la política de la decisión 7.
- [x] `debts.controller.ts`: eliminar `POST :id/pay`; agregar `POST :id/pay-off` y
      `POST :id/sync-budget-items`, con decoradores Swagger equivalentes a los
      existentes.

### Fase 4 — Presupuestos: exclusión en duplicado y exposición del vínculo ✅ Completada

- [x] `budgets.service.ts → duplicate()`: filtrar los ítems con `debt != null` antes
      de clonar; ajustar `itemsCopied` y la lista pasada a `computeTypeSummary`.
- [x] `findOne()`/`findAll()` de `budgets.service.ts` ahora encadenan
      `.leftJoinAndSelect('items.debt', 'itemsDebt')` — el ítem expone la
      relación `debt` completa (no un `debtId` plano; el frontend deriva
      presencia con `item.debt`), más `installmentNumber` como columna directa.
- [x] **No** añadir guards en `updateItem()` / `removeItem()`: los ítems de cuota
      siguen siendo editables y borrables (decisión 10).

### Fase 5 — Frontend ✅ Completada

- [x] Leer `frontend/DESIGN.md` antes de tocar UI.
- [x] `types/index.ts`: actualizar `Debt`, `CreateDebtDto`, `BudgetItem`; agregar
      `PayOffDebtResult` y `SyncBudgetItemsResult`; eliminar `PayInstallmentResult`.
      Los tipos deben coincidir exactamente con los DTOs de las Fases 2-4.
- [x] `services/finances/debts.service.ts`: eliminar `payInstallment`; agregar
      `payOffDebt(id)` y `syncDebtBudgetItems(id)`.
- [x] `hooks/finances/useDebts.ts`: eliminar `usePayInstallment`; agregar
      `usePayOffDebt` y `useSyncDebtBudgetItems`, ambos invalidando `['debts']`,
      `['budgets']` y `['expenses']`. `useCreateDebt`, `useUpdateDebt` y
      `useDeleteDebt` pasan a invalidar además `['budgets']`.
- [x] `components/finances/DebtForm.tsx`: agregar "Mes de inicio" y "Año de inicio"
      al schema Zod y al formulario, con default mes siguiente al actual; mostrar
      aviso de regeneración de cuotas futuras cuando `initial` está presente y
      cambian plazo, valor de cuota o mes de inicio.
- [x] `components/finances/DebtCard.tsx`: eliminar el botón "Pagar cuota" y las
      props `onPay` / `isPaying`; agregar "Pagar deuda completa" (oculto si
      `status === 'pagada'`) y "Sincronizar presupuestos"; mostrar mes de inicio y
      próxima cuota junto al progreso.
- [x] `pages/finances/DebtsView.tsx`: reemplazar `usePayInstallment` por
      `usePayOffDebt`; agregar `ConfirmDialog` que explique el efecto (borra las
      cuotas futuras y registra el saldo como gasto del mes en curso) con el monto
      exacto.
- [x] `pages/finances/BudgetDetailView.tsx`: badge "Deuda" en los ítems con
      `debtId`, conservando su edición y borrado.

### Fase 6 — MCP: actualizar `todo-api` ✅ Completada

- [x] En `mcp.service.ts`, eliminado el bloque `server.tool('pay_debt_installment', …)`
      de `registerDebtTools()`.
- [x] Actualizado `create_debt`: agregados al schema Zod `startMonth` y
      `startYear` — **requeridos** (no opcionales, ajuste respecto al borrador
      original de esta fase: `CreateDebtDto` los exige en el DTO real de la
      Fase 2, así que el schema MCP debe reflejarlo exactamente — la regla del
      `CLAUDE.md` raíz es "declarar en su schema Zod exactamente los mismos
      campos que el DTO real"). Descripción actualizada advirtiendo el efecto
      colateral de creación automática de presupuestos/ítems.
- [x] Agregar la tool `pay_debt_full`: input `{ debtId: z.string().uuid() }`;
      descripción del efecto (borra cuotas futuras, registra el saldo restante como
      `pago_deuda` del mes en curso, marca la deuda como `pagada`); handler sobre
      `DebtsService.payOff`; errores de negocio con el mismo patrón `ok(…)` / `err(…)`
      del resto de tools de deudas.
- [x] Revisar `list_debts`: actualizar descripción y shape si `DebtWithRemaining`
      incorpora `startMonth` / `startYear` / `nextInstallment` y cuotas derivadas.
- [x] Actualizar `docs/mcps/finanzas-personales.system-prompt.md`:
  - Tabla de tools de deudas (líneas 260-262): quitar la fila de
    `pay_debt_installment`, ajustar `create_debt` (línea 261) con
    `startMonth`/`startYear` y su efecto sobre presupuestos, agregar fila de
    `pay_debt_full`.
  - Sección "Deudas (`debts`)" (líneas 145-163): reemplazar el flujo de pago de
    cuota individual por el de pago total y la generación automática de ítems.
  - Restricciones (líneas 440-444): actualizar los parámetros de registro de deuda,
    eliminar la referencia a `pay_debt_installment` y sustituirla por la
    restricción equivalente de `pay_debt_full`.
  - Ejemplos de conversación (líneas 501-514): reescribir el ejemplo "Marca como
    pagada la cuota de…" con el nuevo flujo.
  - Documentar que `duplicate_budget` **no** arrastra cuotas de deuda.
  - Verificar que `grep -n "pay_debt_installment" docs/mcps/finanzas-personales.system-prompt.md`
    devuelve 0 resultados.
- [x] Verificar/actualizar `docs/mcps/README.md` (fila `todo-api`, línea 11).
- [x] Verificar que el MCP responde: `create_debt` con y sin `startMonth`/`startYear`,
      `pay_debt_full` sobre deuda activa y sobre pagada, `list_debts` con el shape
      nuevo, y que `pay_debt_installment` ya no aparece en el listado de tools.

### Fase 7 — Limpieza del modelo antiguo ✅ Completada

- [x] Eliminada la columna `paidInstallments` de `debt.entity.ts`; migración
      `DropPaidInstallmentsFromDebts1786715738000` ejecutada en local tras
      verificar el backfill de la Fase 1.
- [x] `grep` confirma cero referencias activas a `payInstallment`,
      `pay_debt_installment` ni `PayInstallmentResult` (la única mención
      restante es la nota histórica en `backend/CLAUDE.md` documentando que se
      eliminó).
- [x] `backend/CLAUDE.md` actualizado: entidad `Debt`, `BudgetItem`/`Budget`
      (FK e índices nuevos), tabla de rutas de `debts`, sección "Lógica de
      Negocio — Deudas", tools MCP, árbol de migraciones y archivos clave.
- [x] `frontend/CLAUDE.md` actualizado (`POST /debts/:id/pay-off` y
      `/sync-budget-items` en vez de `POST /debts/:id/pay`).
- [x] `docs/mcps/finanzas-personales.system-prompt.md` actualizado: tabla de
      campos de `debts`, reglas de negocio, tabla de tools, restricciones y
      ejemplos de conversación — sin menciones a `pay_debt_installment`.
- No se detectó deuda técnica fuera de alcance que registrar en
  `spec/backlog.md`.

### Fase 8 — Pruebas ✅ Completada

> Los archivos de esta fase se escriben **junto con el spec**, antes de la
> aprobación de implementación. Su posición al final indica cuándo se ponen en
> verde, no cuándo se escriben.

- [x] Casos manuales de `docs/testing/test-026-deudas-cuotas-en-presupuesto.md`
      ejecutados y aprobados por el usuario: **21/22** (`TC-026-016`, deudas
      legacy tras la migración, queda diferido por diseño a la ventana de
      despliegue — no ejecutable de forma fiel en desarrollo local).
- [x] `backend/test/e2e-026-deudas-cuotas-en-presupuesto.e2e-spec.ts` en verde
      (13/13; el ajuste de `Number(...)` en `installmentValue` de AC-8 sigue la
      convención existente del proyecto para columnas `decimal`, no cambia
      ningún criterio de aceptación).
- [x] `backend/src/finances/debts.service.spec.ts` en verde (20/20).
- [x] Resto de la suite backend intacta: `npm run test` 49/49; `npm run
      test:e2e` 58/60 — las 2 fallas (`app.e2e-spec.ts`, `auth.e2e-spec.ts`)
      son preexistentes y no relacionadas con este spec (confirmado
      reproduciéndolas con `git stash` sobre el código previo a spec-026).
- [x] `@tester` ejecutado como fase final antes del merge — confirma 33/33
      casos automáticos de spec-026 en verde (20 unit + 13 e2e) y reproduce las
      mismas 2 fallas preexistentes ya identificadas, sin bloquear el spec.
- [x] Un bug encontrado y corregido durante la ronda manual (falso positivo del
      aviso de regeneración en `DebtForm.tsx`, commit `79ef769`) — ver
      hallazgos de `TC-026-008` en `test-026`.
- [x] Datos de prueba de la ronda manual eliminados y verificados contra la
      línea base previa a la ronda (commit `9a4a9eb`).
- [ ] Ejecutar `npm run test` y `npm run test:e2e` vía `@tester` antes del merge.

## Criterios de aceptación

1. Al crear una deuda de N cuotas con mes de inicio M/A existen exactamente N
   `BudgetItem` de tipo `pago_deuda`, uno por mes consecutivo desde M/A, cada uno
   con `debtId` e `installmentNumber` correctos.
2. Los meses del plazo que no tenían presupuesto quedan creados con nombre
   autogenerado; los que ya existían **no** se duplican y solo reciben el ítem.
3. La creación es atómica: si falla la inserción de cualquier ítem, no queda ni la
   deuda ni ningún presupuesto o ítem nuevo.
4. `paidInstallments` y `remainingValue` se derivan del calendario: una deuda
   iniciada hace 3 meses (contando el actual) reporta `paidInstallments = 3` sin
   ninguna acción del usuario.
5. Una deuda cuyo último mes de cuota ya pasó (o es el mes en curso) aparece con
   estado `pagada` y `remainingValue = 0`.
6. `POST /finances/debts/:id/pay-off` elimina **solo** los ítems de meses
   estrictamente futuros, conserva el del mes en curso, crea un `Expense` de tipo
   `pago_deuda` por el saldo restante con fecha de hoy, y deja la deuda en `pagada`
   con `paidOffAt`.
7. `POST /finances/debts/:id/pay-off` sobre una deuda ya `pagada` o sin saldo
   devuelve `400`.
8. Editar `installmentValue` o `totalInstallments` regenera solo los ítems futuros;
   los de meses vencidos conservan su valor original.
9. Eliminar una deuda borra sus ítems futuros y desasocia (sin borrar) los vencidos;
   los presupuestos históricos conservan su total.
10. Borrar un presupuesto que contenía una cuota no altera la deuda;
    `POST /finances/debts/:id/sync-budget-items` recrea la cuota faltante si el mes
    es futuro, y ejecutarlo dos veces seguidas no crea duplicados.
11. Duplicar un mes financiero que contiene cuotas de deuda **no** copia esas cuotas
    al mes destino; `itemsCopied` refleja el número real de ítems copiados.
12. Los endpoints `POST /finances/debts/:id/pay` y la tool MCP
    `pay_debt_installment` ya no existen; la UI no ofrece "Pagar cuota" en ninguna
    vista.
13. En `BudgetDetailView` los ítems de cuota se distinguen con un badge "Deuda" y
    siguen siendo editables y borrables; tras borrar uno futuro,
    "Sincronizar presupuestos" lo recrea.
14. Las deudas creadas antes del spec conservan su progreso tras la migración
    (`paidInstallments` derivado == valor previo) y pueden materializar sus cuotas
    futuras con "Sincronizar presupuestos".
15. El agente puede invocar `create_debt` con `startMonth`/`startYear` y
    `pay_debt_full`, y obtiene los mismos efectos que la UI.

## Pruebas asociadas

> Estos archivos se crean junto con el spec (ver "Artefactos que acompañan al spec").

- **Manuales:** `docs/testing/test-026-deudas-cuotas-en-presupuesto.md` — casos
  `TC-026-NNN` y `TC-MCP-026-NNN`.
- **Automáticas (backend):**
  `backend/test/e2e-026-deudas-cuotas-en-presupuesto.e2e-spec.ts` — 13 casos que
  cubren los criterios de backend (el sufijo `.e2e-spec.ts` es el que exige el
  `testRegex` de `backend/test/jest-e2e.json`, igual que en los specs 023-025) — y
  `backend/src/finances/debts.service.spec.ts` — 20 casos de los helpers de
  calendario (cruce de año, plazo de 1 cuota, mes de inicio pasado y futuro) más la
  normalización perezosa de estado.

Estado inicial verificado en rojo: 12/13 e2e y 19/20 unit fallan por ausencia de la
implementación. El e2e que pasa (validación de `create`) lo hace por el `400`
genérico del `ValidationPipe` con whitelist, no porque la lógica exista.

## Riesgos y notas de despliegue

- **Índice único `(month, year)` en `budgets`:** no existe hoy. Si la base de
  producción ya tiene meses duplicados, la migración aborta listando los IDs y hará
  falta consolidarlos manualmente antes de desplegar.
- **Deudas heredadas sin ítems automáticos:** requieren que el usuario pulse
  "Sincronizar presupuestos" una vez por deuda activa tras el despliegue
  (decisión del usuario, frente a la generación masiva automática).
- **`DROP COLUMN paidInstallments`** es irreversible en la práctica; por eso se
  separa en la migración de la Fase 7, tras verificar el backfill.
- No se requieren dependencias nuevas ni cambios en `frontend/DESIGN.md`: los
  componentes reutilizan `Modal`, `ConfirmDialog` y `EmptyState` existentes.

## Aprobación de implementación

> Claude no escribe código de implementación hasta que esta sección esté marcada.

- [x] Paquete (spec + pruebas) aprobado por el usuario
- **Fecha de aprobación:** 2026-08-14
