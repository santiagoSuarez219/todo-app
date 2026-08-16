# test-027 — Limpieza del modelo de Activity: eliminar `notionUrl`, `isRecurring` y `type`

> Redactado en modo test-first, junto con `spec/spec-027-limpieza-modelo-actividad.md`,
> **antes** de que exista una sola línea de implementación. Todos los casos
> quedan en `⬜ Pendiente` hasta que las Fases de implementación correspondientes
> estén completas y el usuario los ejecute.
>
> **Paquete "Actividades — modelo de capas"** (specs 027→032). Este archivo
> cubre solo spec-027 (limpieza del modelo). Las fases de UI de los specs
> siguientes (028 a 032) tendrán sus propios `test-NNN`.

## Datos de prueba

> A diferencia de otros `test-NNN`, la mayoría de los casos de este archivo
> **no requieren precondiciones creadas de antemano vía API**: la propia
> acción del caso (crear/editar una actividad desde el formulario) es el paso
> que genera el dato de prueba. La tabla se completa **al ejecutar** la ronda,
> con los identificadores reales devueltos, siguiendo "Pruebas manuales
> asistidas por Claude" del `CLAUDE.md` raíz.

| Recurso | Endpoint de creación | Identificador | Usado en | Eliminado |
|---|---|---|---|---|
| "[TEST spec-027] AC1 — Sin tipo ni Notion" | `POST /activities` (creada vía UI, formulario) | `{{id}}` | TC-027-001 | ⬜ |
| "[TEST spec-027] AC2 — Card sin chip" (creada previamente con `notionUrl` real, vía API directa antes de esta ronda, para verificar que el chip ya no se renderiza aunque el dato aún existiera en un registro viejo) | `POST /activities` | `{{id}}` | TC-027-002 | ⬜ |
| "[TEST spec-027] AC3 — Contador de subtareas" + 2 subtareas | `POST /activities` (padre + 2 hijas vía UI) | `{{id-padre}}`, `{{id-hija-1}}`, `{{id-hija-2}}` | TC-027-003 | ⬜ |
| "[TEST spec-027] AC4 — Padre con fecha y hora" + subtarea | `POST /activities` (vía UI) | `{{id-padre}}`, `{{id-hija}}` | TC-027-004 | ⬜ |
| "[TEST spec-027] AC5 — Plantilla recurrente" (`recurrenceFrequency: daily`) | `POST /activities` (vía UI, checkbox "Es recurrente") | `{{id}}` | TC-027-005, TC-027-006 | ⬜ |
| "[TEST spec-027] AC7 — dueDate con hora" (`dueDate` hoy a una hora específica, ej. 21:00) | `POST /activities` (vía UI) | `{{id}}` | TC-027-007 | ⬜ |
| "[TEST spec-027] MCP - create_activity sin type" | `tools/call create_activity` vía `/mcp` local | `{{id}}` | TC-MCP-027-001 | ⬜ |

**Notas de uso:**
- Todas las actividades de esta ronda llevan el prefijo `[TEST spec-027]` en
  el nombre para distinguirlas de actividades reales durante la limpieza.
- El entorno de pruebas MCP debe confirmarse contra `localhost:3003` (no
  producción) antes de invocar cualquier tool — mismo protocolo de
  verificación que siguió `test-026` (ver su nota de entorno).

**Entorno de pruebas:** desarrollo (`http://localhost:3003/api/v1`) — confirmar antes de empezar.
**Fecha de la ronda:** {{fecha}}

---

## Casos de prueba

### TC-027-001 — El formulario ya no muestra selector de tipo ni campo de Notion, y guarda sin ellos
**Precondición:** Ninguna.
**Datos de prueba usados:** ninguno previo — esta es la actividad "[TEST spec-027] AC1 — Sin tipo ni Notion".
**Pasos:**
1. Ir a la vista donde se crea una actividad nueva (`ActivityForm`).
2. Revisar todos los campos visibles del formulario.
3. Completar únicamente nombre, descripción, prioridad, energía y `dueDate`; guardar.
**Resultado esperado:** El formulario no tiene ningún selector "Tipo" (tarea/recordatorio) ni ningún campo de URL de Notion. La actividad se crea correctamente sin necesidad de esos campos.
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-027-002 — La card ya no muestra el chip de Notion
**Precondición:** Existe una actividad cuyo registro en base de datos aún conserva un valor de `notionUrl` de antes de la migración (o, si no es posible reproducir ese escenario, cualquier actividad reciente).
**Datos de prueba usados:** `{{id}}` de "[TEST spec-027] AC2 — Card sin chip".
**Pasos:**
1. Ubicar la card de esa actividad en el listado correspondiente.
2. Revisar visualmente todos los elementos de la card.
**Resultado esperado:** No aparece ningún chip/enlace de Notion en la card, independientemente de si el registro subyacente aún tuviera la URL antes de la migración.
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-027-003 — El contador de subtareas se muestra para cualquier actividad con subtareas
**Precondición:** Ninguna.
**Datos de prueba usados:** "[TEST spec-027] AC3 — Contador de subtareas" + 2 subtareas.
**Pasos:**
1. Crear una actividad padre y agregarle 2 subtareas (independientemente de si antes se hubiera considerado "tarea" o "recordatorio" según su `dueDate`).
2. Ubicar la card del padre en el listado.
**Resultado esperado:** La card muestra el contador de subtareas (ej. "0/2"), sin condicionarlo a ningún tipo — antes de spec-027 el contador solo aparecía si la actividad era de tipo `task`.
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-027-004 — Cualquier actividad admite subtareas, incluidas las que antes serían "recordatorio"
**Precondición:** Ninguna.
**Datos de prueba usados:** "[TEST spec-027] AC4 — Padre con fecha y hora" + 1 subtarea.
**Pasos:**
1. Crear una actividad con `dueDate` en fecha y hora específica (el tipo de dato que antes correspondía a un "recordatorio", que no podía tener subtareas).
2. Intentar agregarle una subtarea desde la UI.
**Resultado esperado:** La subtarea se crea sin ningún bloqueo ni mensaje de error; aparece listada bajo el padre.
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-027-005 — El checkbox "Es recurrente" sigue funcionando como estado local del formulario
**Precondición:** Ninguna.
**Datos de prueba usados:** "[TEST spec-027] AC5 — Plantilla recurrente".
**Pasos:**
1. Crear una actividad nueva, marcar el checkbox "Es recurrente".
2. Completar los campos de recurrencia que aparezcan (frecuencia diaria).
3. Guardar.
4. Verificar (vía API o Swagger) que la actividad creada tiene `isTemplate: true` y `recurrenceFrequency: "daily"`, y que el body enviado por el formulario **no** incluyó ningún campo `isRecurring`.
**Resultado esperado:** La actividad se crea como plantilla recurrente exactamente igual que antes de spec-027, aunque el campo `isRecurring` ya no exista en el contrato — el checkbox solo controla si se envía o no `recurrenceFrequency`.
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-027-006 — Desmarcar "Es recurrente" al editar detiene la generación futura sin borrar instancias ya creadas
**Precondición:** Existe la plantilla "[TEST spec-027] AC5 — Plantilla recurrente" (TC-027-005) con al menos una instancia generada (si no hay ninguna generada todavía por el cron al momento de esta prueba, documentarlo y validar solo la parte de `isTemplate`).
**Datos de prueba usados:** `{{id}}` de AC5.
**Pasos:**
1. Editar la plantilla y desmarcar el checkbox "Es recurrente".
2. Guardar.
3. Verificar vía API que la actividad quedó con `isTemplate: false` y `recurrenceFrequency: null`.
4. Si existe alguna instancia ya generada (`GET /activities/{{id}}/instances`), confirmar que sigue existiendo sin cambios.
**Resultado esperado:** La plantilla deja de generar instancias nuevas (`isTemplate: false`), pero ninguna instancia ya creada se elimina como efecto de este `PATCH`.
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-027-007 — `dueDate` conserva la hora ingresada y la actividad aparece en "Hoy" sin importar la hora
**Precondición:** Ninguna.
**Datos de prueba usados:** "[TEST spec-027] AC7 — dueDate con hora".
**Pasos:**
1. Crear una actividad con `dueDate` de hoy a una hora específica (ej. 21:00), usando el formulario si expone selector de hora, o vía API si el formulario solo permite fecha (documentar cuál es el caso).
2. Ir a la vista "Hoy".
**Resultado esperado:** La actividad aparece en la vista "Hoy" sin importar la hora del `dueDate` — ya no se trunca a medianoche.
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

## Casos de prueba (MCP)

### TC-MCP-027-001 — `create_activity` funciona sin el parámetro `type`
**Herramienta probada:** `create_activity` en `todo-api`
**Precondición:** Ninguna.
**Input de prueba:**
```json
{ "name": "[TEST spec-027] MCP - create_activity sin type" }
```
**Output esperado:** La tool crea la actividad correctamente; el resultado no incluye `type`, `notionUrl` ni `isRecurring`.
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-MCP-027-002 — `get_activities_by_type` ya no aparece en `tools/list`
**Herramienta probada:** listado de tools de `todo-api` (`tools/list`)
**Precondición:** Ninguna.
**Pasos:**
1. Listar todas las tools expuestas por `todo-api`.
2. Buscar `get_activities_by_type` en el listado.
**Resultado esperado:** `get_activities_by_type` no aparece. `create_activity`, `update_activity` y `create_recurring_activity` sí aparecen, sin `type`/`notionUrl`/`isRecurring` en su `inputSchema`.
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-MCP-027-003 — Invocar `get_activities_by_type` devuelve error de herramienta inexistente
**Herramienta probada:** `get_activities_by_type` (eliminada) en `todo-api`
**Precondición:** Ninguna.
**Input de prueba:**
```json
{ "type": "task" }
```
**Output esperado:** La llamada es rechazada como herramienta inexistente (error a nivel de protocolo JSON-RPC, no un resultado de tool con `Error: ...`).
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-MCP-027-004 — `update_activity`/`create_recurring_activity` ignoran `type`/`notionUrl`/`isRecurring` si el agente los sigue enviando
**Herramienta probada:** `update_activity` y `create_recurring_activity` en `todo-api`
**Precondición:** Existe la actividad de `TC-MCP-027-001`.
**Input de prueba (`update_activity`):**
```json
{ "id": "{{id}}", "name": "Nombre actualizado", "type": "reminder", "notionUrl": "https://notion.so/x", "isRecurring": true }
```
**Output esperado:** La actualización se aplica al campo `name`; `type`/`notionUrl`/`isRecurring` se ignoran silenciosamente (no producen error ni aparecen en la respuesta) — comportamiento por defecto de los schemas Zod sin `.strict()` usados en `mcp.service.ts`, a diferencia del REST (`forbidNonWhitelisted`), que si los recibe responde distinto — ver la nota de riesgo en `backend/test/e2e-027-limpieza-modelo-actividad.e2e-spec.ts`.
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

## Resumen de la ronda
- Aprobados: {{n}} — Fallidos: {{n}} — Pendientes: {{n}}
- Hallazgos escalados a `spec/backlog.md`: {{lista o "ninguno"}}
- Limpieza de datos de prueba: ⬜ Pendiente / ✅ Completada
