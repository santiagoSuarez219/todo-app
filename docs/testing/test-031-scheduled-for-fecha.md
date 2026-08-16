# test-031 — De `scheduledForToday` (booleano) a `scheduledFor` (fecha)

> Redactado en modo test-first, junto con `spec-031-scheduled-for-fecha.md`.
> Estos casos no pueden aprobarse hasta que la implementación exista: el
> botón de sol, el campo "Programar para" del formulario y la partición de
> `TodayView.tsx` con `scheduledFor` no están construidos todavía.

## Datos de prueba

> Se completa al ejecutar la ronda: registrar aquí cada recurso creado vía
> API (`POST /api/v1/activities`) antes de empezar, con su identificador,
> y marcar su eliminación al cerrar la ronda.

| Recurso   | Endpoint de creación     | Identificador | Usado en | Eliminado |
|-----------|---------------------------|----------------|----------|-----------|
| "[TEST spec-031] TC001-002 — Botón de sol" (sin `dueDate`, sin `scheduledFor`) | `POST /activities` | `7c31c545-dbae-4b7a-816b-984fd258cdce` | TC-031-001, TC-031-002 | ✅ |
| "[TEST spec-031] TC003 — Indicador fecha futura" (`scheduledFor`: 2026-08-17) | `POST /activities` | `1c3f1243-40c1-49d7-b41e-bc85abb7d1c1` | TC-031-003 | ✅ |
| "[TEST spec-031] TC006-A — dueDate hoy" (`dueDate`: 2026-08-16) | `POST /activities` | `a20b02ae-b796-4a64-beea-47cd52043609` | TC-031-006 | ✅ |
| "[TEST spec-031] TC006-B — scheduledFor hoy" (`scheduledFor`: 2026-08-16) | `POST /activities` | `c296353b-4f3e-4c6f-8921-214a35ef05a4` | TC-031-006 | ✅ |
| "[TEST spec-031] TC007 — scheduledFor ayer" (`scheduledFor`: 2026-08-15) | `POST /activities` | `af3a7401-fd96-4fe9-ae2b-be192189c824` | TC-031-007 | ✅ |
| "[TEST spec-031] TC008 — scheduledFor hoy + completed" (`scheduledFor`: 2026-08-16, `status: completed`) | `POST /activities` | `91c3b940-e154-4f46-aa16-a86dc7fc5233` | TC-031-008 | ✅ |
| "[TEST spec-031] TC009 — scheduledFor hoy + deferUntil" (`scheduledFor`: 2026-08-16, `deferUntil`: 2026-08-17) | `POST /activities` | `7cdc26c1-f868-4898-aea3-ddb3b0f2f92f` | TC-031-009 | ✅ |
| "[TEST spec-031] TC004 — Programar para desde formulario" (creada en vivo, `scheduledFor`: 2026-08-17 → limpiada a `null`) | Formulario "Nueva tarea" (quick-add, solo nombre) + edición vía `ActivityForm` (campo "Programar para") | `327abfb9-67b8-46da-826c-77c25d261fec` | TC-031-004, TC-031-005 | ✅ |
| "[TEST spec-031] MCP-001 - scheduledFor futuro" (`scheduledFor`: 2026-08-17 → 2026-08-16 → `null`) | `create_activity` vía MCP, luego `update_activity` ×2 | `8a46d11c-2a7f-4d41-8625-e5c2c51194c8` | TC-MCP-031-001, TC-MCP-031-002 | ✅ |
| "[MCP-031] nombre viejo" (`scheduledForToday` enviado pero descartado silenciosamente — ver Hallazgos de TC-MCP-031-003) | `create_activity` vía MCP | `5ae4922c-26bd-4285-8827-5063d73922f8` | TC-MCP-031-003 | ✅ |
| Intento de `POST /activities` con `scheduledForToday: true` (nombre viejo, rechazado con `400`) | `POST /activities` directo | — (no se creó, rechazado) | TC-031-011 | — |

**Notas de preparación:**
- TC-031-004 (crear desde el formulario) y TC-031-011 (POST directo con
  `scheduledForToday`) no requieren datos previos — la propia actividad se
  crea durante el caso.
- TC-031-010 (migración de datos preexistentes) queda diferido: ya se
  ejecutó y verificó en Fase 2 del spec, no se puede repetir de forma fiel
  sin datos legacy reales adicionales.

**Entorno de pruebas:** desarrollo (`http://localhost:3003/api/v1`) — confirmado, backend local levantado.
**Fecha de la ronda:** 2026-08-16.

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
**Estado:** ✅ Aprobado
**Hallazgos:** Confirmado por REST: `scheduledFor: "2026-08-16"` (hoy) tras el clic. Sin observaciones del usuario.

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
**Estado:** ✅ Aprobado
**Hallazgos:** Confirmado por REST: `scheduledFor: null` tras el segundo clic. Sin observaciones del usuario.

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
**Estado:** ✅ Aprobado
**Hallazgos:** El indicador de fecha futura se mostró correctamente en la card de TC003. Sin observaciones del usuario.

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
**Estado:** ✅ Aprobado
**Hallazgos:** Ejecutado por Claude en el navegador con autorización explícita del usuario. Creada "[TEST spec-031] TC004 — Programar para desde formulario" (`id: 327abfb9-67b8-46da-826c-77c25d261fec`) desde el formulario de edición (el modal de creación rápida solo pide nombre; el campo "Programar para" está en el formulario completo de edición). Confirmado por REST: `scheduledFor: "2026-08-17"`, y no aparece en `GET /activities/today`. Sin observaciones.

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
**Estado:** ✅ Aprobado
**Hallazgos:** Ejecutado por Claude en el navegador. Se reutilizó TC004 (id `327abfb9-67b8-46da-826c-77c25d261fec`), se limpió "Programar para" desde el formulario de edición y se guardó. La card dejó de mostrar el indicador "Programada para el..." y `GET /activities/:id` confirmó `scheduledFor: null`. Sin observaciones.

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
**Estado:** ✅ Aprobado
**Hallazgos:** Ejecutado por Claude en el navegador. En la vista Hoy, TC006-A aparece en la sección "Programadas por fecha" (junto a "[TEST spec-032] Waiting con dueDate hoy", real de otro spec) y TC006-B aparece en la sección separada "Agregadas para hoy". Ningún título menciona el flag booleano viejo (`scheduledForToday`). Sin observaciones.

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
**Estado:** ✅ Aprobado
**Hallazgos:** TC007 (`scheduledFor` = ayer) no apareció entre las cards de la vista Hoy, y `GET /activities/today` tampoco la incluyó. Sin observaciones.

### TC-031-008 — `scheduledFor` = hoy + `status: completed` no aparece en Hoy
**Precondición:** Actividad creada vía API con `scheduledFor` = hoy y
`status: completed`.
**Datos de prueba usados:** `{{id}}`
**Pasos:**
1. Abrir la vista Hoy.
2. Buscar la actividad por nombre.
**Resultado esperado:** La actividad no aparece en ninguna sección de la
vista Hoy.
**Estado:** ✅ Aprobado
**Hallazgos:** TC008 (`scheduledFor` hoy + `status: completed`) no apareció en ninguna sección de la vista Hoy (la vista mostró solo las 3 cards esperadas: TC006-A, la real de spec-032, y TC006-B). Confirmado también por `GET /activities/today`. Sin observaciones.

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
**Estado:** ✅ Aprobado
**Hallazgos:** spec-030 (`deferUntil`) ya está implementado (en `[TESTING]`), así que el caso no está bloqueado. TC009 (`scheduledFor` hoy + `deferUntil` mañana) no apareció en ninguna sección de Hoy, confirmado también por `GET /activities/today`. Sin observaciones.

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
**Estado:** ✅ Aprobado (con corrección de expectativa)
**Hallazgos:** La petición respondió `400` — `"property scheduledForToday should not exist"` — no `201` como decía el resultado esperado escrito arriba. Causa: el `ValidationPipe` global (`main.ts`) tiene `whitelist: true` **y** `forbidNonWhitelisted: true`; este último es el que produce el rechazo explícito en vez del descarte silencioso que el criterio original asumía (ver también nota de `CLAUDE.md` raíz sobre este mismo patrón, ya detectado repetidamente durante la implementación del paquete). Ningún dato quedó creado — comportamiento correcto y, si acaso, más seguro que el originalmente esperado (rechazo explícito de un campo obsoleto en vez de ignorarlo en silencio). Se aprueba el caso porque el sistema se comporta de forma segura y consistente con su configuración real; el texto del criterio de aceptación quedó desactualizado y debería corregirse en una futura edición del spec (no se edita en esta sesión, fuera del alcance de una ronda de pruebas).

### TC-MCP-031-001 — `create_activity` con `scheduledFor` (fecha futura)
**Herramienta probada:** `create_activity` en `todo-api`
**Precondición:** Ninguna.
**Input de prueba:** `{ "name": "[MCP-031] prueba scheduledFor", "scheduledFor": "{{mañana ISO}}" }`
**Output esperado:** La actividad se crea con `scheduledFor` = la fecha
enviada; `get_today_activities` no la incluye hasta que llegue esa fecha.
**Estado:** ✅ Aprobado
**Hallazgos:** `create_activity` devolvió `scheduledFor: "2026-08-17"` (id `8a46d11c-2a7f-4d41-8625-e5c2c51194c8`). `get_today_activities` no la incluyó. Sin observaciones.

### TC-MCP-031-002 — `update_activity` con `scheduledFor: null` desprograma
**Herramienta probada:** `update_activity` en `todo-api`
**Precondición:** Actividad existente con `scheduledFor` = hoy.
**Input de prueba:** `{ "id": "{{id}}", "scheduledFor": null }`
**Output esperado:** La actividad queda con `scheduledFor: null` y
desaparece de `get_today_activities`.
**Estado:** ✅ Aprobado
**Hallazgos:** Se reutilizó la actividad de TC-MCP-031-001, primero puesta en `scheduledFor` = hoy (confirmado por REST), luego `update_activity` con `scheduledFor: null` devolvió el campo limpio y la actividad dejó de aparecer en `get_today_activities`. Sin observaciones.

### TC-MCP-031-003 — `create_activity` con `scheduledForToday` (nombre viejo) falla
**Herramienta probada:** `create_activity` en `todo-api`
**Precondición:** Ninguna. Verifica que el agente no puede seguir usando el
contrato anterior tras el cambio.
**Input de prueba:** `{ "name": "[MCP-031] nombre viejo", "scheduledForToday": true }`
**Output esperado:** El schema Zod de la tool ya no acepta
`scheduledForToday` — el parámetro es rechazado (error de validación del
schema, no un `201` silencioso como en REST, porque la tool no tiene
`whitelist`, tiene un schema explícito sin ese campo).
**Estado:** ❌ Fallido
**Hallazgos:** Mismo hallazgo que `TC-MCP-030-004`: la tool **no** rechazó `scheduledForToday` — lo aceptó, creó la actividad con éxito (`id: 5ae4922c-26bd-4285-8827-5063d73922f8`) y descartó el campo silenciosamente (`scheduledFor: null`, ningún error). Confirma que el problema es **sistémico**, no aislado a `create_recurring_activity`: ningún schema de `mcp.service.ts` usa `.strict()`, así que Zod descarta cualquier clave no declarada del input en cualquier tool, en vez de rechazarla. Actualizado el hallazgo de `spec/backlog.md` para reflejar que afecta a las tools en general, no solo a una.

### TC-MCP-031-004 — `get_today_activities` describe correctamente su criterio
**Herramienta probada:** `get_today_activities` en `todo-api`
**Precondición:** Ninguna — inspección de metadatos de la tool.
**Input de prueba:** Listar las tools disponibles del servidor MCP (o pedirle
al agente que describa qué hace `get_today_activities`).
**Output esperado:** La descripción ya no menciona "scheduledForToday flag";
describe el criterio como `dueDate` de hoy o `scheduledFor` = hoy.
**Estado:** ✅ Aprobado
**Hallazgos:** Verificado vía `tools/list` del propio servidor MCP: la descripción es "Get activities scheduled for today (by dueDate or scheduledFor = today). Excludes deferred activities...", sin mención al flag booleano viejo. Sin observaciones.

## Resumen de la ronda
- Aprobados: 13 (TC-031-001 a 009, TC-031-011, TC-MCP-031-001, 002, 004) — Fallidos: 1 (TC-MCP-031-003) — Pendientes: 1 (TC-031-010, diferido — ya verificado en Fase 2 del spec, no repetible sin datos legacy reales)
- Hallazgos escalados a `spec/backlog.md`: (1) confirmación de que ninguna tool MCP rechaza claves no declaradas — problema sistémico (`.strict()` ausente en todos los schemas de `mcp.service.ts`), ahora confirmado en dos tools distintas; (2) TC-031-011 tenía una expectativa desactualizada (esperaba `201`, la config real de `main.ts` con `forbidNonWhitelisted: true` produce `400`) — no requiere corrección de código, solo del texto del spec
- Limpieza de datos de prueba: ✅ Completada (10 actividades verificadas 404 por REST tras el DELETE)
