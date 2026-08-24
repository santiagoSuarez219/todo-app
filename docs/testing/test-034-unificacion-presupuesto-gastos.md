# test-034 — Unificación de presupuesto y gastos

> Redactado en modo test-first (`@tester`), junto con
> `spec/spec-034-unificacion-presupuesto-gastos.md`, **antes** de que exista
> una sola línea de implementación. Todos los casos quedan en `⬜ Pendiente`
> hasta que las Fases 1–9 del spec estén completas y el usuario los ejecute.
>
> Este archivo asume el diseño **definitivo** del spec (a diferencia de
> `test-026`, aquí sí se leyó `spec-034` completo antes de redactar): nombres
> de campos, endpoints, shapes de respuesta y textos de UI citados abajo
> deben coincidir exactamente con las Fases 1–9 y el "Nuevo contrato de
> `get_monthly_expense_summary`". Si algo cambia durante la implementación
> (con la aprobación correspondiente), este archivo se actualiza junto con
> el cambio.

## Datos de prueba

> Recursos a crear vía API al momento de ejecutar esta ronda (no ahora — el
> spec aún no está implementado). Se completan con identificadores reales,
> endpoint exacto usado y estado de eliminación **al ejecutar**, siguiendo
> "Pruebas manuales asistidas por Claude" del `CLAUDE.md` raíz. Todos los
> recursos llevan el prefijo `[TEST spec-034]` en su descripción/nombre para
> distinguirlos de datos reales durante la limpieza. Los meses propuestos
> abajo son relativos a la fecha de **ejecución** de la ronda (no a la fecha
> de redacción de este archivo, 2026-08-22) — recalcular "mes en curso",
> "mes anterior" y "mes siguiente" contra la fecha real antes de crear nada.

| Recurso | Endpoint de creación | Identificador | Usado en | Eliminado |
|---|---|---|---|---|
| Presupuesto "[TEST spec-034] Mes A" (mes en curso) | `POST /finances/budgets` | `{{id-budget-a}}` | TC-034-001 a 005, 008, 011, 014–020, TC-MCP-034-001, 005–010, 013 | ⬜ |
| Presupuesto "[TEST spec-034] Mes B" (mes siguiente) | `POST /finances/budgets` | `{{id-budget-b}}` | TC-034-008, 009 (destino de anclaje cruzado) | ⬜ |
| Gasto planeado en Mes A ("Arriendo", `plannedAmount: 1200000`, sin `amount`/`date`) | `POST /finances/expenses` (`budgetId: {{id-budget-a}}`) | `{{id-expense-planned-a}}` | TC-034-001, 002, 004, 009, 015, 017, TC-MCP-034-006 | ⬜ |
| Gasto planeado en Mes A, ejecutado ("Streaming", `plannedAmount: 100000`, `amount: 95000`, `date` de Mes A) | `POST /finances/expenses` luego `PATCH` | `{{id-expense-settled-a}}` | TC-034-001, 003 (doble conteo) | ⬜ |
| Gasto planeado en Mes A, ejecutado con `date` de Mes B (anclaje) | `POST /finances/expenses` (`budgetId: {{id-budget-a}}`) luego `PATCH amount+date-de-mes-B` | `{{id-expense-anchored}}` | TC-034-008 | ⬜ |
| Gasto suelto ejecutado sin presupuesto (mes lejano sin `Budget`, ej. `+3` años) | `POST /finances/expenses` (`amount`+`date`, sin `budgetId`) | `{{id-expense-loose}}` | TC-034-007, 018 | ⬜ |
| Tarjeta de crédito "[TEST spec-034] Visa" | `POST /finances/credit-cards` | `{{id-card}}` | TC-034-005, TC-MCP-034-007 | ⬜ |
| Gasto ejecutado con tarjeta en Mes A (`amount: 300000`, `creditCardId: {{id-card}}`) | `POST /finances/expenses` | `{{id-expense-card}}` | TC-034-005 | ⬜ |
| Deuda "[TEST spec-034] DEBT — Nevera" (3 cuotas, `startMonth`/`startYear` = Mes A) | `POST /finances/debts` | `{{id-debt}}` | TC-034-012, 013, TC-MCP-034-006 (opcional) | ⬜ |
| Gasto planeado en Mes C (mes sin presupuesto, muy futuro) creado vía `create_expense` MCP | `tools/call create_expense` en `/mcp` local | `{{id-expense-mcp}}` | TC-MCP-034-001, 002, 003, 004, 005 | ⬜ |

**Entorno de pruebas:** desarrollo (`http://localhost:3003/api/v1`). **Nunca**
crear estos datos en producción sin confirmación explícita.
**Fecha de la ronda:** {{a completar al ejecutar}}.

**Notas de uso:**
- Antes de crear el Presupuesto "Mes A", verificar si el mes en curso ya
  tiene un presupuesto real en el entorno — si es así, **reutilizarlo** y
  documentarlo aquí (mismo criterio que `test-026`), limpiando al final solo
  los gastos agregados por esta ronda, no el presupuesto completo.
- `{{id-expense-anchored}}` es el caso más delicado del criterio 4: se crea
  en Mes A (queda con `budgetId` de Mes A por auto-vínculo) y luego se
  ejecuta (`PATCH`) con una `date` que cae en Mes B. Según decisión 3, el
  `budgetId` **no** se reancla automáticamente al cambiar `date` sobre un
  gasto que ya tenía presupuesto — debe seguir apareciendo en el resumen de
  Mes A y no en el de Mes B.

---

## Casos de prueba

### TC-034-001 — `BudgetDetailView`: la tabla muestra plan y real en la misma fila
**Precondición:** Presupuesto Mes A con `{{id-expense-planned-a}}` (solo plan)
y `{{id-expense-settled-a}}` (plan + ejecutado).
**Datos de prueba usados:** `{{id-budget-a}}`, `{{id-expense-planned-a}}`,
`{{id-expense-settled-a}}`.
**Pasos:**
1. Navegar a `/finances/budgets` y abrir el detalle de "Mes A".
2. Ubicar la fila de "Arriendo" (solo planeado) y la de "Streaming" (plan +
   ejecutado) en la tabla.
**Resultado esperado:** La fila de "Arriendo" muestra `Planeado: $1.200.000`
y las columnas `Real`/`Fecha` vacías, con la acción **"Registrar ejecución"**
visible. La fila de "Streaming" muestra `Planeado: $100.000` y
`Real: $95.000` en la misma fila, sin necesidad de buscar en otra tabla ni
sección.
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-034-002 — "Registrar ejecución" completa un gasto planeado sin salir de la vista
**Precondición:** Gasto `{{id-expense-planned-a}}` ("Arriendo") solo tiene
`plannedAmount`, sin `amount`/`date`.
**Datos de prueba usados:** `{{id-expense-planned-a}}`.
**Pasos:**
1. En el detalle de "Mes A", ubicar la fila de "Arriendo".
2. Hacer clic en "Registrar ejecución".
3. Completar monto real (`1200000`) y fecha (dentro de Mes A).
4. Guardar.
**Resultado esperado:** La fila pasa a mostrar `Real: $1.200.000` y la fecha
elegida, sin recargar la página ni navegar fuera de `BudgetDetailView`. El
gasto pasa de estado `planned` a `settled` (verificable vía
`GET /finances/expenses/{{id-expense-planned-a}}`: `plannedAmount` y `amount`
ambos no nulos).
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-034-003 — Sin doble conteo: un gasto planeado y ejecutado no suma dos veces
**Precondición:** `{{id-expense-settled-a}}` tiene `plannedAmount: 100000` y
`amount: 95000` en Mes A.
**Datos de prueba usados:** `{{id-budget-a}}`, `{{id-expense-settled-a}}`.
**Pasos:**
1. Abrir el detalle de "Mes A".
2. Ubicar el bloque de resumen "Planeado / Ejecutado / Varianza".
3. Sumar manualmente, aparte, todos los `plannedAmount` y todos los `amount`
   de los gastos visibles en la tabla del mes.
**Resultado esperado:** El `plannedTotal` mostrado coincide con la suma
manual de `plannedAmount` (incluye los `100.000` de "Streaming" una sola
vez). El `executedTotal` coincide con la suma manual de `amount` (incluye
los `95.000` una sola vez). En ningún bloque de resumen aparece `195.000`
(ni la suma de ambos) como si fuera un total único de ese gasto.
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-034-004 — Bloques "Pendiente por ejecutar" y "No presupuestado"
**Precondición:** "Arriendo" (`{{id-expense-planned-a}}`) solo planeado;
existe además al menos un gasto ejecutado sin plan en Mes A (crear uno ad
hoc: `POST /finances/expenses` con `amount`+`date` de Mes A, sin
`plannedAmount` ni `budgetId` explícito — debe auto-vincularse a Mes A por
`date`).
**Datos de prueba usados:** `{{id-budget-a}}`, `{{id-expense-planned-a}}`,
`{{id-expense-no-plan-ad-hoc}}`.
**Pasos:**
1. Abrir el detalle de "Mes A".
2. Ubicar "Pendiente por ejecutar" y "No presupuestado" en el resumen.
**Resultado esperado:** "Pendiente por ejecutar" incluye el `plannedAmount`
de "Arriendo" (`$1.200.000`, ya que `amount` sigue null). "No presupuestado"
incluye el `amount` del gasto ad hoc recién creado (tiene `amount` pero no
`plannedAmount`). Ninguno de los dos gastos se cuenta en el otro bloque.
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-034-005 — "Total por tarjeta" con dos columnas (planeado / ejecutado)
**Precondición:** `{{id-expense-card}}` (`amount: 300000`,
`creditCardId: {{id-card}}`) existe en Mes A. Agregar además un gasto
**planeado** con la misma tarjeta (`plannedAmount: 200000`,
`creditCardId: {{id-card}}`, sin `amount`/`date`).
**Datos de prueba usados:** `{{id-budget-a}}`, `{{id-card}}`,
`{{id-expense-card}}`, `{{id-expense-card-planned}}`.
**Pasos:**
1. Abrir el detalle de "Mes A" y ubicar "Total por tarjeta".
**Resultado esperado:** La fila de la tarjeta "[TEST spec-034] Visa" muestra
dos columnas: `Planeado: $200.000` y `Ejecutado: $300.000`, no un solo total
combinado.
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-034-006 — Auto-vínculo al crear un gasto con fecha en un mes con presupuesto
**Precondición:** Presupuesto de Mes A existe.
**Datos de prueba usados:** `{{id-budget-a}}`.
**Pasos:**
1. Ir a `/finances/expenses` y crear un gasto nuevo con `amount` y `date`
   dentro de Mes A, sin seleccionar presupuesto explícitamente en el
   formulario (si el formulario no expone el campo, usar la creación
   estándar de gasto ejecutado).
2. Verificar el gasto creado vía `GET /finances/expenses/{{id}}`.
3. Abrir el detalle de "Mes A" y confirmar que el gasto aparece en su tabla.
**Resultado esperado:** El gasto queda con `budgetId` igual al de "Mes A"
sin que el usuario lo haya seleccionado manualmente, y aparece en la tabla
del presupuesto de Mes A.
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-034-007 — Gasto suelto en un mes sin presupuesto: no se crea ningún presupuesto
**Precondición:** El mes elegido (muy futuro, ej. `+3` años) no tiene
presupuesto.
**Datos de prueba usados:** `{{id-expense-loose}}`.
**Pasos:**
1. Confirmar (`GET /finances/budgets?year=&month=`) que el mes destino no
   tiene presupuesto.
2. Crear un gasto ejecutado (`amount`+`date`) con fecha en ese mes.
3. Repetir la consulta de presupuestos del paso 1.
**Resultado esperado:** El gasto se crea con `budgetId: null`. El mes sigue
sin ningún presupuesto — no se generó uno automáticamente. El gasto aparece
igual en `ExpensesView` filtrando por ese mes/año (por su `date`), y en
`get_monthly_expense_summary` de ese mes contribuye a `unplannedTotal`.
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-034-008 — Anclaje por presupuesto: planeado en Mes A, ejecutado con fecha de Mes B, cuenta en Mes A
**Precondición:** `{{id-expense-anchored}}` fue creado con `budgetId` de
Mes A (por auto-vínculo, al tener originalmente `date` en Mes A) y luego
actualizado (`PATCH`) para agregar `amount` con una `date` que cae en Mes B.
**Datos de prueba usados:** `{{id-budget-a}}`, `{{id-budget-b}}`,
`{{id-expense-anchored}}`.
**Pasos:**
1. Confirmar el estado del gasto vía `GET /finances/expenses/{{id-expense-anchored}}`:
   `budgetId` debe seguir apuntando a Mes A, `date` debe caer en Mes B.
2. Abrir el detalle de "Mes A" y confirmar que el gasto aparece en la tabla,
   con su monto ejecutado y la fecha de Mes B visibles.
3. Abrir el detalle de "Mes B" y confirmar que el gasto **no** aparece.
4. Filtrar `ExpensesView` por Mes B (mes/año de la `date`) y confirmar que el
   gasto **no** aparece en ese filtro tampoco.
**Resultado esperado:** El gasto cuenta íntegramente en Mes A (planeado y
ejecutado), pese a que su `date` real cae en Mes B. No aparece en ningún
listado o resumen de Mes B pese a la fecha.
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-034-009 — Duplicar un mes copia solo el plan
**Precondición:** Mes A tiene `{{id-expense-planned-a}}` (`plannedAmount`
solo) y `{{id-expense-settled-a}}` (plan + ejecutado).
**Datos de prueba usados:** `{{id-budget-a}}`.
**Pasos:**
1. Desde `BudgetsView`, duplicar "Mes A" a un mes destino sin presupuesto
   previo (ej. `+6` meses desde Mes A).
2. Revisar el modal de resultado (`plannedExpensesCopied`) y el contenido
   del presupuesto destino.
**Resultado esperado:** El modal reporta `plannedExpensesCopied` (no
`itemsCopied`) igual al número de gastos con `plannedAmount` no nulo en Mes A
(2, sin contar los sin plan). En el presupuesto destino, ambos gastos
copiados tienen su `plannedAmount` original pero `amount` y `date` en
**null** — ni siquiera el que en origen estaba `settled` (`$95.000`
ejecutado) trae su ejecución al destino.
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-034-010 — Duplicar un gasto individual copia todo (asimetría con TC-034-009)
**Precondición:** `{{id-expense-settled-a}}` tiene `plannedAmount: 100000`,
`amount: 95000` y `date` en Mes A.
**Datos de prueba usados:** `{{id-expense-settled-a}}`.
**Pasos:**
1. Desde `ExpensesView` o `BudgetDetailView`, duplicar
   `{{id-expense-settled-a}}` a otro mes (ej. Mes A + 2).
2. Revisar el gasto duplicado.
**Resultado esperado:** El gasto duplicado conserva `amount: 95000` y una
`date` desplazada al mes destino (no null) — a diferencia de TC-034-009,
duplicar un gasto individual clona el hecho completo, ejecución incluida.
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-034-011 — Borrar un presupuesto advierte cuántos gastos ejecutados se pierden
**Precondición:** Mes A tiene al menos un gasto ejecutado
(`{{id-expense-settled-a}}`, `amount: 95000`) y uno solo planeado.
**Datos de prueba usados:** `{{id-budget-a}}`.
**Pasos:**
1. Ir al detalle de "Mes A" y hacer clic en eliminar presupuesto.
2. Leer el texto del `ConfirmDialog` antes de confirmar.
**Resultado esperado:** El diálogo indica explícitamente cuántos gastos
**ejecutados** se perderán (al menos 1) y por qué monto total (al menos
`$95.000`) — no un mensaje genérico tipo "¿Eliminar este presupuesto?". Al
confirmar, el presupuesto y **todos** sus gastos (planeados y ejecutados)
desaparecen (`GET /finances/expenses/{{id-expense-settled-a}}` → 404).
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-034-012 — Cuotas de deuda visibles como gastos planeados con badge "Deuda"
**Precondición:** Ninguna deuda "[TEST spec-034] DEBT — Nevera" existe
todavía.
**Datos de prueba usados:** payload de la deuda (3 cuotas, inicio en Mes A).
**Pasos:**
1. Crear la deuda desde `/finances/debts`.
2. Abrir el detalle del presupuesto de cada uno de los 3 meses del
   calendario.
**Resultado esperado:** Cada mes tiene un gasto con descripción
`"Cuota k/3 — [TEST spec-034] DEBT — Nevera"`, `plannedAmount` igual al
valor de cuota, `amount`/`date` en null (estado `planned`), y el badge
"Deuda" visible en la fila.
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-034-013 — Ciclo completo de deuda sobre el modelo nuevo: editar, eliminar, pagar
**Precondición:** Deuda de TC-034-012 existe con sus 3 cuotas planeadas.
**Datos de prueba usados:** `{{id-debt}}`.
**Pasos:**
1. Editar la deuda cambiando `installmentValue`. Confirmar que solo las
   cuotas de meses **futuros** cambian su `plannedAmount`; las vencidas
   (incluido el mes en curso) no se tocan.
2. Eliminar la deuda. Confirmar que las cuotas vencidas **permanecen** como
   gastos planeados normales (sin badge "Deuda", `debt`/`installmentNumber`
   en null) y las futuras se eliminan.
3. Repetir con una deuda nueva y usar "Pagar deuda completa": confirmar que
   se borran las cuotas futuras y se crea un gasto real
   (`plannedAmount: null`, `amount: saldo restante`, `date: hoy`).
**Resultado esperado:** Los tres comportamientos (edición parcial, borrado
con desasociación de vencidas, pago total) se replican exactamente igual que
en spec-026, pero operando sobre `Expense` en vez de `BudgetItem`.
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-034-014 — `ExpensesView`: filtro plan/ejecutado
**Precondición:** Existen gastos en estado `planned`, `executed` y `settled`
(ver datos de prueba de TC-034-001 a 004).
**Datos de prueba usados:** los ya creados en Mes A.
**Pasos:**
1. Ir a `/finances/expenses`.
2. Aplicar el filtro "Solo planeados" y luego "Solo ejecutados".
**Resultado esperado:** "Solo planeados" muestra los gastos con
`plannedAmount` no nulo (incluye `settled`, según se defina el filtro en la
Fase 8 — verificar contra la UI real qué combinación de estados cubre cada
opción y documentarlo aquí si difiere de esta expectativa). "Solo
ejecutados" muestra los que tienen `amount` no nulo. Ninguno de los dos
filtros rompe la lista si hay gastos con `date: null`.
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-034-015 — `ExpensesView`: edición inline con `plannedAmount`
**Precondición:** `{{id-expense-planned-a}}` visible en `/finances/expenses`.
**Datos de prueba usados:** `{{id-expense-planned-a}}`.
**Pasos:**
1. Ubicar el gasto en la lista y activar la edición inline.
2. Confirmar que el campo `plannedAmount` es editable junto a `amount`/`date`.
3. Cambiar `plannedAmount` y guardar.
**Resultado esperado:** El cambio se persiste (`GET /finances/expenses/:id`
refleja el nuevo `plannedAmount`) sin exigir `amount`/`date` para guardar.
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-034-016 — Gastos con fecha nula se renderizan sin romper la UI
**Precondición:** `{{id-expense-planned-a}}` tiene `date: null`.
**Datos de prueba usados:** `{{id-expense-planned-a}}`.
**Pasos:**
1. Ir a `/finances/expenses` y localizar el gasto.
2. Observar el formato de fecha y de monto (`amount`) en la card/fila.
**Resultado esperado:** No aparece `"Invalid Date"`, `NaN` ni un error de
consola; la columna/celda de fecha y de monto real muestran un placeholder
claro (ej. "—" o "Sin ejecutar") en lugar de romper el layout.
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-034-017 — Crear un gasto solo planeado desde el formulario
**Precondición:** Ninguna.
**Datos de prueba usados:** `{{id-budget-a}}`.
**Pasos:**
1. Desde el detalle de "Mes A", usar la acción de agregar gasto planeado
   (`PlannedExpenseForm` o el modo `planned` de `ExpenseForm`).
2. Completar descripción, `plannedAmount` y tipo, sin monto real ni fecha.
3. Guardar.
**Resultado esperado:** El gasto se crea con `budgetId` de Mes A y
`amount`/`date` en null, sin que el formulario los exija.
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-034-018 — Crear un gasto solo ejecutado en un mes sin presupuesto
**Precondición:** Mes muy futuro sin presupuesto.
**Datos de prueba usados:** `{{id-expense-loose}}` (reutilizado de TC-034-007).
**Pasos:**
1. Desde `/finances/expenses`, crear un gasto con `amount`+`date` en ese mes.
2. Ir a `/finances/budgets` y confirmar que ese mes sigue sin presupuesto.
**Resultado esperado:** El gasto se crea correctamente, sin exigir
`plannedAmount`, y sin crear un presupuesto para ese mes.
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-034-019 — El formulario rechaza guardar un gasto sin ningún monto
**Precondición:** Ninguna.
**Datos de prueba usados:** ninguno.
**Pasos:**
1. Abrir el formulario de gasto (modo estándar, no el planeado).
2. Completar solo la descripción y el tipo, dejando `plannedAmount`,
   `amount` y `date` vacíos.
3. Intentar guardar.
**Resultado esperado:** El formulario impide el envío (validación Zod en
cliente) con un mensaje claro. Si se fuerza el envío directo a
`POST /finances/expenses` sin ningún monto (vía API), responde `400`.
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-034-020 — `BudgetsView`: el total planeado viene del backend, no se recalcula en cliente
**Precondición:** Mes A tiene sus gastos de datos de prueba.
**Datos de prueba usados:** `{{id-budget-a}}`.
**Pasos:**
1. Ir a `/finances/budgets` y ubicar la card de "Mes A".
2. Comparar el total mostrado contra `plannedTotal` de
   `GET /finances/budgets/{{id-budget-a}}`.
3. Comparar además contra la suma manual de `plannedAmount` de todos los
   gastos del mes.
**Resultado esperado:** Los tres valores coinciden. La card ya no muestra
`items.length` como conteo de "ítems del presupuesto" (el concepto
desapareció); si se muestra un conteo, es de `expenses.length`.
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

## Casos de prueba (MCP)

### TC-MCP-034-001 — `create_expense` solo con `plannedAmount` y `budgetId` es aceptado
**Herramienta probada:** `create_expense` en `todo-api`
**Precondición:** `{{id-budget-a}}` existe.
**Input de prueba:**
```json
{
  "description": "[TEST spec-034] MCP - solo planeado",
  "plannedAmount": 250000,
  "budgetId": "{{id-budget-a}}",
  "type": "basico"
}
```
**Output esperado:** La tool crea el gasto con `plannedAmount: 250000`,
`amount: null`, `date: null`, `budgetId` igual al enviado. Verificar
cruzando con `GET /finances/expenses/{{id}}` por REST.
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-MCP-034-002 — `create_expense` sin ningún monto es rechazado con mensaje claro
**Herramienta probada:** `create_expense` en `todo-api`
**Precondición:** Ninguna.
**Input de prueba:**
```json
{
  "description": "[TEST spec-034] MCP - sin monto, debe fallar",
  "type": "basico"
}
```
**Output esperado:** La tool devuelve un error de validación del schema Zod
(`.refine()`), no un 500 ni una creación silenciosa con montos vacíos. El
mensaje debe nombrar la regla (al menos uno de `plannedAmount` o
`amount`+`date`). No se crea ningún gasto.
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-MCP-034-003 — `create_expense` con `amount` sin `date` es rechazado
**Herramienta probada:** `create_expense` en `todo-api`
**Precondición:** Ninguna.
**Input de prueba:**
```json
{
  "description": "[TEST spec-034] MCP - amount sin date",
  "amount": 50000,
  "type": "basico"
}
```
**Output esperado:** Error de validación (`.refine()`) indicando que
`amount` y `date` deben ir juntos. No se crea ningún gasto.
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-MCP-034-004 — `create_expense` con `date` sin `amount` es rechazado
**Herramienta probada:** `create_expense` en `todo-api`
**Precondición:** Ninguna.
**Input de prueba:**
```json
{
  "description": "[TEST spec-034] MCP - date sin amount",
  "date": "2026-09-10",
  "type": "basico"
}
```
**Output esperado:** Mismo error de validación que TC-MCP-034-003 (la regla
es simétrica). No se crea ningún gasto.
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-MCP-034-005 — Auto-asignación de `budgetId` al crear con `date` en un mes con presupuesto
**Herramienta probada:** `create_expense` en `todo-api`
**Precondición:** `{{id-budget-a}}` existe para Mes A.
**Input de prueba:**
```json
{
  "description": "[TEST spec-034] MCP - auto-vínculo",
  "amount": 80000,
  "date": "{{fecha-dentro-de-mes-a}}",
  "type": "basico"
}
```
**Output esperado:** El gasto creado tiene `budgetId` igual al de
`{{id-budget-a}}` sin haberlo enviado explícitamente. Verificar cruzando con
`GET /finances/budgets/{{id-budget-a}}` (aparece en `expenses`).
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-MCP-034-006 — `update_expense` ejecuta un gasto planeado agregando `amount`+`date`
**Herramienta probada:** `update_expense` en `todo-api`
**Precondición:** `{{id-expense-planned-a}}` solo tiene `plannedAmount`.
**Input de prueba:**
```json
{
  "expenseId": "{{id-expense-planned-a}}",
  "amount": 1200000,
  "date": "{{fecha-dentro-de-mes-a}}"
}
```
**Output esperado:** El gasto pasa a `settled` (`plannedAmount` y `amount`
ambos no nulos). No se pierde `budgetId` ni `plannedAmount` original.
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-MCP-034-007 — `create_expense` con `creditCardId` tiene efecto real
**Herramienta probada:** `create_expense` en `todo-api`
**Precondición:** `{{id-card}}` existe.
**Input de prueba:**
```json
{
  "description": "[TEST spec-034] MCP - con tarjeta",
  "amount": 150000,
  "date": "{{fecha-dentro-de-mes-a}}",
  "creditCardId": "{{id-card}}",
  "type": "lujo"
}
```
**Output esperado:** El gasto se crea con la tarjeta asociada
(`creditCard.id === {{id-card}}`), y aparece en `cardTotals` de
`get_monthly_expense_summary` para ese mes — antes de este spec el MCP no
podía alimentar ese desglose (`creditCardId` no expuesto).
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-MCP-034-008 — `get_monthly_expense_summary` con el contrato nuevo, mes con presupuesto
**Herramienta probada:** `get_monthly_expense_summary` en `todo-api`
**Precondición:** Mes A tiene los gastos de datos de prueba (planeado,
settled, ejecutado sin plan, con tarjeta).
**Input de prueba:**
```json
{ "year": {{año-mes-a}}, "month": {{mes-a}} }
```
**Output esperado:** La respuesta sigue exactamente el shape declarado en
el spec: `plannedTotal`, `executedTotal`, `variance`, `pendingPlannedTotal`,
`unplannedTotal`, `byType`, `cardTotals`, `budgetId` (no nulo). **No**
incluye `budgetTotal`, `expensesTotal` ni `combinedTotal`. Los valores
numéricos coinciden con lo verificado manualmente en TC-034-003 y 004.
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-MCP-034-009 — `get_monthly_expense_summary` en un mes sin presupuesto
**Herramienta probada:** `get_monthly_expense_summary` en `todo-api`
**Precondición:** `{{id-expense-loose}}` es el único gasto del mes elegido
(sin presupuesto).
**Input de prueba:**
```json
{ "year": {{año-mes-suelto}}, "month": {{mes-suelto}} }
```
**Output esperado:** `budgetId: null`, `plannedTotal: 0`,
`pendingPlannedTotal: 0`, `unplannedTotal` igual al `amount` del gasto
suelto, `executedTotal` igual a ese mismo monto.
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-MCP-034-010 — `duplicate_budget` deja `amount`/`date` en null en el destino
**Herramienta probada:** `duplicate_budget` en `todo-api`
**Precondición:** `{{id-budget-a}}` tiene gastos planeados y liquidados.
**Input de prueba:**
```json
{ "budgetId": "{{id-budget-a}}", "month": {{mes-destino}}, "year": {{año-destino}} }
```
**Output esperado:** Igual que TC-034-009 pero verificado por MCP: el
contador devuelto es `plannedExpensesCopied` (no `itemsCopied`), y cada
gasto del presupuesto destino tiene `plannedAmount` copiado con
`amount`/`date` en null, incluso el que en origen estaba `settled`.
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-MCP-034-011 — `duplicate_expense` copia el gasto tal cual (asimetría con `duplicate_budget`)
**Herramienta probada:** `duplicate_expense` en `todo-api`
**Precondición:** `{{id-expense-settled-a}}` tiene `amount`+`date`.
**Input de prueba:**
```json
{ "expenseId": "{{id-expense-settled-a}}", "month": {{mes-destino}}, "year": {{año-destino}} }
```
**Output esperado:** El gasto duplicado conserva `amount` y `date`
desplazada (no null) — confirma la asimetría deliberada con
TC-MCP-034-010. Verificar también que un gasto **plan-only** como origen
(`{{id-expense-planned-a}}`) se duplica tolerando `date: null` (no lanza
error del tipo `split of null`).
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-MCP-034-012 — `add_budget_item`, `update_budget_item`, `delete_budget_item` ya no existen
**Herramienta probada:** listado de tools (`tools/list`) en `todo-api`
**Precondición:** Ninguna.
**Pasos:**
1. Listar todas las tools expuestas por `todo-api`.
2. Buscar `add_budget_item`, `update_budget_item`, `delete_budget_item`.
**Resultado esperado:** Ninguna de las tres aparece en el listado.
`create_expense`/`update_expense`/`delete_expense` sí aparecen, con
`plannedAmount`, `budgetId` y `creditCardId` en el `inputSchema` de
`create_expense`/`update_expense`.
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-MCP-034-013 — `list_expenses` con filtros `budgetId` y `status`
**Herramienta probada:** `list_expenses` en `todo-api`
**Precondición:** Mes A tiene gastos en los tres estados
(`planned`/`executed`/`settled`).
**Input de prueba:**
```json
{ "budgetId": "{{id-budget-a}}", "status": "planned" }
```
**Output esperado:** Devuelve únicamente los gastos de Mes A con
`plannedAmount` no nulo y `amount` nulo. Repetir con `"status": "settled"` y
`"status": "executed"` para confirmar que cada filtro devuelve el subconjunto
correcto sin solaparse.
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

## Resumen de la ronda

- Aprobados: {{n}} — Fallidos: {{n}} — Pendientes: {{n}}
- Hallazgos escalados a `spec/backlog.md`: {{lista o "ninguno"}}
- Limpieza de datos de prueba: ⬜ Pendiente / ✅ Completada
