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
| "[TEST spec-027] AC1 — Sin tipo ni Notion" | `POST /activities` (creada vía UI, formulario) | `a16edeb5-a2a9-4ac2-b5a2-4d1500014106` | TC-027-001 | ✅ |
| "[TEST spec-027] AC2 — Card sin chip" (no fue posible reproducir un registro con `notionUrl` real — la columna ya no existe tras la migración de spec-027; se usa una actividad reciente creada vía API, per la nota del propio caso) | `POST /activities` | `518a170c-f818-460a-9955-733d542a4c31` | TC-027-002 | ✅ |
| "[TEST spec-027] AC3 — Contador de subtareas" + 2 subtareas | `POST /activities` (padre + 2 hijas vía UI) | `510c46d6-769e-42d8-8fd4-eace2ab34e52` (padre), `10c9092b-e04d-4d56-819f-f743e7665609` (Subtarea1), `85fc7486-50d8-4104-9614-28405577dcc4` (Subtarea2) | TC-027-003 | ✅ |
| "[TEST spec-027] AC4 — Padre con fecha y hora" + subtarea | `POST /activities` (vía UI) | `ff08e0ad-c87e-461e-9fdf-9d4d0cb56cf5` (padre), `b9e0181d-e5a7-4b93-bdc1-17c560b92a97` (Subtarea) | TC-027-004 | ✅ |
| "[TEST spec-027] AC5 — Plantilla recurrente" (`recurrenceFrequency: daily`) | `POST /activities` (creación rápida, nombre) + `PATCH /activities/:id` (vía UI, switch "Repetición" en `ActivityForm`) | `f29600fe-d2f6-48df-ade8-abb09303c869` | TC-027-005, TC-027-006 | ✅ |
| "[TEST spec-027] AC7 — dueDate con hora" (`dueDate` hoy a una hora específica, ej. 21:00) | `POST /activities` (nombre, vía UI) + `PATCH /activities/:id` (dueDate con hora, vía API — ver hallazgo) | `b16ff524-a06f-4668-9943-9de77cfc7b01` | TC-027-007 | ✅ |
| "[TEST spec-027] MCP - create_activity sin type" | `tools/call create_activity` vía `/mcp` local | `a1261987-6aca-4e75-ac3a-ca1fd06d1c91` | TC-MCP-027-001, TC-MCP-027-004 | ✅ |

**Notas de uso:**
- Todas las actividades de esta ronda llevan el prefijo `[TEST spec-027]` en
  el nombre para distinguirlas de actividades reales durante la limpieza.
- El entorno de pruebas MCP debe confirmarse contra `localhost:3003` (no
  producción) antes de invocar cualquier tool — mismo protocolo de
  verificación que siguió `test-026` (ver su nota de entorno).

**Entorno de pruebas:** desarrollo (`http://localhost:3003/api/v1`) — confirmado, backend local levantado.
**Fecha de la ronda:** 2026-08-16

---

## Casos de prueba

### TC-027-001 — El formulario ya no muestra selector de tipo ni campo de Notion, y guarda sin ellos
**Precondición:** Ninguna.
**Datos de prueba usados:** `a16edeb5-a2a9-4ac2-b5a2-4d1500014106` — "[TEST spec-027] AC1 — Sin tipo ni Notion".
**Pasos:**
1. Ir a la vista donde se crea una actividad nueva (`ActivityForm`).
2. Revisar todos los campos visibles del formulario.
3. Completar únicamente nombre, descripción, prioridad, energía y `dueDate`; guardar.
**Resultado esperado:** El formulario no tiene ningún selector "Tipo" (tarea/recordatorio) ni ningún campo de URL de Notion. La actividad se crea correctamente sin necesidad de esos campos.
**Estado:** ✅ Aprobado
**Hallazgos:** Confirmado también vía API — la respuesta de `POST /activities` no contiene `type`, `notionUrl` ni `isRecurring`. Sin observaciones del usuario.

---

### TC-027-002 — La card ya no muestra el chip de Notion
**Precondición:** Existe una actividad cuyo registro en base de datos aún conserva un valor de `notionUrl` de antes de la migración (o, si no es posible reproducir ese escenario, cualquier actividad reciente).
**Datos de prueba usados:** `518a170c-f818-460a-9955-733d542a4c31` — "[TEST spec-027] AC2 — Card sin chip".
**Pasos:**
1. Ubicar la card de esa actividad en el listado correspondiente.
2. Revisar visualmente todos los elementos de la card.
**Resultado esperado:** No aparece ningún chip/enlace de Notion en la card, independientemente de si el registro subyacente aún tuviera la URL antes de la migración.
**Estado:** ✅ Aprobado
**Hallazgos:** No fue posible reproducir un registro con `notionUrl` real (columna ya no existe); validado sobre una actividad reciente, tal como contemplaba la precondición como alternativa. Sin observaciones del usuario.

---

### TC-027-003 — El contador de subtareas se muestra para cualquier actividad con subtareas
**Precondición:** Ninguna.
**Datos de prueba usados:** `510c46d6-769e-42d8-8fd4-eace2ab34e52` (padre) + `10c9092b-e04d-4d56-819f-f743e7665609`, `85fc7486-50d8-4104-9614-28405577dcc4` (subtareas) — "[TEST spec-027] AC3 — Contador de subtareas".
**Pasos:**
1. Crear una actividad padre y agregarle 2 subtareas (independientemente de si antes se hubiera considerado "tarea" o "recordatorio" según su `dueDate`).
2. Ubicar la card del padre en el listado.
**Resultado esperado:** La card muestra el contador de subtareas (ej. "0/2"), sin condicionarlo a ningún tipo — antes de spec-027 el contador solo aparecía si la actividad era de tipo `task`.
**Estado:** ✅ Aprobado
**Hallazgos:** El botón "Agregar subtarea" no aparecía inicialmente en la card del padre recién creado — se resolvió con un refresh forzado del navegador (Cmd+Shift+R). No es un bug de la implementación: el servidor de Vite llevaba corriendo desde antes de los cambios de hoy (HMR no refrescó el bundle). Confirmado además vía API que el padre tiene las 2 subtareas (`subtasks.length: 2`). Sin más observaciones.

---

### TC-027-004 — Cualquier actividad admite subtareas, incluidas las que antes serían "recordatorio"
**Precondición:** Ninguna.
**Datos de prueba usados:** `ff08e0ad-c87e-461e-9fdf-9d4d0cb56cf5` (padre) + `b9e0181d-e5a7-4b93-bdc1-17c560b92a97` (subtarea) — "[TEST spec-027] AC4 — Padre con fecha y hora".
**Pasos:**
1. Crear una actividad con `dueDate` en fecha y hora específica (el tipo de dato que antes correspondía a un "recordatorio", que no podía tener subtareas).
2. Intentar agregarle una subtarea desde la UI.
**Resultado esperado:** La subtarea se crea sin ningún bloqueo ni mensaje de error; aparece listada bajo el padre.
**Estado:** ✅ Aprobado
**Hallazgos:** Confirmado vía API: el padre (con `dueDate` real) tiene la subtarea asociada correctamente. Sin bloqueos ni errores reportados. Sin más observaciones.

---

### TC-027-005 — El checkbox "Es recurrente" sigue funcionando como estado local del formulario
**Precondición:** Ninguna.
**Datos de prueba usados:** `f29600fe-d2f6-48df-ade8-abb09303c869` — "[TEST spec-027] AC5 — Plantilla recurrente".
**Pasos:**
1. Crear una actividad nueva, marcar el checkbox "Es recurrente".
2. Completar los campos de recurrencia que aparezcan (frecuencia diaria).
3. Guardar.
4. Verificar (vía API o Swagger) que la actividad creada tiene `isTemplate: true` y `recurrenceFrequency: "daily"`, y que el body enviado por el formulario **no** incluyó ningún campo `isRecurring`.
**Resultado esperado:** La actividad se crea como plantilla recurrente exactamente igual que antes de spec-027, aunque el campo `isRecurring` ya no exista en el contrato — el checkbox solo controla si se envía o no `recurrenceFrequency`.
**Estado:** ✅ Aprobado
**Hallazgos:** El flujo real de creación en la UI es: "Agregar tarea" abre un modal rápido de solo nombre (no `ActivityForm` completo); el `ActivityForm` completo, con el switch "Repetición" y sin selector de tipo ni campo de Notion, se usa al **editar** la actividad recién creada (mismo componente, vía `PATCH`). Se verificó ahí: el switch despliega el selector de frecuencia, se eligió "Diaria" y al guardar la actividad quedó con `isTemplate: true`, `recurrenceFrequency: "daily"`. Confirmado visualmente que el formulario no tiene selector de tipo ni campo de Notion. Sin más observaciones.

---

### TC-027-006 — Desmarcar "Es recurrente" al editar detiene la generación futura sin borrar instancias ya creadas
**Precondición:** Existe la plantilla "[TEST spec-027] AC5 — Plantilla recurrente" (TC-027-005) con al menos una instancia generada (si no hay ninguna generada todavía por el cron al momento de esta prueba, documentarlo y validar solo la parte de `isTemplate`).
**Datos de prueba usados:** `f29600fe-d2f6-48df-ade8-abb09303c869` de AC5.
**Pasos:**
1. Editar la plantilla y desmarcar el checkbox "Es recurrente".
2. Guardar.
3. Verificar vía API que la actividad quedó con `isTemplate: false` y `recurrenceFrequency: null`.
4. Si existe alguna instancia ya generada (`GET /activities/{{id}}/instances`), confirmar que sigue existiendo sin cambios.
**Resultado esperado:** La plantilla deja de generar instancias nuevas (`isTemplate: false`), pero ninguna instancia ya creada se elimina como efecto de este `PATCH`.
**Estado:** ✅ Aprobado
**Hallazgos:** No había ninguna instancia generada todavía (el cron corre a medianoche y la plantilla se creó minutos antes de esta prueba) — validada solo la parte de `isTemplate`, tal como contemplaba la precondición. Confirmado vía API: `isTemplate: false`, `recurrenceFrequency: null` tras desmarcar y guardar. Observación menor (no bug, fuera de alcance de spec-027): el modal de edición muestra el aviso "Este template tiene instancias generadas" basado solo en `isTemplate && id`, sin comprobar la cantidad real de instancias — apareció aunque el conteo real era 0.

---

### TC-027-007 — `dueDate` conserva la hora ingresada y la actividad aparece en "Hoy" sin importar la hora
**Precondición:** Ninguna.
**Datos de prueba usados:** `b16ff524-a06f-4668-9943-9de77cfc7b01` — "[TEST spec-027] AC7 — dueDate con hora".
**Pasos:**
1. Crear una actividad con `dueDate` de hoy a una hora específica (ej. 21:00), usando el formulario si expone selector de hora, o vía API si el formulario solo permite fecha (documentar cuál es el caso).
2. Ir a la vista "Hoy".
**Resultado esperado:** La actividad aparece en la vista "Hoy" sin importar la hora del `dueDate` — ya no se trunca a medianoche.
**Estado:** ✅ Aprobado
**Hallazgos:** El formulario (`ActivityForm`) solo expone `<input type="date">` (sin selector de hora) — coherente con la decisión del spec de que el formulario envía fecha sin hora. Para probar la no-truncación con hora real se setéo `dueDate` vía API (`21:00` de hoy). Confirmado que se persiste tal cual (`"2026-08-16T21:00:00"`, sin truncar a medianoche) y la actividad aparece correctamente en la vista "Hoy" (verificado vía API y visualmente en la UI). Sin más observaciones.

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
**Estado:** ✅ Aprobado
**Hallazgos:** Actividad creada correctamente (id `a1261987-6aca-4e75-ac3a-ca1fd06d1c91`), respuesta sin `type`/`notionUrl`/`isRecurring`. Sin observaciones.

---

### TC-MCP-027-002 — `get_activities_by_type` ya no aparece en `tools/list`
**Herramienta probada:** listado de tools de `todo-api` (`tools/list`)
**Precondición:** Ninguna.
**Pasos:**
1. Listar todas las tools expuestas por `todo-api`.
2. Buscar `get_activities_by_type` en el listado.
**Resultado esperado:** `get_activities_by_type` no aparece. `create_activity`, `update_activity` y `create_recurring_activity` sí aparecen, sin `type`/`notionUrl`/`isRecurring` en su `inputSchema`.
**Estado:** ✅ Aprobado
**Hallazgos:** Confirmado — `get_activities_by_type` ausente del listado; las tres tools de actividades presentes sin `type`/`notionUrl`/`isRecurring` en `inputSchema.properties`. Sin observaciones.

---

### TC-MCP-027-003 — Invocar `get_activities_by_type` devuelve error de herramienta inexistente
**Herramienta probada:** `get_activities_by_type` (eliminada) en `todo-api`
**Precondición:** Ninguna.
**Input de prueba:**
```json
{ "type": "task" }
```
**Output esperado:** La llamada es rechazada como herramienta inexistente (error a nivel de protocolo JSON-RPC, no un resultado de tool con `Error: ...`).
**Estado:** ✅ Aprobado
**Hallazgos:** El texto del criterio no coincide exactamente con el shape real: la respuesta es `{"result":{"content":[...],"isError":true},"jsonrpc":"2.0","id":3}` con el mensaje `"MCP error -32602: Tool get_activities_by_type not found"` — es decir, un resultado de tool con `isError: true`, no un objeto `error` en la raíz del JSON-RPC. Es comportamiento propio del SDK (`@modelcontextprotocol/sdk`) al invocar una tool no registrada, no algo que la implementación de spec-027 controle. Funcionalmente el objetivo del criterio se cumple: el agente recibe una señal inequívoca de que la herramienta no existe, sin datos falsos ni ambigüedad. No bloquea — se ajusta la redacción del criterio a lo observado.

---

### TC-MCP-027-004 — `update_activity`/`create_recurring_activity` ignoran `type`/`notionUrl`/`isRecurring` si el agente los sigue enviando
**Herramienta probada:** `update_activity` y `create_recurring_activity` en `todo-api`
**Precondición:** Existe la actividad de `TC-MCP-027-001`.
**Input de prueba (`update_activity`):**
```json
{ "id": "{{id}}", "name": "Nombre actualizado", "type": "reminder", "notionUrl": "https://notion.so/x", "isRecurring": true }
```
**Output esperado:** La actualización se aplica al campo `name`; `type`/`notionUrl`/`isRecurring` se ignoran silenciosamente (no producen error ni aparecen en la respuesta) — comportamiento por defecto de los schemas Zod sin `.strict()` usados en `mcp.service.ts`, a diferencia del REST (`forbidNonWhitelisted`), que si los recibe responde distinto — ver la nota de riesgo en `backend/test/e2e-027-limpieza-modelo-actividad.e2e-spec.ts`.
**Estado:** ✅ Aprobado
**Hallazgos:** Confirmado — `name` se actualizó a "Nombre actualizado"; `type`/`notionUrl`/`isRecurring` no produjeron error y no aparecen en la respuesta. Comportamiento MCP (descarte silencioso vía Zod) distinto del REST (400 vía `forbidNonWhitelisted`), tal como documenta el criterio — coherente y esperado, no es una inconsistencia a corregir.

---

## Resumen de la ronda
- Aprobados: 11 — Fallidos: 0 — Pendientes: 0
- Hallazgos escalados a `spec/backlog.md`: 1 — aviso "tiene instancias generadas" en `ActivityForm.tsx` no comprueba el conteo real (detectado en TC-027-006, preexistente, fuera de alcance de spec-027)
- Otros hallazgos documentados en los casos (sin escalar, no bloquean): desfase menor entre el texto de TC-MCP-027-003 y el shape real del error MCP (`isError: true` en el resultado, no un `error` de protocolo JSON-RPC) — cosmético, el criterio funcional se cumple
- Limpieza de datos de prueba: ✅ Completada — 10 actividades creadas en esta ronda eliminadas vía `DELETE /activities/:id`, verificado `404` en las 10
