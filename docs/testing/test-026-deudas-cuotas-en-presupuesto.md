# test-026 — Deudas: calendario de cuotas materializado en presupuestos

> Redactado en modo test-first, junto con `spec/spec-026-deudas-cuotas-en-presupuesto.md`
> (que el usuario está escribiendo en paralelo con `@architect`), **antes** de
> que exista una sola línea de implementación. Todos los casos quedan en
> `⬜ Pendiente` hasta que la Fase de implementación correspondiente esté
> completa y el usuario los ejecute.
>
> **Aviso de alcance:** este archivo se redactó sin leer `spec-026` (instrucción
> explícita del usuario — el spec no existía aún al momento de escribir este
> archivo). Los nombres exactos de campos, textos y formatos (ej. `"Presupuesto
> <Mes> <Año>"`, `"Cuota k/N — <descripción>"`, textos de la UI) se tomaron
> **literalmente** de la descripción funcional que acompañó este encargo. Si al
> redactar el spec definitivo algún detalle de forma cambia, ajustar estos
> casos antes de ejecutarlos (no invalida el resto del archivo).

## Datos de prueba
> Recursos a crear vía API para poder ejecutar estos casos. Se completan con
> identificadores reales, endpoint exacto usado y estado de eliminación **al
> ejecutar** la ronda (no ahora), siguiendo "Pruebas manuales asistidas por
> Claude" del `CLAUDE.md` raíz. Los "mes de inicio" propuestos abajo están
> pensados en relación con la fecha de redacción de este archivo
> (**2026-08-14**, mes en curso = agosto 2026) — si la ronda se ejecuta en otra
> fecha, recalcular los meses relativos ("mes en curso", "mes anterior",
"mes siguiente") contra la fecha real de ejecución antes de crear los datos.

| Recurso | Endpoint de creación | Identificador | Usado en | Eliminado |
|---|---|---|---|---|
| "[TEST spec-026] DEBT-A — Nevera" (`startMonth: 8, startYear: 2026, totalInstallments: 3, installmentValue: 100000, productValue: 300000`) | `POST /finances/debts` | `613097c4-e988-4c4b-b527-7fe328ffa24a` | TC-026-001, TC-026-002, TC-026-003, TC-026-011, TC-026-012, TC-026-013 | ⬜ |
| "[TEST spec-026] DEBT-B — TV (vencida completa)" (`startMonth: 6, startYear: 2026, totalInstallments: 1, installmentValue: 150000, productValue: 150000`) | `POST /finances/debts` (creada vía UI) | `51e81e41-eb16-4132-92b3-497a3f5705be` | TC-026-004, TC-026-006 (pay-off rechazado), TC-026-015 (inicio pasado) | ⬜ |
| "[TEST spec-026] DEBT-C — Compra pay-off" (`startMonth: 7, startYear: 2026, totalInstallments: 4, installmentValue: 80000, productValue: 320000`) | `POST /finances/debts` (creada y pagada vía UI) | `c2d50ec0-f9f5-4d8c-98d1-e08b7cc067ad`; gasto de pago total: `dec5962b-f7d8-4dd1-92b0-cc48970e2456` | TC-026-005 | ⬜ |
| "[TEST spec-026] DEBT-D — Cruce de año" (`startMonth: 11, startYear: 2026, totalInstallments: 5, installmentValue: 60000, productValue: 300000`) | `POST /finances/debts` (creada vía UI) | deuda visible en `/finances/debts`, presupuestos autogenerados: `ac654f81-b284-4b5e-b8e1-e4dc8a852515` (Ene 2027), `b453e64e-1833-4312-8e9a-d0f65a77af01` (Feb 2027), `5b8886cc-2e50-4bc0-acbe-948bfc9b94f2` (Mar 2027), + Nov/Dic 2026 | TC-026-002 (autogeneración), TC-026-014, TC-026-015 | ⬜ |
| "[TEST spec-026] DEBT-E — Plazo de 1 cuota futura" (`startMonth: 9, startYear: 2026, totalInstallments: 1, installmentValue: 200000, productValue: 200000`) | `POST /finances/debts` | `{{id}}` | TC-026-014, TC-026-015 | ⬜ |
| "[TEST spec-026] DEBT-F — Inicio futuro lejano" (`startMonth: 1, startYear: 2028, totalInstallments: 6, installmentValue: 50000, productValue: 300000`) | `POST /finances/debts` | `{{id}}` | TC-026-014 | ⬜ |
| "[TEST spec-026] DEBT-G — Edición regenera futuras" (`startMonth: 6, startYear: 2026, totalInstallments: 6, installmentValue: 90000→120000, productValue: 540000`) | `POST /finances/debts` (creada vía UI) | `ee15a840-bc54-4080-b067-2d5e935d0cb1` | TC-026-007, TC-026-008 | ⬜ |
| "[TEST spec-026] DEBT-H — Eliminar deuda" (`startMonth: 7, startYear: 2026, totalInstallments: 4, installmentValue: 70000, productValue: 280000`) | `POST /finances/debts` | `{{id}}` | TC-026-009 | ⬜ |
| "[TEST spec-026] DEBT-I — Sincronizar presupuestos" (`startMonth: 8, startYear: 2026, totalInstallments: 3, installmentValue: 110000, productValue: 330000`) | `POST /finances/debts` | `{{id}}` | TC-026-010 | ⬜ |
| Deuda legacy pre-existente (creada **antes** del deploy de spec-026, con `paidInstallments` real distinto de 0) | — (recurso preexistente, no se crea en esta ronda) | `{{id-legacy}}` | TC-026-016 | — (no se elimina, es un dato real) |
| Presupuesto manual mes destino de duplicado (agosto 2026 → diciembre 2026, o el mes que corresponda al ejecutar) | `POST /finances/budgets/:id/duplicate` sobre el presupuesto de septiembre 2026 (contiene la cuota 2/3 de DEBT-A) | `{{id-presupuesto-duplicado}}` | TC-026-011 | ⬜ |

**Notas de uso:**
- Todas las deudas de esta ronda llevan el prefijo `[TEST spec-026]` en la
  descripción para distinguirlas de deudas reales durante la limpieza.
- DEBT-A, DEBT-G, DEBT-H, DEBT-I anclan su calendario en meses **reales
  cercanos a "hoy"** (jun–oct 2026) a propósito: sirven para validar que el
  sistema **reutiliza** presupuestos mensuales que ya existan en el entorno de
  pruebas (criterio de "no duplicar"). Antes de crear estas deudas, registrar
  en esta tabla si el presupuesto de cada mes involucrado **ya existía** o se
  creó como parte de esta ronda — de eso depende si al limpiar hay que borrar
  el presupuesto completo o solo los ítems de cuota que agregamos.
- DEBT-D y DEBT-F anclan en años futuros lejanos (2027–2028) para operar sobre
  presupuestos que casi con certeza no existen aún, minimizando interferencia
  con datos reales.
- Los ítems de cuota (`BudgetItem` con `type: pago_deuda` y `debtId` no nulo)
  que terminen en presupuestos preexistentes deben limpiarse **individualmente**
  (`DELETE /finances/budgets/:budgetId/items/:itemId`), sin borrar el
  presupuesto completo si no fue creado por esta ronda.
- Los presupuestos que sí se crearon como consecuencia de estas deudas
  (`POST /finances/debts` autogenerando `POST /finances/budgets` internamente)
  se identifican por su nombre `"Presupuesto <Mes> <Año>"` y **no** tener otros
  ítems ajenos a esta ronda — se pueden borrar completos
  (`DELETE /finances/budgets/:id`).

**Entorno de pruebas:** desarrollo (`http://localhost:3003/api/v1`) —
**confirmado** el 2026-08-14: el MCP `todo-api` conectado a esta sesión apunta
a producción (devolvió deudas reales), así que **no se usó para esta ronda**;
toda la preparación e interacción con la API se hizo vía REST directo contra
`localhost:3003` con login local. El backend local corría con código anterior
a spec-026 en memoria (`nest start --watch` no había recargado) — se
reinició antes de esta ronda para confirmar el shape nuevo (`startMonth`,
`startYear`, `paidOffAt`, `nextInstallment`, `paidInstallments` derivado).
**Fecha de la ronda:** 2026-08-14 (mes en curso = agosto 2026, sin necesidad de
recalcular meses relativos).

**Reconocimiento previo (2026-08-14, antes de crear cualquier deuda de prueba):**

| Mes | Presupuesto existente | Notas |
|---|---|---|
| Junio 2026 | `Presupuesto Junio 2026` (0 ítems) | Se **reutilizará**; queda con el ítem de cuota agregado — no borrar el presupuesto completo al limpiar, solo el ítem. |
| Julio 2026 | `Presupuesto - Julio 2026` (11 ítems reales) | Se **reutilizará**; limpiar solo los ítems de cuota que agreguemos. |
| Agosto 2026 | `Presupuesto - Agosto 2026` (11 ítems reales, incluye la cuota de "Nevera Samsung" preexistente) | Se **reutilizará**. |
| Septiembre 2026 | `sdsad` (11 ítems reales) | Se **reutilizará** — nombre real del usuario, no autogenerado. |
| Octubre 2026 | `Presupuesto Octubre 2026` (0 ítems) | Se **reutilizará**. |
| Noviembre 2026 – Marzo 2027 | Ninguno | Se **autogenerarán** al crear DEBT-D — verificar nombre `"Presupuesto <Mes> <Año>"` y que solo tengan el ítem de cuota. Seguros de borrar completos al limpiar. |
| Enero – Junio 2028 | Ninguno | Se **autogenerarán** al crear DEBT-F — mismo criterio que arriba. |

- Deudas de prueba con prefijo `[TEST spec-026]` existentes antes de la ronda: **ninguna** (solo existe "Nevera Samsung", deuda real preexistente no relacionada con esta ronda — no tocar).
- Gastos existentes antes de la ronda (línea base para TC-026-005): **28** (primera página, límite 100).

**Aclaración sobre esta tabla:** a diferencia de otros archivos `test-NNN`, las
deudas DEBT-A a DEBT-I **no se pre-crean vía API** — su creación es el propio
paso de acción de cada caso (`TC-026-001`, `002`, `004`, `005`, `007`, `009`,
`010`, `014`), ejecutado por el usuario en la UI. Esta tabla documenta sus
payloads como referencia para verificar el formulario, no como datos ya
montados.

---

## Casos de prueba

### TC-026-001 — Crear una deuda de N cuotas genera el calendario completo en presupuestos
**Precondición:** Ninguna deuda "[TEST spec-026] DEBT-A" existe todavía.
**Datos de prueba usados:** payload de DEBT-A (`startMonth: 8, startYear: 2026, totalInstallments: 3, installmentValue: 100000`).
**Pasos:**
1. Navegar a `/finances/debts`.
2. Hacer clic en "Nueva deuda" y completar: descripción "[TEST spec-026] DEBT-A — Nevera", valor producto "300000", valor cuota "100000", número de cuotas "3", mes de inicio "Agosto", año de inicio "2026".
3. Guardar.
4. Ir a `/finances/budgets` y abrir el presupuesto de agosto 2026, luego septiembre 2026, luego octubre 2026.
**Resultado esperado:** La card de la deuda aparece con "1 / 3 cuotas" (el mes en curso cuenta como vencida) y muestra el mes de inicio y la próxima cuota. Cada uno de los tres presupuestos (ago/sep/oct 2026) tiene un ítem con descripción `"Cuota 1/3 — [TEST spec-026] DEBT-A — Nevera"`, `"Cuota 2/3 — ..."`, `"Cuota 3/3 — ..."` respectivamente, cada uno con `plannedAmount: 100000` y marcado con el badge "Deuda".
**Estado:** ✅ Aprobado
**Hallazgos:** Sin observaciones. Verificado vía API: `id=613097c4-e988-4c4b-b527-7fe328ffa24a`, `paidInstallments: 1`, `remainingValue: 200000`, `nextInstallment: {number: 2, month: 9, year: 2026}` — consistente con lo reportado por el usuario en la UI.

---

### TC-026-002 — Los meses sin presupuesto se autogeneran; los existentes se reutilizan sin duplicarse
**Precondición:** El presupuesto de agosto 2026 ya existe (real o creado por TC-026-001); los presupuestos de noviembre 2026 a marzo 2027 no existen.
**Datos de prueba usados:** DEBT-A (mes ago-2026 reutilizado), DEBT-D (`startMonth: 11, startYear: 2026, totalInstallments: 5`).
**Pasos:**
1. Antes de crear DEBT-D, ir a `/finances/budgets` y confirmar cuántos presupuestos existen entre noviembre 2026 y marzo 2027 (debería ser 0).
2. Crear la deuda "[TEST spec-026] DEBT-D — Cruce de año" con mes de inicio noviembre 2026, 5 cuotas.
3. Volver a `/finances/budgets` y listar noviembre 2026 → marzo 2027.
**Resultado esperado:**
- Se crearon exactamente 5 presupuestos nuevos (nov-2026, dic-2026, ene-2027, feb-2027, mar-2027), cada uno con nombre `"Presupuesto <Mes> <Año>"` (ej. `"Presupuesto Noviembre 2026"`) y un único ítem de cuota.
- Por separado, al confirmar el estado de agosto 2026 (mes de DEBT-A, TC-026-001): sigue existiendo **un solo** presupuesto para ese mes (no se duplicó al crear DEBT-A sobre un mes ya existente), con el ítem de cuota agregado a los ítems que ya tuviera.
**Estado:** ✅ Aprobado
**Hallazgos:** Ejecutado en el navegador (autorización explícita del usuario para este caso). Nov/Dic 2026 se autogeneraron correctamente (`"Presupuesto Noviembre 2026"`, `"Presupuesto Diciembre 2026"`, 1 ítem, $60.000 c/u) — confirmado en UI. Ene–Mar 2027 confirmados vía API por una limitación de la automatización con el `<select>` nativo de año en `BudgetsView` (no es un bug del producto — el filtro funciona normalmente con interacción real de mouse). Agosto 2026 no se duplicó: sigue siendo `"Presupuesto - Agosto 2026"`, ahora con 12 ítems (11 reales + 1 cuota de DEBT-A).

---

### TC-026-003 — `paidInstallments` y `remainingValue` se derivan del calendario sin acción del usuario
**Precondición:** Existe DEBT-A con `1/3` cuotas "pagadas" (derivadas, sin haber pulsado ningún botón de pago).
**Datos de prueba usados:** `{{id-debt-a}}`.
**Pasos:**
1. Ir a `/finances/debts` inmediatamente después de crear DEBT-A (sin ninguna otra acción sobre ella).
2. Verificar el contador de cuotas y el valor restante en la card.
3. Verificar vía `GET /finances/debts/{{id-debt-a}}` los mismos valores.
**Resultado esperado:** La card muestra "1 / 3 cuotas" y `remainingValue = 200000` (2 cuotas × 100000) sin que el usuario haya pagado nada manualmente — el valor surge de comparar el mes en curso contra el calendario de la deuda.
**Estado:** ✅ Aprobado
**Hallazgos:** Sin observaciones.

---

### TC-026-004 — Deuda cuyo último mes ya pasó aparece "Pagada" automáticamente, con saldo cero
**Precondición:** DEBT-B ("[TEST spec-026] DEBT-B — TV") tiene `startMonth: 6, startYear: 2026, totalInstallments: 1` — su única cuota es de junio 2026, ya vencida.
**Datos de prueba usados:** `{{id-debt-b}}`.
**Pasos:**
1. Crear DEBT-B con esos datos.
2. Ir a `/finances/debts` y ubicar la card sin haber pagado nada.
3. Cambiar al tab "Pagadas".
**Resultado esperado:** La card aparece directamente con badge "Pagada", "1 / 1 cuotas" y `remainingValue: 0`, y se lista en el tab "Pagadas" sin que el usuario haya pulsado ningún botón de pago — la normalización ocurre sola al consultar la deuda.
**Estado:** ✅ Aprobado
**Hallazgos:** Ejecutado en el navegador (autorización explícita del usuario). Confirmado en UI y por API: `status: "pagada"`, `paidInstallments: 1`, `remainingValue: 0`, y además `paidOffAt` quedó backfilleado automáticamente por la normalización perezosa (aproximación esperada por diseño — no es un pago real, sino la primera vez que se consultó la deuda tras completarse el calendario). Sin observaciones.

---

### TC-026-005 — Pagar deuda completa: monto exacto, conserva el mes en curso, borra solo futuros, crea el gasto
**Precondición:** DEBT-C ("[TEST spec-026] DEBT-C — Compra pay-off") tiene `startMonth: 7, startYear: 2026, totalInstallments: 4` → julio y agosto 2026 vencidas (2/4), septiembre y octubre 2026 futuras.
**Datos de prueba usados:** `{{id-debt-c}}`.
**Pasos:**
1. Crear DEBT-C con esos datos y confirmar en la card que muestra "2 / 4 cuotas" y `remainingValue: 160000` (2 × 80000).
2. Anotar cuántos gastos existen en `/finances/expenses` antes de continuar.
3. En la card de DEBT-C, hacer clic en "Pagar deuda completa".
4. En el `ConfirmDialog`, verificar que el monto mostrado es exactamente `$160.000` (el saldo pendiente, no el valor total de la deuda).
5. Confirmar el pago.
6. Ir a `/finances/expenses` y ubicar el nuevo gasto.
7. Ir a `/finances/budgets` y revisar los presupuestos de julio, agosto, septiembre y octubre de 2026.
**Resultado esperado:**
- La card de DEBT-C pasa a badge "Pagada", con "4 / 4 cuotas" (o equivalente) y `remainingValue: 0`.
- El nuevo gasto tiene descripción `"Pago total: [TEST spec-026] DEBT-C — Compra pay-off"`, monto `160000`, tipo `pago_deuda`, fecha de hoy.
- Los presupuestos de julio y agosto 2026 **conservan** su ítem de cuota de DEBT-C sin cambios (incluye el del mes en curso).
- Los presupuestos de septiembre y octubre 2026 **ya no tienen** el ítem de cuota de DEBT-C (fue eliminado).
**Estado:** ✅ Aprobado
**Hallazgos:** Ejecutado en el navegador (autorización explícita del usuario). El `ConfirmDialog` mostró exactamente "$160.000" y el texto de advertencia correcto antes de confirmar. Verificado por API: gasto `dec5962b-...` (`amount: 160000.00`, `type: pago_deuda`, `date: 2026-08-15`), deuda `status: pagada`, `paidOffAt` seteado, `4/4 cuotas`, `remainingValue: 0`. Julio y agosto 2026 conservan sus ítems (`Cuota 1/4`, `Cuota 2/4`); septiembre y octubre 2026 ya no tienen ítem de DEBT-C. Sin observaciones.

---

### TC-026-006 — `pay-off` sobre una deuda ya pagada o sin saldo es rechazado
**Precondición:** DEBT-B ya está "Pagada" (ver TC-026-004).
**Datos de prueba usados:** `{{id-debt-b}}`.
**Pasos:**
1. Ir a la card de DEBT-B.
2. Verificar si el botón "Pagar deuda completa" está deshabilitado o ausente.
3. Si es posible forzar la llamada (o vía API, `POST /finances/debts/{{id-debt-b}}/pay-off`), confirmar el resultado.
**Resultado esperado:** La UI no permite pagar una deuda ya pagada (botón deshabilitado/ausente); la llamada directa al endpoint responde `400` con un mensaje claro de que la deuda no tiene saldo pendiente. No se crea ningún gasto adicional ni cambia `paidOffAt`.
**Estado:** ✅ Aprobado
**Hallazgos:** Confirmado por el usuario: el botón "Pagar deuda completa" está ausente en la card de DEBT-B (Pagada). Verificado además por API: `POST /finances/debts/51e81e41-.../pay-off` → `400 "Debt ... has no remaining balance to pay off"`; `paidOffAt` no cambió (`2026-08-15T15:05:02.747Z` antes y después) y el conteo de gastos se mantuvo en 29 (no se creó un segundo gasto).

---

### TC-026-007 — Editar `installmentValue`/`totalInstallments` regenera solo los ítems futuros
**Precondición:** DEBT-G tiene `startMonth: 6, startYear: 2026, totalInstallments: 6` → junio, julio y agosto 2026 vencidas (3/6) con `plannedAmount: 90000`; septiembre, octubre y noviembre 2026 futuras.
**Datos de prueba usados:** `{{id-debt-g}}`.
**Pasos:**
1. Crear DEBT-G y anotar el `plannedAmount` de los ítems de junio, julio y agosto 2026 (deberían ser `90000` cada uno).
2. Editar la deuda: cambiar "valor cuota" a `120000`. Confirmar que la UI muestra un aviso de que esto regenerará las cuotas futuras.
3. Guardar.
4. Revisar de nuevo los presupuestos de junio, julio, agosto (vencidas) y septiembre, octubre, noviembre 2026 (futuras).
**Resultado esperado:** Los ítems de junio, julio y agosto **conservan** `plannedAmount: 90000` sin cambios. Los ítems de septiembre, octubre y noviembre pasan a `plannedAmount: 120000`, siguen siendo exactamente 3 ítems (no se duplican ni sobran), y conservan su `installmentNumber` (4/6, 5/6, 6/6).
**Estado:** ✅ Aprobado
**Hallazgos:** Pasos 1-2 ejecutados en el navegador por Claude (autorización puntual del usuario); pasos 3-5 ejecutados por el usuario, quien confirmó el aviso de regeneración antes de guardar. Verificado por API: jun/jul/ago 2026 conservan `plannedAmount: 90000` (`installmentNumber` 1/2/3); sep/oct/nov 2026 pasaron a `120000` (`installmentNumber` 4/5/6), sin duplicados. `remainingValue` de la deuda: `360000` (3 × 120000). Sin observaciones.

---

### TC-026-008 — Editar `description` propaga el cambio a todos los ítems (vencidos y futuros)
**Precondición:** DEBT-G existe con sus 6 ítems ya creados (reutilizar el estado post-TC-026-007).
**Datos de prueba usados:** `{{id-debt-g}}`.
**Pasos:**
1. Editar la deuda: cambiar la descripción a "[TEST spec-026] DEBT-G — Edición regenera futuras (renombrada)".
2. Guardar.
3. Revisar los 6 presupuestos involucrados (junio 2026 a noviembre 2026).
**Resultado esperado:** Los 6 ítems (vencidos **y** futuros) actualizan su descripción a `"Cuota k/6 — [TEST spec-026] DEBT-G — Edición regenera futuras (renombrada)"`, sin alterar `plannedAmount` ni `installmentNumber`.
**Estado:** ✅ Aprobado
**Hallazgos:** Ejecutado en el navegador (autorización explícita del usuario). Verificado por API: los 6 ítems (jun-nov 2026) propagaron la descripción sin alterar `plannedAmount` (90000/90000/90000/120000/120000/120000) ni `installmentNumber` (1-6).

**Bug encontrado y corregido en este caso (fuera del criterio de aceptación, pero dentro del alcance de spec-026):** al abrir el modal de edición de CUALQUIER deuda activa, `DebtForm.tsx` mostraba el aviso "Este cambio regenerará las cuotas futuras..." **sin que el usuario hubiera cambiado nada**. Causa: `willRegenerate` comparaba `Number(installmentValue)` (del formulario) contra `initial.installmentValue` sin convertir — y el backend devuelve `installmentValue` (columna `decimal`) como string (`"120000.00"`), no como número, así que la comparación de tipos siempre daba `true`. Corregido envolviendo también `initial.*` en `Number(...)` en las cuatro comparaciones de `willRegenerate` (`frontend/src/components/finances/DebtForm.tsx`). Verificado en el navegador tras el fix, en este mismo caso: se reabrió el modal de edición de DEBT-G sin cambiar ningún valor y el aviso ya no aparece; al cambiar la descripción (paso real de este caso) tampoco aparece, correctamente (no es un campo de calendario). `npx tsc --noEmit` sin errores tras el cambio. Nota: TC-026-007 (editar `installmentValue`) se ejecutó **antes** de este fix — el aviso apareció ahí correctamente, pero no sirve para distinguir si el bug estaba presente, ya que en ese caso el valor sí cambiaba.

---

### TC-026-009 — Eliminar una deuda borra los ítems futuros y desasocia los vencidos
**Precondición:** DEBT-H tiene `startMonth: 7, startYear: 2026, totalInstallments: 4` → julio y agosto 2026 vencidas (2/4), septiembre y octubre 2026 futuras.
**Datos de prueba usados:** `{{id-debt-h}}`.
**Pasos:**
1. Crear DEBT-H y confirmar sus 4 ítems en los presupuestos correspondientes.
2. Eliminar la deuda desde la card (papelera + confirmación).
3. Revisar los presupuestos de julio, agosto, septiembre y octubre de 2026.
**Resultado esperado:** La deuda desaparece de `/finances/debts`. Los ítems de septiembre y octubre 2026 (futuros) fueron eliminados. Los ítems de julio y agosto 2026 (vencidos) **siguen existiendo** en sus presupuestos con el mismo `plannedAmount` y descripción, pero ya no muestran el badge "Deuda" (quedaron desasociados: `debtId`/`installmentNumber` nulos) — el presupuesto histórico no pierde ese gasto planeado.
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-026-010 — Borrar un ítem futuro manualmente y usar "Sincronizar presupuestos" para recrearlo; ejecutarlo dos veces no duplica
**Precondición:** DEBT-I tiene `startMonth: 8, startYear: 2026, totalInstallments: 3` → agosto 2026 vencida (mes en curso, 1/3), septiembre y octubre 2026 futuras.
**Datos de prueba usados:** `{{id-debt-i}}`.
**Pasos:**
1. Crear DEBT-I y confirmar sus 3 ítems.
2. Ir al presupuesto de septiembre 2026 y borrar manualmente el ítem de cuota de DEBT-I (como cualquier ítem, desde el detalle del presupuesto).
3. Volver a `/finances/debts`, ubicar DEBT-I y hacer clic en "Sincronizar presupuestos".
4. Revisar el presupuesto de septiembre 2026.
5. Hacer clic en "Sincronizar presupuestos" una segunda vez sin haber borrado nada.
**Resultado esperado:** Tras el paso 3, el presupuesto de septiembre 2026 vuelve a tener el ítem de cuota de DEBT-I (`"Cuota 2/3 — ..."`, `plannedAmount: 110000`). El ítem de agosto 2026 (vencido) no se tocó en ningún momento. Tras el paso 5, no aparece un ítem duplicado — sigue habiendo exactamente un ítem de cuota de DEBT-I por mes futuro.
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-026-011 — Duplicar un mes con cuotas de deuda no las copia
**Precondición:** El presupuesto de septiembre 2026 tiene el ítem de cuota 2/3 de DEBT-A (`"Cuota 2/3 — [TEST spec-026] DEBT-A — Nevera"`) además de, idealmente, algún ítem normal ajeno a deudas (agregar uno manualmente si no existe, ej. "Arriendo" por `1000000`, `type: basico`).
**Datos de prueba usados:** `{{id-presupuesto-septiembre-2026}}`.
**Pasos:**
1. Confirmar el número total de ítems del presupuesto de septiembre 2026 (incluyendo la cuota de DEBT-A).
2. Duplicar ese presupuesto a un mes destino sin presupuesto previo (ej. diciembre 2026).
3. Revisar el `itemsCopied` devuelto y el contenido del presupuesto destino.
**Resultado esperado:** `itemsCopied` refleja únicamente los ítems que **no** son de deuda (ej. si septiembre tenía 2 ítems totales — 1 de deuda + 1 normal — `itemsCopied` es `1`). El presupuesto destino no contiene ningún ítem con badge "Deuda" ni asociado a DEBT-A.
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-026-012 — Los ítems de cuota son editables/borrables desde el detalle del presupuesto, con badge "Deuda"; editar el monto los desincroniza
**Precondición:** Existe el ítem de cuota de agosto 2026 de DEBT-A (`"Cuota 1/3 — ..."`, `plannedAmount: 100000`).
**Datos de prueba usados:** `{{id-debt-a}}`, `{{id-presupuesto-agosto-2026}}`.
**Pasos:**
1. Ir al detalle del presupuesto de agosto 2026 y ubicar el ítem de la cuota de DEBT-A.
2. Verificar que muestra el badge "Deuda".
3. Editarlo manualmente: cambiar `plannedAmount` a `95000` desde el propio detalle del presupuesto (como cualquier ítem).
4. Guardar.
5. Volver a `/finances/debts`, editar DEBT-A cambiando `installmentValue` a `105000` (esto regenera solo ítems **futuros**, ver TC-026-007).
6. Revisar de nuevo el ítem de agosto 2026 (vencido).
**Resultado esperado:** El ítem se edita sin restricciones (como cualquier `BudgetItem`), queda en `95000` tras el paso 4. Como agosto 2026 es un mes **vencido** (o el mes en curso), la regeneración del paso 5 no lo toca — sigue en `95000`, desincronizado del nuevo `installmentValue` (`105000`) de la deuda, hasta que se regenere manualmente (lo cual, por ser vencido, no vuelve a ocurrir automáticamente).
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-026-013 — "Pagar cuota" ya no existe en la UI de deudas
**Precondición:** Existe al menos una deuda activa (DEBT-A).
**Datos de prueba usados:** `{{id-debt-a}}`.
**Pasos:**
1. Ir a `/finances/debts` y ubicar la card de DEBT-A.
2. Revisar todos los botones/acciones disponibles en la card.
**Resultado esperado:** No existe ningún botón "Pagar cuota". Las acciones disponibles son "Pagar deuda completa", "Sincronizar presupuestos", editar y eliminar.
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-026-014 — `DebtForm`: campos de mes/año de inicio, valor por defecto y aviso de regeneración
**Precondición:** Ninguna — verificación de formulario.
**Datos de prueba usados:** ninguno (o DEBT-E como resultado de esta prueba).
**Pasos:**
1. Ir a `/finances/debts` y hacer clic en "Nueva deuda".
2. Verificar que el formulario tiene los campos "Mes de inicio" y "Año de inicio", con valor por defecto el mes siguiente al actual (septiembre 2026 si se ejecuta en agosto 2026).
3. Completar y guardar una deuda de 1 sola cuota con esos valores por defecto (esta sería DEBT-E).
4. Abrir la deuda para editar y cambiar el mes de inicio.
5. Observar si aparece un aviso advirtiendo que el cambio regenerará el calendario de cuotas.
**Resultado esperado:** El formulario predefine el mes siguiente al actual como mes de inicio. Al editar cualquier campo de calendario (mes/año de inicio, valor de cuota, número de cuotas) de una deuda ya creada, se muestra un aviso explícito antes de guardar.
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-026-015 — Casos borde de calendario
**Precondición:** DEBT-D (cruce de año), DEBT-E (plazo de 1 cuota), DEBT-B (inicio en el pasado) y DEBT-F (inicio futuro lejano) existen.
**Datos de prueba usados:** `{{id-debt-d}}`, `{{id-debt-e}}`, `{{id-debt-b}}`, `{{id-debt-f}}`.
**Pasos:**
1. **Cruce de año (DEBT-D):** confirmar que sus 5 cuotas caen en noviembre 2026, diciembre 2026, enero 2027, febrero 2027 y marzo 2027 — sin errores de cálculo al cruzar el año.
2. **Plazo de 1 cuota (DEBT-E):** confirmar que muestra "0 / 1 cuotas" si su único mes es futuro (o "1/1" si cae en el mes en curso al momento de ejecutar), sin división por cero ni comportamiento anómalo en la barra de progreso.
3. **Inicio en el pasado (DEBT-B):** ya cubierto en TC-026-004 — confirmar aquí solo que no generó ítems en meses previos a junio 2026 ni posteriores a junio 2026 (un único ítem).
4. **Inicio futuro lejano (DEBT-F, enero 2028):** confirmar que se crean los 6 presupuestos de 2028 correspondientes (ene–jun 2028) y que la card muestra "0 / 6 cuotas" (ninguna vencida todavía) y el mes de inicio correcto.
**Resultado esperado:** Los cuatro casos calculan el calendario correctamente sin errores de rango, sin cuotas faltantes/sobrantes y sin romper la UI (barra de progreso, contador, mes de inicio/próxima cuota).
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-026-016 — Deudas legacy conservan su progreso tras la migración (best-effort, ejecutar en el despliegue)
> Este caso solo puede ejecutarse de forma fiel **en el momento del despliegue**
> de spec-026 sobre datos reales preexistentes (no se puede simular en esta
> ronda sin datos legacy reales) — mismo criterio que los casos diferidos de
> `test-025` (`TC-MCP-025-001`). Dejar `⬜ Pendiente` hasta ese momento.
**Precondición:** Existe al menos una deuda real creada **antes** de aplicar
la migración de spec-026, con `paidInstallments > 0` y `status: activa`.
**Datos de prueba usados:** `{{id-legacy}}` (deuda real, no de prueba).
**Pasos:**
1. Antes de aplicar la migración, anotar `paidInstallments` y `remainingValue`
   de la deuda legacy elegida.
2. Aplicar la migración de spec-026.
3. Consultar la misma deuda vía `GET /finances/debts/{{id-legacy}}`.
4. Verificar que **no** se crearon ítems de presupuesto para ella
   automáticamente (ni pasados ni futuros) — la migración no materializa
   calendario, solo backfillea `startMonth`/`startYear`/`paidOffAt`.
5. Ejecutar "Sincronizar presupuestos" sobre esa deuda desde la UI.
6. Verificar que a partir de ahí sí aparecen los ítems de sus cuotas
   **futuras** en los presupuestos correspondientes.
**Resultado esperado:** El `paidInstallments`/`remainingValue` derivado
inmediatamente después de la migración coincide con el valor que tenía antes
(el progreso se preserva vía el backfill de `startMonth`/`startYear`, no se
pierde). No aparecen ítems de presupuesto hasta que se ejecuta
"Sincronizar presupuestos" manualmente, momento en el que se materializan
solo las cuotas futuras.
**Estado:** ⬜ Pendiente (diferido a la ventana de despliegue)
**Hallazgos:**

---

## Casos de prueba (MCP)

### TC-MCP-026-001 — `create_debt` con `startMonth`/`startYear` genera el mismo calendario que el endpoint REST
**Herramienta probada:** `create_debt` en `todo-api`
**Precondición:** Ninguna deuda de prueba MCP existe todavía.
**Input de prueba:**
```json
{
  "description": "[TEST spec-026] MCP - create_debt con calendario",
  "productValue": 300000,
  "installmentValue": 100000,
  "totalInstallments": 3,
  "startMonth": 8,
  "startYear": 2026
}
```
**Output esperado:** La tool crea la deuda y, igual que `POST /finances/debts`,
genera 3 `BudgetItem` (agosto, septiembre, octubre 2026) con el mismo formato
de descripción y `plannedAmount`. Verificar cruzando con
`GET /finances/budgets?year=2026&month=8` (y meses siguientes) por API REST.
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-MCP-026-002 — `create_debt` sin `startMonth`/`startYear`
**Herramienta probada:** `create_debt` en `todo-api`
**Precondición:** Ninguna.
**Input de prueba:**
```json
{
  "description": "[TEST spec-026] MCP - create_debt sin calendario",
  "productValue": 200000,
  "installmentValue": 100000,
  "totalInstallments": 2
}
```
**Output esperado:** **Asunción a confirmar contra `spec-026` antes de
ejecutar:** dado que el modelo nuevo de `Debt` requiere `startMonth`/`startYear`
para poder construir el calendario (no es un campo opcional a nivel de
dominio, como sí lo es `initialPayment`), se espera que la tool devuelva un
error de validación claro indicando que ambos campos son requeridos — igual
que ocurriría con `POST /finances/debts` sin esos campos. Si el spec
definitivo los define como opcionales con un valor por defecto (ej. "mes
siguiente al actual", como el default de `DebtForm` en la UI), ajustar este
caso para verificar ese default en su lugar antes de ejecutarlo.
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-MCP-026-003 — `pay_debt_full` sobre una deuda activa con saldo
**Herramienta probada:** `pay_debt_full` en `todo-api`
**Precondición:** Existe una deuda activa con saldo pendiente (reutilizar la
creada en `TC-MCP-026-001`, con `2/3` cuotas vencidas y `remainingValue: 200000`).
**Input de prueba:**
```json
{ "debtId": "{{id-debt-mcp}}" }
```
**Output esperado:** Respuesta equivalente a `POST /finances/debts/:id/pay-off`:
`{ debt, expenseId, itemsRemoved }`, con `debt.status: "pagada"` y
`remainingValue: 0`. Verificar por API REST que se creó el `Expense` de tipo
`pago_deuda` y que solo se eliminaron los ítems de meses futuros.
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-MCP-026-004 — `pay_debt_full` sobre una deuda ya pagada devuelve error
**Herramienta probada:** `pay_debt_full` en `todo-api`
**Precondición:** La deuda de `TC-MCP-026-003` ya está `pagada`.
**Input de prueba:**
```json
{ "debtId": "{{id-debt-mcp}}" }
```
**Output esperado:** La tool devuelve un mensaje de error (formato `err()` del
servidor MCP: `"Error: ..."`) equivalente al `400` del endpoint REST, sin
crear un segundo gasto ni modificar `paidOffAt`.
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-MCP-026-005 — `pay_debt_installment` ya no existe entre las tools disponibles
**Herramienta probada:** listado de tools de `todo-api` (`tools/list`)
**Precondición:** Ninguna.
**Pasos:**
1. Desde un cliente MCP (o inspeccionando la respuesta de `tools/list` sobre
   `/mcp`), listar todas las tools expuestas por `todo-api`.
2. Buscar `pay_debt_installment` en el listado.
**Resultado esperado:** `pay_debt_installment` no aparece en el listado.
`pay_debt_full` sí aparece, con su descripción y schema de entrada
(`debtId` únicamente).
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-MCP-026-006 — `list_debts` devuelve el shape actualizado
**Herramienta probada:** `list_debts` en `todo-api`
**Precondición:** Existe al menos una deuda de prueba con calendario (la de
`TC-MCP-026-001`, ya pagada tras `TC-MCP-026-003`) y, si es posible, una
activa con cuotas futuras (reutilizar DEBT-A si sigue existiendo en este
punto de la ronda).
**Input de prueba:**
```json
{}
```
**Output esperado:** Cada deuda del listado incluye `startMonth`, `startYear`,
`paidOffAt` (nulo si sigue activa), `remainingValue` (derivado) y **no**
expone `paidInstallments` como columna persistida arbitraria sin relación con
el calendario — su valor debe coincidir con el derivado según
`startMonth`/`startYear`/`totalInstallments` y la fecha de ejecución de la
prueba. El shape es consistente con el de `GET /finances/debts`.
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

## Resumen de la ronda
> Completar al ejecutar.

- Aprobados: — Fallidos: — Pendientes: 22 (`TC-026-001` a `TC-026-016`,
  `TC-MCP-026-001` a `TC-MCP-026-006`), todos `⬜ Pendiente` en modo test-first.
- Hallazgos escalados a `spec/backlog.md`: ninguno todavía.
- Limpieza de datos de prueba: ⬜ Pendiente (no aplica hasta la ejecución).
