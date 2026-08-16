# test-032 — Estado `waiting`: bloqueado por otra persona (`waitingFor`, `waitingSince`)

> Redactado en modo test-first, junto con `spec/spec-032-estado-waiting.md`,
> antes de que exista la implementación. Los casos quedan `⬜ Pendiente` hasta
> que se ejecuten sobre una implementación completa (Fases 1-5 del spec) y
> con todos los casos manuales de las pruebas automáticas
> (`backend/test/e2e-032-estado-waiting.e2e-spec.ts` y
> `activities.service.spec.ts`) en verde primero — así el usuario ejecuta
> estos casos contra una base ya probada a nivel de servicio.

## Datos de prueba
> Recursos a crear vía API al iniciar la ronda de ejecución. Completar la
> columna Identificador y Eliminado durante la ejecución real; se listan
> aquí como guía de lo que hay que montar para cada caso.

| Recurso | Endpoint de creación | Identificador | Usado en | Eliminado |
|---|---|---|---|---|
| Actividad "Esperar factura contador" (`pending`, sin `dueDate`) | `POST /activities` | `{{id}}` | TC-032-001, TC-032-005 | ⬜ |
| Actividad "Esperar respuesta proveedor" (`pending`, sin `dueDate`) | `POST /activities` | `{{id}}` | TC-032-002 | ⬜ |
| Actividad "Esperar sin decir a quién" (`pending`, sin `dueDate`) | `POST /activities` | `{{id}}` | TC-032-003 | ⬜ |
| Actividad "En pausa por decisión propia" (`on_hold`) | `POST /activities` | `{{id}}` | TC-032-004, TC-032-009 | ⬜ |
| Actividad "Waiting con dueDate hoy" (`waiting`, `dueDate` = hoy) | `POST /activities` | `{{id}}` | TC-032-008a | ⬜ |
| Actividad "Waiting vencida" (`waiting`, `dueDate` = hace 5 días) | `POST /activities` | `{{id}}` | TC-032-008b | ⬜ |
| Actividad "Comparar badges" (`waiting`, `waitingFor` = "El banco") | `POST /activities` | `{{id}}` | TC-032-006, TC-032-007 | ⬜ |
| Actividad "Edición rápida desde card" (`pending`) | `POST /activities` | `{{id}}` | TC-032-010 | ⬜ |
| Actividad "[TEST spec-032] MCP - waiting" (creada por el agente vía `update_activity`/`create_activity`) | MCP `create_activity` / `update_activity` | `{{id}}` | TC-MCP-032-001, TC-MCP-032-002 | ⬜ |

**Entorno de pruebas:** desarrollo (`http://localhost:3003/api/v1` — confirmar
el puerto real configurado en `.env` antes de empezar, ver nota histórica en
`test-024`)
**Fecha de la ronda:** {{fecha}}

## Casos de prueba

### TC-032-001 — Entrar en `waiting` sin fijar fecha: se autocompleta a hoy
**Precondición:** Actividad "Esperar factura contador" en `pending`, visible
en cualquier vista de lista.
**Datos de prueba usados:** `{{id}}`
**Pasos:**
1. Abrir el formulario de edición de la actividad.
2. Cambiar el campo de estado a "Esperando" (`waiting`).
3. Observar que el campo "Esperando desde" se pre-completa con la fecha de
   hoy (comportamiento del formulario, spec Fase 5).
4. Guardar sin modificar esa fecha.
**Resultado esperado:** La actividad queda en estado "Esperando"; el chip en
la card muestra "hace 0 días" (o equivalente a "hoy").
**Estado:** ⬜ Pendiente
**Hallazgos:**

### TC-032-002 — Entrar en `waiting` con fecha explícita: se respeta
**Precondición:** Actividad "Esperar respuesta proveedor" en `pending`.
**Datos de prueba usados:** `{{id}}`
**Pasos:**
1. Abrir el formulario de edición.
2. Cambiar el estado a "Esperando".
3. Editar el campo "Esperando desde" a una fecha 5 días anterior a hoy.
4. Guardar.
**Resultado esperado:** El chip en la card muestra "hace 5 días", no "hace 0
días" — se respeta la fecha indicada por el usuario en vez de sobrescribirla.
**Estado:** ⬜ Pendiente
**Hallazgos:**

### TC-032-003 — `waitingFor` es opcional
**Precondición:** Actividad "Esperar sin decir a quién" en `pending`.
**Datos de prueba usados:** `{{id}}`
**Pasos:**
1. Abrir el formulario de edición.
2. Cambiar el estado a "Esperando".
3. Dejar el campo "Esperando a" vacío.
4. Guardar.
**Resultado esperado:** No aparece ningún error de validación; la actividad
queda en `waiting`. El chip en la card se muestra sin nombre de persona (solo
"Esperando · hace N días" o equivalente, según el diseño final del chip).
**Estado:** ⬜ Pendiente
**Hallazgos:**

### TC-032-004 — Salir de `waiting` limpia ambos campos
**Precondición:** Reutilizar la actividad de TC-032-001 o TC-032-002, ya en
`waiting` con `waitingFor`/`waitingSince` cargados.
**Datos de prueba usados:** `{{id}}`
**Pasos:**
1. Abrir el formulario de edición de la actividad en `waiting`.
2. Cambiar el estado a "Pendiente" (o cualquier otro distinto de `waiting`).
3. Guardar.
4. Reabrir el formulario de edición.
**Resultado esperado:** El chip "Esperando a…" desaparece de la card. Al
reabrir el formulario, los campos "Esperando a" y "Esperando desde" — ya
ocultos por no estar en `waiting` — no muestran ningún valor residual si se
vuelve a seleccionar `waiting`.
**Estado:** ⬜ Pendiente
**Hallazgos:**

### TC-032-005 — Campos condicionales solo visibles con `waiting` seleccionado
**Precondición:** Actividad "Esperar factura contador" (cualquier estado no
`waiting`).
**Datos de prueba usados:** `{{id}}`
**Pasos:**
1. Abrir el formulario de creación o edición.
2. Con el estado en `pending` (o cualquier otro), confirmar que los campos
   "Esperando a" y "Esperando desde" NO están visibles.
3. Cambiar el estado a "Esperando" en el selector, sin guardar todavía.
4. Confirmar que ambos campos aparecen inmediatamente.
5. Cambiar el estado a otro valor (ej. "En pausa") sin guardar.
6. Confirmar que ambos campos vuelven a ocultarse.
**Resultado esperado:** Los campos condicionales reaccionan en vivo al
selector de estado (patrón `useWatch`), sin necesidad de guardar.
**Estado:** ⬜ Pendiente
**Hallazgos:**

### TC-032-006 — Badge de `waiting` distinguible visualmente de `on_hold`
**Precondición:** Dos actividades visibles simultáneamente: "Comparar
badges" en `waiting` y "En pausa por decisión propia" en `on_hold`.
**Datos de prueba usados:** `{{id waiting}}`, `{{id on_hold}}`
**Pasos:**
1. Ubicar ambas cards en la misma vista (ej. lista sin filtro de estado).
2. Comparar el badge de estado de cada una.
**Resultado esperado:** Los badges usan colores/etiquetas distintos
("Esperando" vs. "En pausa") y no se confunden a simple vista.
**Estado:** ⬜ Pendiente
**Hallazgos:**

### TC-032-007 — Chip "Esperando a {persona} · hace N días" en la card
**Precondición:** Actividad "Comparar badges" en `waiting`, `waitingFor` =
"El banco", `waitingSince` = hace 3 días.
**Datos de prueba usados:** `{{id}}`
**Pasos:**
1. Ubicar la card de la actividad en cualquier vista de lista.
2. Observar el chip adicional a la card (no el badge de estado).
**Resultado esperado:** El chip muestra el texto "Esperando a El banco · hace
3 días" (o formato equivalente definido en la implementación final).
**Estado:** ⬜ Pendiente
**Hallazgos:**

### TC-032-008a — Actividad `waiting` con `dueDate` de hoy aparece en Hoy
**Precondición:** Actividad "Waiting con dueDate hoy", `status: waiting`,
`dueDate` = hoy.
**Datos de prueba usados:** `{{id}}`
**Pasos:**
1. Ir a la vista "Hoy".
**Resultado esperado:** La actividad aparece en la lista, con su badge de
"Esperando".
**Estado:** ⬜ Pendiente
**Hallazgos:**

### TC-032-008b — Actividad `waiting` con `dueDate` vencido aparece en Vencidas
**Precondición:** Actividad "Waiting vencida", `status: waiting`, `dueDate` =
hace 5 días.
**Datos de prueba usados:** `{{id}}`
**Pasos:**
1. Ir a la vista "Vencidas".
**Resultado esperado:** La actividad aparece en la lista de vencidas, pese a
estar en `waiting` (no completada ni cancelada).
**Estado:** ⬜ Pendiente
**Hallazgos:**

### TC-032-009 — `on_hold` sigue funcionando igual (sin regresión visual)
**Precondición:** Actividad "En pausa por decisión propia" en `on_hold`.
**Datos de prueba usados:** `{{id}}`
**Pasos:**
1. Ubicar la card de la actividad.
2. Confirmar que muestra el badge "En pausa" de siempre.
3. Confirmar que NO muestra ningún chip "Esperando a…".
4. Abrir el formulario de edición y confirmar que los campos "Esperando a" /
   "Esperando desde" no aparecen (no son aplicables a `on_hold`).
**Resultado esperado:** Ningún cambio visual ni funcional respecto del
comportamiento de `on_hold` previo a este spec.
**Estado:** ⬜ Pendiente
**Hallazgos:**

### TC-032-010 — Edición rápida de estado desde la card incluye `waiting`
**Precondición:** Actividad "Edición rápida desde card" en `pending`,
visible en lista.
**Datos de prueba usados:** `{{id}}`
**Pasos:**
1. Sobre la card, usar el mecanismo de edición rápida de estado (spec-012:
   clic sobre el badge/selector inline, sin abrir el formulario completo).
2. Verificar que "Esperando" aparece como opción en el desplegable, junto a
   "En pausa" (mismo orden que en `ActivityForm`).
3. Seleccionar "Esperando".
**Resultado esperado:** El estado de la actividad cambia a `waiting`
inmediatamente, sin abrir el modal/formulario completo. El chip
"Esperando a…" aparece en la card apenas se aplica el cambio (aunque
`waitingFor` quede vacío, por no poder cargarse desde la edición rápida).
**Estado:** ⬜ Pendiente
**Hallazgos:**

### TC-MCP-032-001 — El agente mueve una actividad a `waiting` y la recupera por status
**Herramienta probada:** `update_activity` y `get_activities_by_status` en
`todo-api`
**Precondición:** Existe una actividad de prueba en cualquier estado
(`{{id}}`, creada previamente vía `create_activity` o REST).
**Input de prueba:**
1. `update_activity({ id: "{{id}}", status: "waiting", waitingFor: "El contador" })`
2. `get_activities_by_status({ status: "waiting" })`
**Output esperado:**
1. La actividad queda con `status: "waiting"`, `waitingFor: "El contador"` y
   `waitingSince` = fecha de hoy (autocompletada, no se envió).
2. La lista devuelta por `get_activities_by_status("waiting")` incluye la
   actividad, con `waitingFor` visible en el resultado.
**Estado:** ⬜ Pendiente
**Hallazgos:**

### TC-MCP-032-002 — El agente crea una actividad directamente en `waiting`
**Herramienta probada:** `create_activity` en `todo-api`
**Precondición:** Ninguna.
**Input de prueba:**
`create_activity({ name: "[TEST spec-032] MCP - waiting", type: "task", status: "waiting" })`
(sin `waitingFor` ni `waitingSince`)
**Output esperado:** La actividad se crea con `status: "waiting"`,
`waitingSince` = hoy (autocompletada) y `waitingFor: null`.
**Estado:** ⬜ Pendiente
**Hallazgos:**

## Notas de alcance

- Los siguientes aspectos del spec son de naturaleza puramente backend (no
  tienen una ruta de UI que los ejercite; enviarlos requiere una llamada API
  directa que el formulario nunca produce) y se validan **solo** con las
  pruebas automáticas de `backend/test/e2e-032-estado-waiting.e2e-spec.ts` y
  `backend/src/activities/activities.service.spec.ts`, no con casos
  manuales de este archivo:
  - Limpieza silenciosa de `waitingFor`/`waitingSince` cuando llegan junto a
    un `status` distinto de `waiting` (no produce 400).
  - `GET /activities/status/waiting` filtrando exactamente por ese estado.
  - Que ninguna actividad existente cambia de estado tras correr la
    migración (verificado también manualmente en Fase 3 del spec, al
    ejecutar la migración en local, fuera de esta ronda de pruebas).
  - El caso de regresión `completed → waiting` (limpieza de `completedAt` de
    spec-028 sin revertir la cascada de subtareas de spec-024).

## Resumen de la ronda
- Aprobados: {{n}} — Fallidos: {{n}} — Pendientes: 12 (10 manuales + 2 MCP)
- Hallazgos escalados a `spec/backlog.md`: {{lista o "ninguno"}}
- Limpieza de datos de prueba: ⬜ Pendiente
