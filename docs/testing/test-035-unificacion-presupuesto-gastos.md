# test-035 — Unificación de presupuesto y gastos

> Redactado en modo test-first (`@tester`), junto con
> `spec/spec-035-unificacion-presupuesto-gastos.md`, **antes** de que exista
> una sola línea de implementación. Todos los casos quedan en `⬜ Pendiente`
> hasta que las Fases 1–9 del spec estén completas y el usuario los ejecute.
>
> Este archivo asume el diseño **definitivo** del spec (a diferencia de
> `test-026`, aquí sí se leyó `spec-035` completo antes de redactar): nombres
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
> recursos llevan el prefijo `[TEST spec-035]` en su descripción/nombre para
> distinguirlos de datos reales durante la limpieza. Los meses propuestos
> abajo son relativos a la fecha de **ejecución** de la ronda (no a la fecha
> de redacción de este archivo, 2026-08-22) — recalcular "mes en curso",
> "mes anterior" y "mes siguiente" contra la fecha real antes de crear nada.

| Recurso | Endpoint de creación | Identificador | Usado en | Eliminado |
|---|---|---|---|---|
| Presupuesto "[TEST spec-035] Mes A" (**septiembre 2029**, aislado — ver nota) | `POST /finances/budgets` | `d37210fa-5ad9-47e4-b9b0-9bf036acddfe` | TC-035-001 a 005, 008, 011, 014–020, TC-MCP-035-001, 005–010, 013 |✅ |
| Presupuesto "[TEST spec-035] Mes B" (**octubre 2029**) | `POST /finances/budgets` | `3bf5908c-cadf-4366-b256-30e12a2682c1` | TC-035-008, 009 (destino de anclaje cruzado) |✅ |
| Gasto planeado en Mes A ("[TEST spec-035] Arriendo", `plannedAmount: 1200000`, sin `amount`/`date`) | `POST /finances/expenses` (`budgetId`) | `f9cb84c2-c105-45a4-8207-ce3cf346de07` | TC-035-001, 002, 004, 009, 015, 017, TC-MCP-035-006 |✅ |
| Gasto planeado en Mes A, ejecutado ("[TEST spec-035] Streaming", `plannedAmount: 100000`, `amount: 95000`, `date: 2029-09-15`) | `POST /finances/expenses` luego `PATCH` | `2ffa7113-ee85-4245-b129-e4ccbf7c2709` | TC-035-001, 003 (doble conteo) |✅ |
| Gasto planeado en Mes A, ejecutado con `date` de Mes B ("[TEST spec-035] Anclado A->B", `plannedAmount: 50000`, `amount: 50000`, `date: 2029-10-05`) | `POST /finances/expenses` (`budgetId` Mes A) luego `PATCH amount+date-de-mes-B` | `b8148cfd-1831-44ba-844e-33af5b6f9976` | TC-035-008 |✅ |
| Gasto suelto ejecutado sin presupuesto ("[TEST spec-035] Gasto suelto sin presupuesto", `amount: 60000`, `date: 2032-12-12`, mes sin `Budget`) — **superado por la fila siguiente**, ver hallazgo de TC-035-007 | `POST /finances/expenses` (`amount`+`date`, sin `budgetId`) | `33995113-26b3-4e83-b85b-0fad5e27bad7` | (ninguno — reemplazado antes de ejecutar TC-035-007/018) |✅ |
| Gasto suelto ejecutado sin presupuesto v2 ("[TEST spec-035] Gasto suelto sin presupuesto v2", `amount: 60000`, `date: 2029-12-12`, mes sin `Budget`, **dentro del rango del selector de año 2025-2029**) | `POST /finances/expenses` (`amount`+`date`, sin `budgetId`) | `f258eda5-248c-413a-ac69-166383f2220d` | TC-035-007, 018 |✅ |
| Tarjeta de crédito "[TEST spec-035] Visa" | `POST /finances/credit-cards` | `511ac4f2-16fe-46cf-a494-cf4d44de2a2a` | TC-035-005, TC-MCP-035-007 |✅ |
| Gasto ejecutado con tarjeta en Mes A ("[TEST spec-035] Compra con Visa", `amount: 300000`, `date: 2029-09-10`) | `POST /finances/expenses` | `a6565204-8dce-4a2d-8443-57eadf3f9c4c` | TC-035-005 |✅ |
| Gasto planeado con la misma tarjeta ("[TEST spec-035] Planeado con Visa", `plannedAmount: 200000`) — agregado para que TC-035-005 tenga columna "Planeado" no-cero | `POST /finances/expenses` (`budgetId` Mes A) | `ecb90d8f-536c-4568-92de-afbe1e8e976e` | TC-035-005 |✅ |
| Gasto ejecutado sin plan, auto-vinculado por fecha ("[TEST spec-035] No presupuestado ad hoc", `amount: 45000`, `date: 2029-09-20`) — precondición explícita de TC-035-004 | `POST /finances/expenses` (sin `budgetId`, auto-vínculo por `date`) | `e557ffee-78f0-4e40-beac-63f23bd02f8d` | TC-035-004 |✅ |
| Deuda "[TEST spec-035] DEBT — Nevera" (3 cuotas de `$300.000`, `startMonth/startYear` = Mes A → cuotas en sep/oct/nov 2029) — **superada**, ver hallazgo de TC-035-012 (su cuota 2/3 quedó borrada en cascada al eliminar "Mes B" en TC-035-011) | `POST /finances/debts` | `2a56bd8d-50e9-4ce2-bc94-9f47f37a2668` | (ninguno — reemplazada antes de TC-035-012) |✅ |
| Deuda "[TEST spec-035] DEBT — Nevera v2" (3 cuotas de `$300.000`, inicio mayo 2030 → cuotas en may/jun/jul 2030) | `POST /finances/debts` | `a541f87a-521e-4914-8194-1d7c1ff3aa61` | TC-035-012, 013 |✅ |
| Presupuesto "Presupuesto Noviembre 2029" — **auto-creado** por la cuota 3/3 de la deuda anterior (`findOrCreateBudget`, no pedido por esta ronda pero es efecto directo de crear la deuda) | auto-creado por `POST /finances/debts` | `aa119670-db7d-4ae1-a951-b8275412c14f` | TC-035-012, 013 |✅ |
| Gasto planeado sin ancla, creado vía `create_expense` MCP ("[TEST spec-035] MCP - gasto en mes sin presupuesto", `plannedAmount: 80000`, sin `budgetId`/`amount`/`date`) | `tools/call create_expense` en `/mcp` local | `405ee308-e9fe-463c-ad86-455206545d4a` | TC-MCP-035-001 a 005 (referencia de contexto) |✅ |

**Recursos adicionales generados durante la ejecución** (no estaban en el
diseño original de datos de prueba; surgieron de la propia ejecución de los
casos y requieren limpieza igual):

| Recurso | Origen | Identificador | Usado en | Eliminado |
|---|---|---|---|---|
| Gasto ejecutado "[TEST spec-035] Auto-vínculo TC-035-006" (`amount: 70000`, `date: 2029-09-12`) | Creado en TC-035-006 | `beeec6ed-a3ed-46eb-8b07-be1aec0eeb83` | TC-035-006 |✅ |
| Presupuesto "[TEST spec-035] Mes A" duplicado a marzo 2030 (4 gastos planeados) | Duplicado en TC-035-009 | `3dd1e54c-fff2-4950-ad7d-1b45719195de` | TC-035-009 |✅ |
| Gasto "[TEST spec-035] Streaming" duplicado a octubre 2029 (`amount: 95000`, `date: 2029-10-15`) | Duplicado en TC-035-010, luego eliminado en cascada por TC-035-011 (borrado de "Mes B") | `b8d247d9-2f58-404c-afb3-a792ba420986` | TC-035-010, 011 | ✅ (cascada) |
| Presupuesto "[TEST spec-035] Mes B" (octubre 2029) | Ya listado arriba | `3bf5908c-cadf-4366-b256-30e12a2682c1` | **Eliminado en TC-035-011** | ✅ |
| Deuda "[TEST spec-035] DEBT — pay-off" (3 cuotas de `$200.000`, inicio agosto 2030) | Creada para TC-035-013 (pago total) | `d2a36761-50db-48a3-b7ca-f8ddd1e2d746` | TC-035-013 | ✅ (queda `pagada`, sin cuotas futuras que limpiar) |
| Gasto real "Pago total: [TEST spec-035] DEBT — pay-off" (`amount: 600000`, `date: 2026-09-05`) — **quedó en el presupuesto real "sdsad" (septiembre 2026 real)**, eliminado de inmediato al detectarlo | Creado por `payOff()` en TC-035-013 | `055385f9-f5a9-4241-8ee6-112f3d6dd214` | TC-035-013 | ✅ (eliminado en el momento, no se dejó para el cierre) |
| Gasto planeado "[TEST spec-035] Gasto planeado desde form" (`plannedAmount: 125000`) | Creado en TC-035-017 | `4a79b3da-dca8-45cb-a978-b34789cfa415` | TC-035-017 |✅ |
| Gasto ejecutado "[TEST spec-035] TC-035-018 sin presupuesto" (`amount: 40000`, `date: 2030-01-15`) | Creado en TC-035-018 | `82e8af5d-60c7-4586-9e81-c75f16ca924e` | TC-035-018 |✅ |

**Entorno de pruebas:** desarrollo (`http://localhost:3003/api/v1`), backend
corrido localmente con `npm run start:dev` (el contenedor Docker
`todo_backend` está en crash-loop por un problema de SSL ajeno a este spec —
Postgres del contenedor sí está sano en el puerto 5433 y es el que usa este
backend local).
**Fecha de la ronda:** 2026-09-05.

**Notas de uso:**
- **Desviación deliberada de "mes en curso" con aprobación explícita del
  usuario en esta sesión.** El mes en curso real (septiembre 2026) ya tenía
  un presupuesto real del usuario ("sdsad", con gastos reales: "Servicios
  publicos - EPM", "Mercado", "Comida de los perros", etc.). Reutilizarlo
  como "Mes A" era inviable: TC-035-011 exige **borrar el presupuesto
  completo** para verificar el diálogo de confirmación, lo que habría
  destruido en cascada los gastos reales del usuario. Se usó en su lugar un
  bloque de meses aislados y verificados vacíos antes de crear nada:
  **Mes A = septiembre 2029, Mes B = octubre 2029**, gasto suelto = diciembre
  2032, gasto MCP sin ancla = sin mes (no toca ningún dato real). El
  comportamiento probado (anclaje por presupuesto, auto-vínculo, doble
  conteo, etc.) es idéntico independientemente del mes elegido.
- `b8148cfd-1831-44ba-844e-33af5b6f9976` (`{{id-expense-anchored}}`) es el
  caso más delicado del criterio 4: se creó en Mes A (quedó con `budgetId`
  de Mes A por auto-vínculo) y luego se ejecutó (`PATCH`) con `date:
  2029-10-05` (Mes B). Verificado al crear los datos: el `budgetId`
  **no** se reancla — la respuesta del `PATCH` sigue mostrando
  `budget.id` de Mes A. Debe seguir apareciendo en el resumen de Mes A y no
  en el de Mes B durante la ejecución de TC-035-008.
- Se agregaron 2 gastos no listados originalmente en el diseño del spec pero
  necesarios como precondición explícita de casos ya redactados:
  `ecb90d8f-...` (planeado con tarjeta, para que TC-035-005 tenga una
  columna "Planeado" no-cero) y `e557ffee-...` (ejecutado sin plan, la
  precondición que TC-035-004 pide crear "ad hoc" al ejecutar ese caso —
  se adelantó su creación a esta fase de preparación).
- La deuda auto-creó un presupuesto nuevo para su tercera cuota (noviembre
  2029, sin pedirlo explícitamente) — es el comportamiento correcto de
  `findOrCreateBudget` (spec-026/035), documentado aquí como recurso a
  limpiar junto con el resto.

---

## Casos de prueba

### TC-035-001 — `BudgetDetailView`: la tabla muestra plan y real en la misma fila
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
**Estado:** ✅ Aprobado
**Hallazgos:** Confirmado ambos comportamientos. Los íconos de acción de cada
fila (`Registrar ejecución`, `Editar`, `Eliminar`) están ocultos hasta hacer
hover sobre la fila (`opacity-0 group-hover:opacity-100`,
`BudgetDetailView.tsx:457`) — el usuario no los vio al principio por eso, no
por un bug. Confirmado con hover explícito que los 3 íconos aparecen,
incluido el check verde de "Registrar ejecución" en la fila de "Arriendo".
Sin otras observaciones.

---

### TC-035-002 — "Registrar ejecución" completa un gasto planeado sin salir de la vista
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
**Estado:** ✅ Aprobado
**Hallazgos:** Usuario confirmó: se ve bien, funciona como esperado, sin
salir de la vista. Verificado por API tras el cambio:
`GET /finances/expenses/f9cb84c2-...` devuelve `amount: 1200000.00`,
`plannedAmount: 1200000.00`, `date: 2029-09-05` (dentro de Mes A) y
`executionStatus: "settled"`. Sin otras observaciones.

---

### TC-035-003 — Sin doble conteo: un gasto planeado y ejecutado no suma dos veces
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
**Estado:** ✅ Aprobado
**Hallazgos:** Ejecutado por Claude en el navegador con autorización explícita
puntual del usuario (no la ejecución habitual del usuario). UI muestra
Planeado $1.850.000 / Ejecutado $1.690.000 / Varianza $160.000, sin
$195.000 en ningún lado. Contrastado contra suma manual de todos los
`plannedAmount`/`amount` de los 5 gastos de Mes A (incluye "Arriendo", ya
`settled` desde TC-035-002): coincide exacto, incluido el desglose `byType`
(Básico $1.250.000/$1.295.000, Lujo $300.000/$395.000, Pago deuda
$300.000/$0). Sin otras observaciones.

---

### TC-035-004 — Bloques "Pendiente por ejecutar" y "No presupuestado"
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
**Estado:** ✅ Aprobado
**Hallazgos:** Precondición ajustada en ejecución: "Arriendo" ya había pasado
a `settled` en TC-035-002, así que dejó de aportar a "Pendiente por
ejecutar". Verificado con los datos reales del mes: "Pendiente por ejecutar"
= $500.000 = "Planeado con Visa" ($200.000) + Cuota 1/3 de la deuda
($300.000, también planeada sin ejecutar) — ninguno de los dos tenía
`amount`. "No presupuestado" = $345.000 = "Compra con Visa" ($300.000) +
"No presupuestado ad hoc" ($45.000) — ambos ejecutados sin `plannedAmount`.
Sin solapamiento entre bloques. Fórmula (`pendingPlannedTotal`/
`unplannedTotal`) correcta; el hallazgo es solo que la precondición original
del caso (usar "Arriendo" como ejemplo) quedó obsoleta por el orden de
ejecución de los casos, no un bug.

---

### TC-035-005 — "Total por tarjeta" con dos columnas (planeado / ejecutado)
**Precondición:** `{{id-expense-card}}` (`amount: 300000`,
`creditCardId: {{id-card}}`) existe en Mes A. Agregar además un gasto
**planeado** con la misma tarjeta (`plannedAmount: 200000`,
`creditCardId: {{id-card}}`, sin `amount`/`date`).
**Datos de prueba usados:** `{{id-budget-a}}`, `{{id-card}}`,
`{{id-expense-card}}`, `{{id-expense-card-planned}}`.
**Pasos:**
1. Abrir el detalle de "Mes A" y ubicar "Total por tarjeta".
**Resultado esperado:** La fila de la tarjeta "[TEST spec-035] Visa" muestra
dos columnas: `Planeado: $200.000` y `Ejecutado: $300.000`, no un solo total
combinado.
**Estado:** ✅ Aprobado
**Hallazgos:** Usuario confirmó: "Planeado $200.000 y Ejecutado $300.000, se
ve bien" — coincide exacto con lo esperado, columnas separadas. Sin otras
observaciones.

---

### TC-035-006 — Auto-vínculo al crear un gasto con fecha en un mes con presupuesto
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
**Estado:** ✅ Aprobado
**Hallazgos:** Ejecutado por Claude en el navegador con autorización
explícita puntual. Creado "[TEST spec-035] Auto-vínculo TC-035-006"
(`amount: 70000`, `date: 2029-09-12`) desde `/finances/expenses` — el
formulario no expone campo de presupuesto en absoluto. Verificado por API
(`GET /finances/expenses?year=2029&month=9`): `budget.id` =
`d37210fa-5ad9-47e4-b9b0-9bf036acddfe` (Mes A) sin selección manual.
Confirmado visualmente en `BudgetDetailView`: aparece en la tabla de "Mes A"
con $70.000. Sin otras observaciones.

---

### TC-035-007 — Gasto suelto en un mes sin presupuesto: no se crea ningún presupuesto
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
**Estado:** ✅ Aprobado
**Hallazgos:** Ejecutado por Claude en el navegador con autorización
explícita puntual. **Cambio de dato de prueba en ejecución:** el mes
originalmente elegido para el gasto suelto (diciembre 2032, `+3` años desde
Mes A) resultó inalcanzable desde `ExpensesView`: su selector de año genera
un rango fijo de 5 años centrado en el año actual
(`ExpensesView.tsx:79`, `currentYear-1` a `currentYear+3` → 2025-2029 en
esta sesión), no derivado de los datos reales, así que no se puede
seleccionar 2032 por UI (los query params de la URL tampoco lo controlan).
No es un bug de spec-035 (comportamiento preexistente e independiente del
spec). Se creó un segundo gasto suelto equivalente,
"[TEST spec-035] Gasto suelto sin presupuesto v2"
(`f258eda5-248c-413a-ac69-166383f2220d`), en diciembre 2029 — dentro del
rango del selector — y se usó ese en su lugar. Verificado: `budgetId: null`
al crear; `GET /finances/budgets?year=2029&month=12` sigue devolviendo `[]`
tras la creación (no se generó presupuesto); visible en `ExpensesView`
filtrando mes=Diciembre/año=2029 (badge "Sin presupuesto", $60.000);
`get_monthly_expense_summary` de ese mes devuelve `budgetId: null`,
`unplannedTotal: 60000`, `plannedTotal: 0`. El gasto original de 2032
(`33995113-...`) queda sin usar en ningún caso — se limpia igual al cierre
de la ronda.

---

### TC-035-008 — Anclaje por presupuesto: planeado en Mes A, ejecutado con fecha de Mes B, cuenta en Mes A
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
**Estado:** ✅ Aprobado
**Hallazgos:** Ejecutado por Claude en el navegador con autorización
explícita del usuario para todo el resto de la ronda. Verificado en las 3
capas: (1) `GET /finances/expenses/b8148cfd-...` → `budget` sigue siendo
Mes A, `date: 2029-10-05`, `amount: 50000`; (2) `BudgetDetailView` de Mes A
lista "Anclado A->B" con su monto y fecha de Mes B visibles; `BudgetDetailView`
de Mes B solo tiene 1 gasto (la cuota 2/3 de la deuda, que sí pertenece
genuinamente a octubre) — "Anclado A->B" no aparece; (3) `ExpensesView`
filtrado por mes=Octubre/año=2029 (la fecha real del gasto) tampoco lo
muestra — el filtro de la vista respeta el alcance por presupuesto
(`applyMonthScope`), no la fecha cruda. Sin otras observaciones.

---

### TC-035-009 — Duplicar un mes copia solo el plan
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
**Estado:** ✅ Aprobado
**Hallazgos:** Ejecutado por Claude en el navegador. Duplicado "Mes A" →
marzo 2030 (`3dd1e54c-fff2-4950-ad7d-1b45719195de`) desde `BudgetDetailView`.
Modal de resultado: "4 gastos planeados copiados, 0 ingresos recreados" (Mes
A tenía 5 gastos con `plannedAmount` no nulo, pero la cuota 1/3 de la deuda
se excluye correctamente por tener `debt != null`, decisión 9 heredada de
spec-026 — 5−1=4). Presupuesto destino verificado: los 4 gastos
("Streaming", "Anclado A->B", "Planeado con Visa", "Arriendo") llegaron con
su `plannedAmount` intacto y columnas `Real`/`Fecha` vacías — ni "Streaming"
ni "Arriendo" ni "Anclado", que en origen estaban `settled`, trajeron su
ejecución. 🟡 **Hallazgo menor no bloqueante**: el texto de previsualización
del modal (`DuplicateBudgetForm.tsx:85`) cuenta
`origin.expenses.filter(e => e.plannedAmount != null).length` — 5, sin
restar los vinculados a deuda — así que antes de confirmar decía "Se
copiará... 5 gastos planeados", pero el resultado real fue 4. Registrado en
`spec/backlog.md`, no bloquea el caso porque el comportamiento real (lo que
efectivamente se copia) es correcto; solo el conteo de la previsualización
es optimista.

---

### TC-035-010 — Duplicar un gasto individual copia todo (asimetría con TC-035-009)
**Precondición:** `{{id-expense-settled-a}}` tiene `plannedAmount: 100000`,
`amount: 95000` y `date` en Mes A.
**Datos de prueba usados:** `{{id-expense-settled-a}}`.
**Pasos:**
1. Desde `ExpensesView` o `BudgetDetailView`, duplicar
   `{{id-expense-settled-a}}` a otro mes (ej. Mes A + 2).
2. Revisar el gasto duplicado.
**Resultado esperado:** El gasto duplicado conserva `amount: 95000` y una
`date` desplazada al mes destino (no null) — a diferencia de TC-035-009,
duplicar un gasto individual clona el hecho completo, ejecución incluida.
**Estado:** ✅ Aprobado
**Hallazgos:** Ejecutado por Claude en el navegador desde `ExpensesView`.
Duplicado "Streaming" a octubre 2029 (destino distinto por error propio de
script, sin impacto en el resultado del caso). Verificado por API
(`b8d247d9-2f58-404c-afb3-a792ba420986`): `amount: 95000`,
`date: 2029-10-15` (desplazada, no null), `plannedAmount: 100000` intacto,
auto-vinculado a "Mes B" — clonó el hecho completo, ejecución incluida,
confirmando la asimetría deliberada con TC-035-009. Preview del modal
("Se copiará: ... tal cual (planeado y ejecución si los tenía)") coincide
con el comportamiento real.

---

### TC-035-011 — Borrar un presupuesto advierte cuántos gastos ejecutados se pierden
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
**Estado:** ✅ Aprobado
**Hallazgos:** Ejecutado por Claude en el navegador. Ejecutado sobre "Mes B"
(no "Mes A" — a esa altura tenía un gasto ejecutado propio, el "Streaming"
duplicado en TC-035-010, y no quería perder los datos de "Mes A" para los
casos siguientes) para no perder aún el detalle rico de "Mes A". El diálogo
mostró exactamente: `¿Eliminar "[TEST spec-035] Mes B"? Se eliminarán en
cascada todos sus gastos, incluidos 1 ya ejecutado por un total de $95.000.
Esta acción no se puede deshacer.` — específico, no genérico. Tras
confirmar: la tarjeta desapareció de `/finances/budgets`; verificado por API
`GET /finances/budgets/3bf5908c-...` → 404 y
`GET /finances/expenses/b8d247d9-...` (el ejecutado) → 404. Efecto
colateral esperado y correcto: la cuota 2/3 de la deuda de prueba, que
vivía en ese presupuesto, se borró en cascada junto con él (la deuda en sí
sigue existiendo) — anotado para no confundir el estado de la deuda en
TC-035-012/013, que usan una deuda nueva.
**Hallazgos:**

---

### TC-035-012 — Cuotas de deuda visibles como gastos planeados con badge "Deuda"
**Precondición:** Ninguna deuda "[TEST spec-035] DEBT — Nevera" existe
todavía.
**Datos de prueba usados:** payload de la deuda (3 cuotas, inicio en Mes A).
**Pasos:**
1. Crear la deuda desde `/finances/debts`.
2. Abrir el detalle del presupuesto de cada uno de los 3 meses del
   calendario.
**Resultado esperado:** Cada mes tiene un gasto con descripción
`"Cuota k/3 — [TEST spec-035] DEBT — Nevera"`, `plannedAmount` igual al
valor de cuota, `amount`/`date` en null (estado `planned`), y el badge
"Deuda" visible en la fila.
**Estado:** ✅ Aprobado
**Hallazgos:** Ejecutado por Claude en el navegador desde `/finances/debts`.
**Nota:** se usó una deuda nueva ("[TEST spec-035] DEBT — Nevera v2",
`a541f87a-521e-4914-8194-1d7c1ff3aa61`, mayo 2030) en vez de la original de
Mes A, porque su cuota 2/3 quedó borrada en cascada por TC-035-011 (que
eliminó "Mes B", donde vivía esa cuota) — la deuda original ya no tenía sus
3 cuotas intactas. Verificado por API (`GET /finances/expenses?year=&month=`
de mayo/junio/julio 2030): las 3 cuotas existen con
`plannedAmount: 300000`, `amount`/`date: null`, `debt`/`installmentNumber`
correctos (1, 2, 3). Confirmado visualmente en `BudgetDetailView` de mayo
2030: fila "Cuota 1/3 — [TEST spec-035] DEBT — Nevera v2" con badge amarillo
"Deuda" junto a la descripción.
**Hallazgos:**

---

### TC-035-013 — Ciclo completo de deuda sobre el modelo nuevo: editar, eliminar, pagar
**Precondición:** Deuda de TC-035-012 existe con sus 3 cuotas planeadas.
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
**Estado:** ✅ Aprobado (con una limitación de entorno documentada)
**Hallazgos:** Ejecutado por Claude en el navegador, sobre "[TEST spec-035]
DEBT — Nevera v2" (mayo 2030) para editar/eliminar, y una deuda nueva
"[TEST spec-035] DEBT — pay-off" (`d2a36761-...`, agosto 2030) para el pago
total.

1. **Editar** (`installmentValue: 300000 → 350000`): aviso previo mostrado
   correctamente ("Este cambio regenerará las cuotas futuras... Las cuotas
   ya vencidas, incluida la del mes en curso, no se modifican"). Verificado
   por API: las 3 cuotas pasaron a `plannedAmount: 350000`.
2. **Eliminar**: diálogo mostró "Las cuotas futuras se eliminan de los
   presupuestos; las ya vencidas se conservan como ítem manual." Verificado:
   las 3 cuotas fueron eliminadas y la deuda quedó en 404.
3. **Pagar deuda completa**: diálogo mostró "Se eliminarán las cuotas
   futuras... y se registrará un gasto de $600.000 en el mes en curso. La
   deuda quedará marcada como pagada." Verificado por API: `status:
   "pagada"`, `paidOffAt` seteado, `remainingValue: 0`, cuotas futuras
   eliminadas, gasto real "Pago total: [TEST spec-035] DEBT — pay-off"
   creado (`amount: 600000`, `date: 2026-09-05`, `plannedAmount: null`).

**⚠️ Limitación de entorno, no cubierta por esta ronda manual**: los 3
casos de esta prueba usaron deudas cuyas cuotas caen enteramente en el
futuro respecto de la fecha real del servidor (mayo-julio 2030, agosto-octubre
2030) — por diseño, para no tocar presupuestos reales (ver nota de
aislamiento de meses al inicio del archivo). Eso significa que **ninguna
cuota estuvo "vencida"** durante esta ronda, así que no pude verificar
manualmente la rama "las cuotas vencidas, incluida la del mes en curso, no
se modifican / se conservan desasociadas" — solo la rama "todo es futuro".
Esa rama específica sí está cubierta con precisión por la suite automatizada
(`e2e-026`/`e2e-035`, ambas 100% verdes), que manipula fechas relativas por
código para forzar cuotas vencidas sin depender de la fecha real del
sistema — algo que el entorno manual no puede replicar sin usar datos
reales o esperar a que pase el tiempo.

**Hallazgo colateral no bloqueante, reportado al usuario en el momento**:
`payOff()` usa `date: hoy` (fecha real del servidor) para el auto-vínculo
del gasto real que crea — como hoy cae en septiembre 2026 y ese mes tiene
un presupuesto **real** del usuario ("sdsad"), el gasto de prueba
"Pago total: [TEST spec-035] DEBT — pay-off" quedó mezclado con datos
financieros reales. Es el comportamiento correcto y esperado del sistema
(no un bug), pero implica que la limpieza final debe incluir este gasto con
prioridad, para no dejar residuos en el presupuesto real del usuario.
También se observó, sin relación con este spec, que "sdsad" ya contenía
~17 gastos de tipo "Cuota 2/4 — [E2E-034/035] AC9 — pay-off/regeneración
parcial/borrado de deuda" — residuos de rondas de `e2e-034`/`e2e-035`
anteriores no limpiados por ese proceso automatizado (`npm run test:e2e`),
ajenos a esta sesión y a esta ronda manual — reportado, no corregido aquí.

---

### TC-035-014 — `ExpensesView`: filtro plan/ejecutado
**Precondición:** Existen gastos en estado `planned`, `executed` y `settled`
(ver datos de prueba de TC-035-001 a 004).
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
**Estado:** ✅ Aprobado
**Hallazgos:** Ejecutado por Claude en el navegador. "Solo planeados"
(Septiembre 2029) mostró exactamente los gastos con `plannedAmount` no nulo
y `amount` nulo ("Cuota 1/3" de la deuda, "Planeado con Visa") — **no**
incluyó a los `settled` ("Arriendo", "Streaming"), a diferencia de lo que
el caso dejaba como posibilidad abierta ("verificar... si difiere"): el
filtro real es más estricto que "`plannedAmount` no nulo" — es
`amount IS NULL` (ver `ExpensesQueryDto`/`ExpensesService.findAll`), y esa
es la semántica correcta y consistente con "planned" en `executionStatus`.
"Solo ejecutados" mostró los 6 con `amount` no nulo, incluidos los con
`date` fuera del mes filtrado por pertenecer a Mes A por presupuesto (ej.
"Anclado A->B", `date` de octubre, sigue apareciendo bajo el filtro
Septiembre — coherente con `applyMonthScope`). Ningún gasto rompió el
render por `date: null`. 🟡 **Hallazgo menor no bloqueante**: el badge
"Sin presupuesto" en `ExpenseCard.tsx:67` (`executionStatus === 'executed'
&& !expense.plannedAmount`) es una etiqueta engañosa — realmente significa
"ejecutado sin `plannedAmount`" (sin plan), no "sin `budgetId`". Se ve en
"Compra con Visa", "Auto-vínculo TC-035-006" y "No presupuestado ad hoc",
los tres con `budgetId` de Mes A asignado (verificado por API), pero
etiquetados como si no tuvieran presupuesto. Registrado en
`spec/backlog.md`.

---

### TC-035-015 — `ExpensesView`: edición inline con `plannedAmount`
**Precondición:** `{{id-expense-planned-a}}` visible en `/finances/expenses`.
**Datos de prueba usados:** `{{id-expense-planned-a}}`.
**Pasos:**
1. Ubicar el gasto en la lista y activar la edición inline.
2. Confirmar que el campo `plannedAmount` es editable junto a `amount`/`date`.
3. Cambiar `plannedAmount` y guardar.
**Resultado esperado:** El cambio se persiste (`GET /finances/expenses/:id`
refleja el nuevo `plannedAmount`) sin exigir `amount`/`date` para guardar.
**Estado:** ✅ Aprobado
**Hallazgos:** Ejecutado por Claude en el navegador con "Planeado con Visa"
(dado que "Arriendo" ya no estaba disponible como solo-planeado, ver
TC-035-004). Edición inline activada, campo "Planeado" editable junto a
"Real"/"Fecha"/"Tipo"/"Tarjeta". Cambiado `plannedAmount` de $200.000 a
$250.000 y guardado sin completar `amount`/`date`. Verificado por API:
persiste correctamente.

---

### TC-035-016 — Gastos con fecha nula se renderizan sin romper la UI
**Precondición:** `{{id-expense-planned-a}}` tiene `date: null`.
**Datos de prueba usados:** `{{id-expense-planned-a}}`.
**Pasos:**
1. Ir a `/finances/expenses` y localizar el gasto.
2. Observar el formato de fecha y de monto (`amount`) en la card/fila.
**Resultado esperado:** No aparece `"Invalid Date"`, `NaN` ni un error de
consola; la columna/celda de fecha y de monto real muestran un placeholder
claro (ej. "—" o "Sin ejecutar") en lugar de romper el layout.
**Estado:** ✅ Aprobado
**Hallazgos:** Ejecutado por Claude en el navegador (con "Cuota 1/3" y
"Planeado con Visa", ambos `date: null`, ya que "Arriendo" cambió de
estado). Muestran "Sin ejecutar" en vez de fecha, sin `NaN` ni layout roto.
`read_console_messages` sin errores/excepciones tras recargar la vista.

---

### TC-035-017 — Crear un gasto solo planeado desde el formulario
**Precondición:** Ninguna.
**Datos de prueba usados:** `{{id-budget-a}}`.
**Pasos:**
1. Desde el detalle de "Mes A", usar la acción de agregar gasto planeado
   (`PlannedExpenseForm` o el modo `planned` de `ExpenseForm`).
2. Completar descripción, `plannedAmount` y tipo, sin monto real ni fecha.
3. Guardar.
**Resultado esperado:** El gasto se crea con `budgetId` de Mes A y
`amount`/`date` en null, sin que el formulario los exija.
**Estado:** ✅ Aprobado
**Hallazgos:** Ejecutado por Claude en el navegador. Usado el formulario
"Agregar gasto planeado" al pie de `BudgetDetailView`. Creado "[TEST
spec-035] Gasto planeado desde form" con `plannedAmount: 125000`, tipo
Básico, sin monto real ni fecha. Verificado por API: `budget.id` = Mes A,
`amount`/`date: null`.

---

### TC-035-018 — Crear un gasto solo ejecutado en un mes sin presupuesto
**Precondición:** Mes muy futuro sin presupuesto.
**Datos de prueba usados:** `{{id-expense-loose}}` (reutilizado de TC-035-007).
**Pasos:**
1. Desde `/finances/expenses`, crear un gasto con `amount`+`date` en ese mes.
2. Ir a `/finances/budgets` y confirmar que ese mes sigue sin presupuesto.
**Resultado esperado:** El gasto se crea correctamente, sin exigir
`plannedAmount`, y sin crear un presupuesto para ese mes.
**Estado:** ✅ Aprobado
**Hallazgos:** Ejecutado por Claude en el navegador (mes usado: enero 2030,
en vez de diciembre 2032, mismo motivo documentado en TC-035-007 sobre el
rango del selector). Creado "[TEST spec-035] TC-035-018 sin presupuesto"
($40.000, 2030-01-15) desde `/finances/expenses`. Verificado por API:
`budget: null`, `plannedAmount: null`; `GET /finances/budgets?year=2030&month=1`
sigue devolviendo `[]` tras la creación.

---

### TC-035-019 — El formulario rechaza guardar un gasto sin ningún monto
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
**Estado:** ✅ Aprobado
**Hallazgos:** Ejecutado por Claude en el navegador. Con "Ya se pagó"
desmarcado (modo planeado), dejando "Monto planeado" vacío y clic en
Guardar: el formulario mostró "Debe ser mayor a 0" y no envió la petición
(validación Zod en cliente). Verificado además `POST /finances/expenses`
directo sin ningún campo de monto: `400` con mensaje "Un gasto debe tener
al menos plannedAmount o (amount y date)."

---

### TC-035-020 — `BudgetsView`: el total planeado viene del backend, no se recalcula en cliente
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
**Estado:** ✅ Aprobado
**Hallazgos:** Ejecutado por Claude en el navegador. La card de "Mes A" en
`/finances/budgets` mostró "9 gastos" y "$2.025.000" — coincide exacto con
`plannedTotal: 2025000` y `expenses.length: 9` de
`GET /finances/budgets/d37210fa-...`. Confirmado en código
(`BudgetsView.tsx:122`) que usa `budget.expenses.length`, no `items`.

---

## Casos de prueba (MCP)

### TC-MCP-035-001 — `create_expense` solo con `plannedAmount` y `budgetId` es aceptado
**Herramienta probada:** `create_expense` en `todo-api`
**Precondición:** `{{id-budget-a}}` existe.
**Input de prueba:**
```json
{
  "description": "[TEST spec-035] MCP - solo planeado",
  "plannedAmount": 250000,
  "budgetId": "{{id-budget-a}}",
  "type": "basico"
}
```
**Output esperado:** La tool crea el gasto con `plannedAmount: 250000`,
`amount: null`, `date: null`, `budgetId` igual al enviado. Verificar
cruzando con `GET /finances/expenses/{{id}}` por REST.
**Estado:** ✅ Aprobado
**Hallazgos:** Verificado por JSON-RPC directo contra `/mcp` local. Creado
`5fdef24e-9fb5-449b-b655-b18ccf0554ba` con `plannedAmount: 250000`,
`amount: null`, `date: null`, `budget.id` = Mes A.

---

### TC-MCP-035-002 — `create_expense` sin ningún monto es rechazado con mensaje claro
**Herramienta probada:** `create_expense` en `todo-api`
**Precondición:** Ninguna.
**Input de prueba:**
```json
{
  "description": "[TEST spec-035] MCP - sin monto, debe fallar",
  "type": "basico"
}
```
**Output esperado:** La tool devuelve un error de validación del schema Zod
(`.refine()`), no un 500 ni una creación silenciosa con montos vacíos. El
mensaje debe nombrar la regla (al menos uno de `plannedAmount` o
`amount`+`date`). No se crea ningún gasto.
**Estado:** ✅ Aprobado
**Hallazgos:** Verificado por JSON-RPC. `isError: true`, mensaje "Debe
enviar al menos plannedAmount, o amount y date juntos. Un gasto nunca puede
quedar sin ningún monto." Sin creación.

---

### TC-MCP-035-003 — `create_expense` con `amount` sin `date` es rechazado
**Herramienta probada:** `create_expense` en `todo-api`
**Precondición:** Ninguna.
**Input de prueba:**
```json
{
  "description": "[TEST spec-035] MCP - amount sin date",
  "amount": 50000,
  "type": "basico"
}
```
**Output esperado:** Error de validación (`.refine()`) indicando que
`amount` y `date` deben ir juntos. No se crea ningún gasto.
**Estado:** ✅ Aprobado
**Hallazgos:** Verificado por JSON-RPC. `isError: true`, incluye "amount y
date deben enviarse juntos: un gasto ejecutado siempre tiene fecha, y
viceversa." Sin creación.

---

### TC-MCP-035-004 — `create_expense` con `date` sin `amount` es rechazado
**Herramienta probada:** `create_expense` en `todo-api`
**Precondición:** Ninguna.
**Input de prueba:**
```json
{
  "description": "[TEST spec-035] MCP - date sin amount",
  "date": "2026-09-10",
  "type": "basico"
}
```
**Output esperado:** Mismo error de validación que TC-MCP-035-003 (la regla
es simétrica). No se crea ningún gasto.
**Estado:** ✅ Aprobado
**Hallazgos:** Verificado por JSON-RPC. Mismo error simétrico que
TC-MCP-035-003. Sin creación.

---

### TC-MCP-035-005 — Auto-asignación de `budgetId` al crear con `date` en un mes con presupuesto
**Herramienta probada:** `create_expense` en `todo-api`
**Precondición:** `{{id-budget-a}}` existe para Mes A.
**Input de prueba:**
```json
{
  "description": "[TEST spec-035] MCP - auto-vínculo",
  "amount": 80000,
  "date": "{{fecha-dentro-de-mes-a}}",
  "type": "basico"
}
```
**Output esperado:** El gasto creado tiene `budgetId` igual al de
`{{id-budget-a}}` sin haberlo enviado explícitamente. Verificar cruzando con
`GET /finances/budgets/{{id-budget-a}}` (aparece en `expenses`).
**Estado:** ✅ Aprobado
**Hallazgos:** Verificado por JSON-RPC. `budget.id` = Mes A sin enviarlo
explícitamente (`d3c30a51-15ff-44bf-9285-85e440c88487`).

---

### TC-MCP-035-006 — `update_expense` ejecuta un gasto planeado agregando `amount`+`date`
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
**Estado:** ✅ Aprobado
**Hallazgos:** 🟡 **Hallazgo menor**: el schema real del tool usa `id`, no
`expenseId` (el input de prueba de este caso, tal como está redactado, es
rechazado con `Unrecognized key: "expenseId"`). Corregido en la llamada
real y verificado: `executionStatus: "settled"`, `plannedAmount`/`budgetId`
preservados. Registrado en `spec/backlog.md`.

---

### TC-MCP-035-007 — `create_expense` con `creditCardId` tiene efecto real
**Herramienta probada:** `create_expense` en `todo-api`
**Precondición:** `{{id-card}}` existe.
**Input de prueba:**
```json
{
  "description": "[TEST spec-035] MCP - con tarjeta",
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
**Estado:** ✅ Aprobado
**Hallazgos:** Verificado por JSON-RPC: `creditCard.id` correcto. En
`get_monthly_expense_summary` del mismo mes, `cardTotals.executed` sumó
correctamente ($450.000 = $300.000 de "Compra con Visa" + $150.000 de este
gasto).

---

### TC-MCP-035-008 — `get_monthly_expense_summary` con el contrato nuevo, mes con presupuesto
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
numéricos coinciden con lo verificado manualmente en TC-035-003 y 004.
**Estado:** ✅ Aprobado
**Hallazgos:** Verificado por JSON-RPC: shape completo presente
(`plannedTotal`, `executedTotal`, `variance`, `pendingPlannedTotal`,
`unplannedTotal`, `byType`, `cardTotals`, `budgetId` no nulo), sin
`budgetTotal`/`expensesTotal`/`combinedTotal`.

---

### TC-MCP-035-009 — `get_monthly_expense_summary` en un mes sin presupuesto
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
**Estado:** ✅ Aprobado
**Hallazgos:** Verificado por JSON-RPC (enero 2030): `budgetId: null`,
`plannedTotal: 0`, `pendingPlannedTotal: 0`, `unplannedTotal: 40000`,
`executedTotal: 40000` — todos exactos.

---

### TC-MCP-035-010 — `duplicate_budget` deja `amount`/`date` en null en el destino
**Herramienta probada:** `duplicate_budget` en `todo-api`
**Precondición:** `{{id-budget-a}}` tiene gastos planeados y liquidados.
**Input de prueba:**
```json
{ "budgetId": "{{id-budget-a}}", "month": {{mes-destino}}, "year": {{año-destino}} }
```
**Output esperado:** Igual que TC-035-009 pero verificado por MCP: el
contador devuelto es `plannedExpensesCopied` (no `itemsCopied`), y cada
gasto del presupuesto destino tiene `plannedAmount` copiado con
`amount`/`date` en null, incluso el que en origen estaba `settled`.
**Estado:** ✅ Aprobado
**Hallazgos:** 🟡 **Hallazgo menor**: el schema real usa `sourceBudgetId`,
no `budgetId` como dice este caso (rechazado con
`Unrecognized key`/campo faltante hasta corregirlo). Registrado en
`spec/backlog.md`. Con el nombre correcto: `plannedExpensesCopied: 6` (los
6 gastos con `plannedAmount` no nulo de Mes A, excluida la cuota de deuda),
todos con `amount`/`date` en null en el destino — incluido el que en origen
estaba `settled`.

---

### TC-MCP-035-011 — `duplicate_expense` copia el gasto tal cual (asimetría con `duplicate_budget`)
**Herramienta probada:** `duplicate_expense` en `todo-api`
**Precondición:** `{{id-expense-settled-a}}` tiene `amount`+`date`.
**Input de prueba:**
```json
{ "expenseId": "{{id-expense-settled-a}}", "month": {{mes-destino}}, "year": {{año-destino}} }
```
**Output esperado:** El gasto duplicado conserva `amount` y `date`
desplazada (no null) — confirma la asimetría deliberada con
TC-MCP-035-010. Verificar también que un gasto **plan-only** como origen
(`{{id-expense-planned-a}}`) se duplica tolerando `date: null` (no lanza
error del tipo `split of null`).
**Estado:** ✅ Aprobado
**Hallazgos:** El schema real usa `expenseId` (coincide con lo redactado
aquí, a diferencia de `update_expense`/`duplicate_budget` — ver hallazgo de
inconsistencia de nombres en `spec/backlog.md`). Duplicado "Streaming"
(settled) a marzo 2031: `amount: 95000`, `date: 2031-03-15` (desplazada, no
null). Duplicado "Planeado con Visa" (plan-only, `date: null` en origen) a
mayo 2031: sin error, `amount`/`date` quedan en null en el destino también
— tolera el origen sin fecha.

---

### TC-MCP-035-012 — `add_budget_item`, `update_budget_item`, `delete_budget_item` ya no existen
**Herramienta probada:** listado de tools (`tools/list`) en `todo-api`
**Precondición:** Ninguna.
**Pasos:**
1. Listar todas las tools expuestas por `todo-api`.
2. Buscar `add_budget_item`, `update_budget_item`, `delete_budget_item`.
**Resultado esperado:** Ninguna de las tres aparece en el listado.
`create_expense`/`update_expense`/`delete_expense` sí aparecen, con
`plannedAmount`, `budgetId` y `creditCardId` en el `inputSchema` de
`create_expense`/`update_expense`.
**Estado:** ✅ Aprobado
**Hallazgos:** Verificado por `tools/list`: las 3 tools eliminadas no
aparecen. `create_expense` expone `plannedAmount`, `budgetId` y
`creditCardId` en su `inputSchema`.

---

### TC-MCP-035-013 — `list_expenses` con filtros `budgetId` y `status`
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
**Estado:** ✅ Aprobado
**Hallazgos:** Confirmada la discrepancia ya anotada en la Fase 6 del spec:
no existe un campo `status` en el schema real de `list_expenses` — son
`planned`/`executed` (booleanos), los nombres reales de
`ExpensesQueryDto`. Con `budgetId` + `planned: true`: devuelve exactamente
los 3 gastos de Mes A sin `amount`. Con `budgetId` + `executed: true`:
devuelve los 9 gastos con `amount`, sin solaparse con el conjunto anterior.

---

## Resumen de la ronda

- **Aprobados: 33** (20 UI + 13 MCP) — **Fallidos: 0** — **Pendientes: 0**
- Ejecutado por Claude en el navegador y por API/MCP directa, con
  autorización explícita del usuario en esta sesión para toda la ronda
  (tras confirmarlo caso a caso al inicio).
- Hallazgos escalados a `spec/backlog.md`:
  1. Previsualización de `DuplicateBudgetForm` sobrecuenta los gastos a
     copiar cuando hay cuotas de deuda en el mes (dice "5", copia "4").
  2. Badge "Sin presupuesto" en `ExpenseCard.tsx` es una etiqueta engañosa
     (en realidad significa "sin plan", no "sin `budgetId`").
  3. Inconsistencia de nombre del identificador entre tools MCP del dominio
     de finanzas (`id` vs. `expenseId` vs. `sourceBudgetId`).
  Ninguno bloqueó ningún caso — todos son hallazgos de UX/copy o
  documentación, no bugs funcionales.
- Desviaciones de datos de prueba, todas documentadas en su caso
  correspondiente: se usaron meses aislados (2029-2031) en vez del mes en
  curso real por colisión con datos financieros reales del usuario
  (septiembre 2026); se reemplazó el "gasto suelto" de diciembre 2032 por
  uno de diciembre 2029 por una limitación del selector de año de
  `ExpensesView` (rango fijo de 5 años); se reemplazó la deuda original de
  TC-035-012/013 por una nueva tras que su cuota 2/3 quedara borrada en
  cascada por TC-035-011. La rama "cuotas vencidas" del ciclo de vida de
  deudas (TC-035-013) no se pudo verificar manualmente por la misma razón
  de aislamiento — cubierta con precisión por `e2e-026`/`e2e-035`
  automatizados, que sí controlan la fecha por código.
- Limpieza de datos de prueba: **✅ Completada**. Eliminados en orden:
  2 deudas de prueba (cascada de sus cuotas), 7 presupuestos auto-creados
  vacíos, 3 presupuestos principales (cascada de ~22 gastos), 7 gastos
  sueltos sin presupuesto, 1 tarjeta de crédito. El gasto que quedó
  temporalmente mezclado con el presupuesto real "sdsad" (ver TC-035-013)
  se eliminó de inmediato al detectarlo, no se esperó al cierre de la
  ronda. Verificado por barrido de API sin resultados para "spec-035" en
  deudas, presupuestos (2029-2031), tarjetas, ni gastos (revisados los
  meses 2029-09, 2029-10, 2029-12, 2030-01, 2031-02 a 05).
