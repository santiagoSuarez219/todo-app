# test-031 — De `scheduledForToday` (booleano) a `scheduledFor` (fecha)

> Redactado en modo test-first, junto con `spec-031-scheduled-for-fecha.md`.
> Estos casos no pueden aprobarse hasta que la implementación exista: el
> botón de sol, el campo "Programar para" del formulario y la partición de
> `TodayView.tsx` con `scheduledFor` no están construidos todavía.

## Datos de prueba

> Se completa al ejecutar la ronda: registrar aquí cada recurso creado vía
> API (`POST /api/v1/activities`) antes de empezar, con su identificador,
> y marcar su eliminación al cerrar la ronda.

| Recurso   | Endpoint de creación     | Identificador | Eliminado |
|-----------|---------------------------|----------------|-----------|
| Activity  | `POST /api/v1/activities` | `{{id}}`       | ⬜ / ✅    |

**Entorno de pruebas:** desarrollo (`http://localhost:3003/api/v1`)
**Fecha de la ronda:** {{fecha}}

## Casos de prueba

### TC-031-001 — Botón de sol: activa `scheduledFor = hoy` con un clic
**Precondición:** Actividad sin `dueDate` y `scheduledFor: null`, creada vía
API (`POST /activities`, sin `scheduledFor`).
**Datos de prueba usados:** `{{id}}`
**Pasos:**
1. Abrir la lista/vista donde aparezca la card de la actividad (por ejemplo
   "Todas las actividades" o el proyecto donde se creó).
2. Localizar el botón de ícono de sol en la card. Confirmar que se muestra en
   estado **inactivo** (sin resaltar) y que su tooltip dice "Programar para
   hoy".
3. Hacer clic una vez sobre el botón de sol.
**Resultado esperado:** Con un solo clic el botón queda en estado **activo**
(resaltado), el tooltip cambia a "Quitar de hoy", y la actividad pasa a tener
`scheduledFor` = fecha de hoy (verificable con `GET /activities/{{id}}`).
**Estado:** ⬜ Pendiente
**Hallazgos:**

### TC-031-002 — Botón de sol: desactiva `scheduledFor` con un clic (vuelve a `null`)
**Precondición:** Continuación de TC-031-001 — actividad con `scheduledFor`
= hoy.
**Datos de prueba usados:** `{{id}}`
**Pasos:**
1. Sobre la misma card, hacer clic nuevamente en el botón de sol (ahora
   activo).
**Resultado esperado:** El botón vuelve a estado inactivo, el tooltip vuelve
a "Programar para hoy", y `GET /activities/{{id}}` confirma `scheduledFor:
null`.
**Estado:** ⬜ Pendiente
**Hallazgos:**

### TC-031-003 — Botón de sol: indicador de fecha futura
**Precondición:** Actividad creada vía API con `scheduledFor` = mañana
(`POST /activities` con `scheduledFor: "{{mañana ISO}}"`).
**Datos de prueba usados:** `{{id}}`
**Pasos:**
1. Abrir la vista donde aparece la card de esta actividad.
2. Observar el botón de sol y el texto adicional junto a él o en la card.
**Resultado esperado:** El botón de sol refleja que la actividad está
programada (no necesariamente en el mismo estado "activo" que "programada
para hoy" — verificar el criterio visual acordado), y la card muestra el
texto "Programada para el {fecha}" con la fecha de mañana.
**Estado:** ⬜ Pendiente
**Hallazgos:**

### TC-031-004 — Formulario: campo "Programar para" crea la actividad con `scheduledFor`
**Precondición:** Ninguna — se crea la actividad desde cero por UI.
**Datos de prueba usados:** ninguno previo; la actividad creada en este caso
se registra en "Datos de prueba" tras el paso 3.
**Pasos:**
1. Abrir el formulario de nueva actividad.
2. Completar el nombre y localizar el campo "Programar para" (junto a "Fecha
   límite").
3. Seleccionar la fecha de mañana en "Programar para" y guardar.
**Resultado esperado:** La actividad se crea con `scheduledFor` = la fecha
elegida (verificable con `GET /activities/{{id}}`); no aparece en la vista
Hoy hasta que llegue esa fecha.
**Estado:** ⬜ Pendiente
**Hallazgos:**

### TC-031-005 — Formulario: limpiar "Programar para" a `null`
**Precondición:** Actividad con `scheduledFor` = mañana (creada en
TC-031-004 o vía API).
**Datos de prueba usados:** `{{id}}`
**Pasos:**
1. Abrir la actividad para editar.
2. Limpiar el campo "Programar para" (dejarlo vacío).
3. Guardar.
**Resultado esperado:** `GET /activities/{{id}}` confirma `scheduledFor:
null`. El botón de sol de la card queda en estado inactivo.
**Estado:** ⬜ Pendiente
**Hallazgos:**

### TC-031-006 — TodayView: sección "Programadas por fecha" vs. sección de `scheduledFor`
**Precondición:** Dos actividades creadas vía API:
- A: `dueDate` = hoy, sin `scheduledFor`.
- B: sin `dueDate`, `scheduledFor` = hoy.
**Datos de prueba usados:** `{{idA}}`, `{{idB}}`
**Pasos:**
1. Abrir la vista Hoy (`TodayView.tsx`).
2. Observar en qué sección aparece cada actividad.
**Resultado esperado:** La actividad A aparece en la sección de actividades
programadas por fecha límite (`dueDate` = hoy); la actividad B aparece en la
sección separada correspondiente a `scheduledFor` = hoy (el título de sección
debe seguir siendo correcto tras el cambio de nombre del campo — verificar
que ya no menciona el flag booleano).
**Estado:** ⬜ Pendiente
**Hallazgos:**

### TC-031-007 — `scheduledFor` = ayer caduca sola, sin job (no aparece en Hoy)
**Precondición:** Actividad creada vía API con `scheduledFor` = ayer, sin
`dueDate` de hoy.
**Datos de prueba usados:** `{{id}}`
**Pasos:**
1. Abrir la vista Hoy.
2. Buscar la actividad por nombre.
**Resultado esperado:** La actividad **no** aparece en la vista Hoy. Si
además tiene `dueDate` vencido, sí debe aparecer en la vista Vencidas — no
se prueba aquí, solo se confirma que Hoy no la muestra por la vía de
`scheduledFor`.
**Estado:** ⬜ Pendiente
**Hallazgos:**

### TC-031-008 — `scheduledFor` = hoy + `status: completed` no aparece en Hoy
**Precondición:** Actividad creada vía API con `scheduledFor` = hoy y
`status: completed`.
**Datos de prueba usados:** `{{id}}`
**Pasos:**
1. Abrir la vista Hoy.
2. Buscar la actividad por nombre.
**Resultado esperado:** La actividad no aparece en ninguna sección de la
vista Hoy.
**Estado:** ⬜ Pendiente
**Hallazgos:**

### TC-031-009 — `scheduledFor` = hoy + `deferUntil` futura no aparece (spec-030 manda)
**Precondición:** Actividad creada vía API con `scheduledFor` = hoy y
`deferUntil` = mañana. **Este caso depende de que spec-030 (`deferUntil`)
esté implementado**; si no lo está todavía, marcar el caso como bloqueado en
"Hallazgos" en lugar de fallido.
**Datos de prueba usados:** `{{id}}`
**Pasos:**
1. Abrir la vista Hoy.
2. Buscar la actividad por nombre.
**Resultado esperado:** La actividad no aparece en Hoy, aun teniendo
`scheduledFor` = hoy, porque `deferUntil` todavía no llegó.
**Estado:** ⬜ Pendiente
**Hallazgos:**

### TC-031-010 — Migración de datos preexistentes: flags `true` no completados quedan programados para hoy
**Precondición:** Este caso se ejecuta una única vez, el día de la
migración, sobre datos reales o de staging que ya tenían
`scheduledForToday = true` antes del despliegue. Requiere coordinación
directa con el usuario — no se recrea con datos sintéticos.
**Datos de prueba usados:** actividades preexistentes con
`scheduledForToday = true` antes de correr la migración (identificar sus
IDs antes de migrar, vía `GET /activities` filtrando manualmente o por
consulta directa autorizada).
**Pasos:**
1. Antes de migrar: anotar qué actividades tienen `scheduledForToday = true`
   y cuáles de ellas están `completed`.
2. Ejecutar la migración
   `1787000000004-ReplaceScheduledForTodayWithScheduledForActivities`.
3. Consultar cada una de esas actividades (`GET /activities/{{id}}`).
**Resultado esperado:** Las que **no** estaban `completed` quedan con
`scheduledFor` = fecha del día de la migración, y siguen apareciendo en la
vista Hoy. Las que sí estaban `completed` quedan con `scheduledFor: null`.
**Estado:** ⬜ Pendiente
**Hallazgos:**

### TC-031-011 — Enviar `scheduledForToday` (nombre viejo) ya no tiene efecto
**Precondición:** Ninguna — se crea la actividad en este mismo caso.
**Datos de prueba usados:** la actividad creada en el paso 1, registrada tras
crearla.
**Pasos:**
1. Hacer `POST /activities` directamente contra la API (herramienta como
   Postman/Insomnia, o pedir apoyo a Claude) enviando `scheduledForToday:
   true` en el body, sin `scheduledFor`.
2. Observar el código de respuesta y el cuerpo devuelto.
3. Consultar la vista Hoy.
**Resultado esperado:** La petición responde `201` (no `400`): el campo
`scheduledForToday` se descarta silenciosamente por el `whitelist` del
`ValidationPipe`. La actividad creada tiene `scheduledFor: null` y no
aparece en la vista Hoy.
**Estado:** ⬜ Pendiente
**Hallazgos:**

### TC-MCP-031-001 — `create_activity` con `scheduledFor` (fecha futura)
**Herramienta probada:** `create_activity` en `todo-api`
**Precondición:** Ninguna.
**Input de prueba:** `{ "name": "[MCP-031] prueba scheduledFor", "scheduledFor": "{{mañana ISO}}" }`
**Output esperado:** La actividad se crea con `scheduledFor` = la fecha
enviada; `get_today_activities` no la incluye hasta que llegue esa fecha.
**Estado:** ⬜ Pendiente
**Hallazgos:**

### TC-MCP-031-002 — `update_activity` con `scheduledFor: null` desprograma
**Herramienta probada:** `update_activity` en `todo-api`
**Precondición:** Actividad existente con `scheduledFor` = hoy.
**Input de prueba:** `{ "id": "{{id}}", "scheduledFor": null }`
**Output esperado:** La actividad queda con `scheduledFor: null` y
desaparece de `get_today_activities`.
**Estado:** ⬜ Pendiente
**Hallazgos:**

### TC-MCP-031-003 — `create_activity` con `scheduledForToday` (nombre viejo) falla
**Herramienta probada:** `create_activity` en `todo-api`
**Precondición:** Ninguna. Verifica que el agente no puede seguir usando el
contrato anterior tras el cambio.
**Input de prueba:** `{ "name": "[MCP-031] nombre viejo", "scheduledForToday": true }`
**Output esperado:** El schema Zod de la tool ya no acepta
`scheduledForToday` — el parámetro es rechazado (error de validación del
schema, no un `201` silencioso como en REST, porque la tool no tiene
`whitelist`, tiene un schema explícito sin ese campo).
**Estado:** ⬜ Pendiente
**Hallazgos:**

### TC-MCP-031-004 — `get_today_activities` describe correctamente su criterio
**Herramienta probada:** `get_today_activities` en `todo-api`
**Precondición:** Ninguna — inspección de metadatos de la tool.
**Input de prueba:** Listar las tools disponibles del servidor MCP (o pedirle
al agente que describa qué hace `get_today_activities`).
**Output esperado:** La descripción ya no menciona "scheduledForToday flag";
describe el criterio como `dueDate` de hoy o `scheduledFor` = hoy.
**Estado:** ⬜ Pendiente
**Hallazgos:**

## Resumen de la ronda
- Aprobados: {{n}} — Fallidos: {{n}} — Pendientes: {{n}}
- Hallazgos escalados a `spec/backlog.md`: {{lista o "ninguno"}}
- Limpieza de datos de prueba: ⬜ Pendiente / ✅ Completada
