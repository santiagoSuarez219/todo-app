# test-030 — Diferir actividades: `deferUntil`

> Redactado en modo test-first, junto con `spec/spec-030-defer-until.md`,
> **antes** de que exista una sola línea de implementación. Todos los casos
> quedan en `⬜ Pendiente` hasta que la Fase 5 (frontend) esté completa y el
> usuario los ejecute.
>
> Paquete "Actividades — modelo de capas" (specs 027→032, rama
> `feature/actividades-modelo-actividades`). Este es **el spec de mayor
> impacto del paquete**: toca cinco vistas activas a la vez (Hoy, Mañana,
> Semana, Vencidas, Backlog).
>
> **Preparación por API, no por reloj:** todos los casos anclados a "hoy",
> "mañana" o "ayer" crean las actividades con `deferUntil` = esa fecha
> relativa vía API en el momento de ejecutar la ronda — nunca se espera al
> día siguiente para observar la reaparición. Se indica explícitamente en
> cada caso qué fecha relativa usa.

## Datos de prueba
> Recursos a crear vía API/UI para poder ejecutar estos casos. Se completan
> con identificadores reales y estado de eliminación **al ejecutar** la
> ronda (no ahora), siguiendo "Pruebas manuales asistidas por Claude" del
> `CLAUDE.md` raíz.

| Recurso | Endpoint de creación | Identificador | Usado en | Eliminado |
|---|---|---|---|---|
| "[TEST spec-030] ACT-A — Diferida futura, hoy" (`dueDate`: hoy 2026-08-16, `deferUntil`: mañana 2026-08-17) | `POST /activities` | `c53badd1-3e4f-4a3b-a6d1-7512d689fe1e` | TC-030-001, TC-030-009 | ✅ |
| ~~"[TEST spec-030] ACT-B — Diferida dentro de esta semana"~~ — **no se crea esta ronda**: hoy (2026-08-16) es domingo, último día de la ventana Lun–Dom; no existe ningún día "dentro de esta semana" que sea también futuro. TC-030-002 queda diferido, per la propia nota del archivo. | — | — | TC-030-002 (diferido) | — |
| "[TEST spec-030] ACT-C — Vencida y diferida" (`dueDate`: 2026-08-11, `deferUntil`: 2026-08-17) | `POST /activities` | `33c2ad3d-f36e-479b-b8e6-e63f5ed66e68` | TC-030-003 | ✅ |
| "[TEST spec-030] ACT-D — Backlog diferida futura" (sin proyecto, sin `dueDate`, `deferUntil`: 2026-08-18) | `POST /activities` | `4cdf8717-891b-4c72-9684-95aab85bf258` | TC-030-004, TC-030-008 | ✅ |
| "[TEST spec-030] PROJ-A — Detalle/búsqueda/cronograma" | `POST /projects` | `0289d93f-fbaf-4292-b1d4-0b6b92b65b9f` | TC-030-005 | ✅ |
| "[TEST spec-030] ACT-E — Con proyecto, diferida futura" (proyecto arriba, `deferUntil`: 2026-08-21) | `POST /activities` | `55bc9d99-8a59-455f-a362-3252ba120457` | TC-030-005, TC-030-009 | ✅ |
| "[TEST spec-030] ACT-F — Diferida futura, visible en Cronograma" (`dueDate` 2026-08-20, dentro de agosto 2026, `deferUntil`: 2026-08-21) | `POST /activities` | `f6165a99-01e5-411e-a7e4-2ce5e3abb4a3` | TC-030-005 | ✅ |
| "[TEST spec-030] ACT-G — deferUntil = hoy" (`dueDate`: hoy, `deferUntil`: hoy 2026-08-16) | `POST /activities` | `27fc21c2-c2af-48c9-a9e2-467fb249e342` | TC-030-006 | ✅ |
| "[TEST spec-030] ACT-H — deferUntil pasado" (`dueDate`: hoy, `deferUntil`: ayer 2026-08-15) | `POST /activities` | `064011cb-7ad8-4e1f-b025-a387e443912f` | TC-030-007 | ✅ |
| "[TEST spec-030] TEMPLATE-A — Plantilla recurrente diferida" (`recurrenceFrequency: daily`, `deferUntil`: 2026-09-15) | `POST /activities` (precreada vía API — el foco es la herencia a instancias, no el formulario de recurrencia, ya probado en specs previos) | `3f67addc-b109-4d49-a696-e4f45efd3471` | TC-030-010 | ✅ |
| Instancia generada por TEMPLATE-A (nace sola, no se crea manualmente) | Cron diario / `GET /activities/{{id}}/instances` | — (nunca llegó a generarse dentro de la ventana de esta ronda — el cron no corrió; ver Hallazgos de TC-030-010) | TC-030-010 | — (no aplica, nada que limpiar) |
| "[TEST spec-030] ACT-MCP — update_activity con deferUntil" | `create_activity` vía MCP, luego `update_activity` | `89da5c74-73e3-4eb1-ab3f-2ef45a32149f` | TC-MCP-030-001, TC-MCP-030-002 | ✅ |
| "[TEST spec-030] ACT-MCP-2 — segunda diferida, para orden ASC" (`deferUntil` posterior a ACT-MCP) | `create_activity` vía MCP | `38005509-e093-4d5c-b1f8-4fd410bc33d1` | TC-MCP-030-002 | ✅ |
| "[TEST spec-030] ACT-MCP-TOM — Mañana, diferida" (`dueDate`: mañana, `deferUntil`: pasado mañana) | `create_activity` vía MCP | `186a973f-a32c-48fc-b01e-0f86e239ca62` | TC-MCP-030-003 | ✅ |
| "[TEST spec-030] ACT-MCP-CREATE — create con deferUntil" | `create_activity` vía MCP, luego `update_activity` (limpiar) | `29c952fc-37cd-4a33-8544-9056ecb1c365` | TC-MCP-030-004 | ✅ |
| "[TEST spec-030] TEMPLATE-MCP — create_recurring_activity" (`deferUntil` enviado pero descartado silenciosamente — ver Hallazgos de TC-MCP-030-004) | `create_recurring_activity` vía MCP | `d639f305-70fb-4dc8-a149-a00a6a565909` | TC-MCP-030-004 | ✅ |

**Notas de uso:**
- Todas las actividades y proyectos de prueba llevan el prefijo
  `[TEST spec-030]` en el nombre para distinguirlos de datos reales durante
  la limpieza.
- Las fechas relativas ("hoy", "mañana", "ayer", "hace 5 días") se calculan
  el día de la ejecución de la ronda y se registran aquí como fechas
  absolutas concretas antes de correr los casos, para que cada caso quede
  documentado con la fecha exacta usada.
- **TC-030-002 (semana):** si el día de ejecución de la ronda es domingo (el
  último día de la ventana Lun–Dom), no existe ningún día "dentro de esta
  semana" que sea al mismo tiempo futuro respecto de hoy — reprogramar este
  caso puntual para otro día de la semana (mismo criterio que la guarda
  `itUnlessSunday` de `e2e-030-defer-until.e2e-spec.ts`).
- Al cerrar la ronda, eliminar todas las actividades y proyectos de prueba
  vía `DELETE`, en orden inverso a su creación (instancia antes que
  plantilla, actividades antes que su proyecto) y confirmar `404` posterior.
- Confirmar antes de crear cualquier dato que el MCP usado para los casos
  `TC-MCP-030-xxx` apunta a local, no a producción (mismo chequeo que en
  rondas anteriores del paquete).
- **Hallazgo a verificar durante la ejecución (no antes):** el spec declara
  spec-028 (`completedAt`/`postponementCount`) como dependencia `[DONE]`,
  pero al redactar estas pruebas ese spec seguía en `[NOT STARTED]` en el
  repo. El criterio "diferir no incrementa `postponementCount`" solo puede
  verificarse una vez spec-028 esté realmente implementado — si sigue sin
  estarlo al ejecutar esta ronda, marcarlo como diferido en vez de fallido.

**Entorno de pruebas:** desarrollo (`http://localhost:3003/api/v1` /
`http://localhost:5173`) — confirmado, backend local levantado.
**Fecha de la ronda:** 2026-08-16 (domingo — ver nota sobre TC-030-002 arriba).

**Notas de preparación:**
- TC-030-010 (instancia generada por TEMPLATE-A): el cron corre a medianoche,
  así que la instancia no existe todavía al momento de preparar estos datos.
  Verificar `GET /activities/{{id}}/instances` de TEMPLATE-A cuando llegue el
  momento de ejecutar ese caso — si sigue vacío, queda pendiente hasta que el
  cron corra (ya está cubierto automáticamente por el unit test de
  `buildInstanceFromTemplate()`, así que no bloquea el resto de la ronda).

## Casos de prueba

### TC-030-001 — Diferir una actividad desde el formulario la oculta de Hoy
**Precondición:** Existe una actividad con `dueDate` = hoy.
**Datos de prueba usados:** `{{id-act-a}}` (`deferUntil` = mañana).
**Pasos:**
1. Crear (o editar) la actividad ACT-A desde `ActivityForm`, con `dueDate` =
   hoy y el nuevo campo "Diferir hasta" = mañana.
2. Navegar a la vista Hoy.
3. Verificar que ACT-A **no** aparece en la lista.
**Resultado esperado:** La actividad diferida a una fecha futura desaparece
de Hoy aunque su `dueDate` sea hoy — el criterio de `deferUntil` prevalece
sobre el de la vista.
**Estado:** ✅ Aprobado
**Hallazgos:** ACT-A no apareció en la vista Hoy pese a `dueDate` = hoy, confirmando que `deferUntil` prevalece. Sin observaciones del usuario.

---

### TC-030-002 — Diferida a un día de esta semana no aparece hoy en Semana (comparación contra hoy, no contra el fin de la ventana)
**Precondición:** Existe una actividad con `dueDate` en un día de esta
semana (domingo, último día de la ventana Lun–Dom).
**Datos de prueba usados:** `{{id-act-b}}` (`deferUntil` = mañana, un día
dentro de esta misma semana).
**Pasos:**
1. Crear ACT-B con `dueDate` = domingo de esta semana y `deferUntil` =
   mañana.
2. Navegar a la vista Semana.
3. Verificar que ACT-B **no** aparece, a pesar de que su `dueDate` cae
   dentro de la ventana visible de la semana.
**Resultado esperado:** ACT-B permanece oculta porque `deferUntil` (mañana)
todavía no llegó a "hoy" — la regla mental "si está diferida, no la veo" se
cumple sin excepción por vista, incluso cuando la fecha de diferimiento cae
dentro de la ventana de la propia vista.
**Estado:** ⬜ Pendiente
**Hallazgos:**

---

### TC-030-003 — Una tarea vencida y diferida no aparece en Vencidas
**Precondición:** Existe una actividad con `dueDate` vencido (hace 5 días).
**Datos de prueba usados:** `{{id-act-c}}` (`deferUntil` = mañana).
**Pasos:**
1. Crear ACT-C con `dueDate` = hace 5 días y `deferUntil` = mañana.
2. Navegar a la vista Vencidas.
3. Verificar que ACT-C **no** aparece, aunque su `dueDate` esté claramente
   vencido.
4. (Opcional, mismo día vía API) `PATCH` `deferUntil` a ayer y refrescar la
   vista: ACT-C debe reaparecer en Vencidas de inmediato.
**Resultado esperado:** Diferir una tarea vencida la oculta de Vencidas — es
justamente el objetivo del campo, según el spec. Al llegar/pasar la fecha de
diferimiento, la tarea reaparece en Vencidas sin ninguna acción adicional
del usuario.
**Estado:** ✅ Aprobado
**Hallazgos:** ACT-C no apareció en Vencidas mientras `deferUntil` era futuro. Tras `PATCH deferUntil` a ayer (2026-08-15) vía API, reapareció en Vencidas de inmediato al refrescar, sin ninguna acción adicional. Sin observaciones.

---

### TC-030-004 — Diferida futura no aparece en Backlog
**Precondición:** Existe una actividad sin proyecto ni `dueDate`.
**Datos de prueba usados:** `{{id-act-d}}` (`deferUntil` = pasado mañana).
**Pasos:**
1. Crear ACT-D sin proyecto, sin `dueDate`, con `deferUntil` = pasado
   mañana.
2. Navegar a la vista Backlog.
3. Verificar que ACT-D **no** aparece en la lista.
**Resultado esperado:** ACT-D queda oculta de Backlog mientras
`deferUntil` sea futuro, igual que en las demás vistas activas.
**Estado:** ✅ Aprobado
**Hallazgos:** ACT-D no apareció en Backlog mientras `deferUntil` era futuro. Sin observaciones del usuario.

---

### TC-030-005 — Presencia confirmada en vistas NO afectadas: detalle de proyecto, búsqueda y Cronograma
**Precondición:** Existen actividades diferidas a futuro asociadas a un
proyecto y con `dueDate` dentro del mes visible del Cronograma.
**Datos de prueba usados:** `{{id-proj-a}}`, `{{id-act-e}}` (proyecto,
`deferUntil` futuro), `{{id-act-f}}` (`dueDate` en el mes objetivo del
Cronograma, `deferUntil` futuro).
**Pasos:**
1. Navegar al detalle de PROJ-A (`/projects/{{id-proj-a}}` o equivalente) y
   verificar que ACT-E aparece en su listado de actividades, sin ningún
   indicio de estar oculta.
2. Usar el buscador global con un término que coincida con el nombre de
   ACT-E (ej. "ACT-E") y verificar que aparece en los resultados.
3. Navegar al Cronograma (`/activities/schedule`), ubicar el mes que
   contiene el `dueDate` de ACT-F, y verificar que su chip aparece en el día
   correspondiente.
**Resultado esperado:** Las tres vistas explícitamente excluidas del
filtrado de `deferUntil` (detalle de proyecto, búsqueda, Cronograma) siguen
mostrando las actividades diferidas con total normalidad — el usuario pidió
el dato explícitamente en cada una de ellas.
**Estado:** ✅ Aprobado
**Hallazgos:** ACT-E visible en el detalle de PROJ-A y en el buscador global; ACT-F visible en el chip del Cronograma (agosto 2026, día 20). Las tres vistas confirmadas correctas por el usuario. Sin observaciones.

---

### TC-030-006 — `deferUntil` = hoy no oculta nada
**Precondición:** Existe una actividad con `dueDate` = hoy.
**Datos de prueba usados:** `{{id-act-g}}` (`deferUntil` = hoy).
**Pasos:**
1. Crear ACT-G con `dueDate` = hoy y `deferUntil` = hoy.
2. Navegar a la vista Hoy.
3. Verificar que ACT-G aparece con normalidad.
**Resultado esperado:** El día en que `deferUntil` llega a ser igual a hoy,
la actividad se comporta con total normalidad según su `dueDate` — no hace
falta que `deferUntil` sea estrictamente anterior a hoy.
**Estado:** ✅ Aprobado
**Hallazgos:** ACT-G apareció con normalidad en Hoy con `deferUntil` = hoy. Sin observaciones.

---

### TC-030-007 — `deferUntil` pasado se comporta exactamente como `deferUntil: null`
**Precondición:** Existe una actividad con `dueDate` = hoy.
**Datos de prueba usados:** `{{id-act-h}}` (`deferUntil` = ayer).
**Pasos:**
1. Crear ACT-H con `dueDate` = hoy y `deferUntil` = ayer.
2. Navegar a la vista Hoy.
3. Verificar que ACT-H aparece con normalidad, sin ningún indicador de
   "diferida" visible en su card.
**Resultado esperado:** Una vez que `deferUntil` quedó en el pasado, la
actividad es indistinguible de una con `deferUntil: null` — ni se oculta ni
muestra el indicador de diferida (el indicador solo aplica a fechas
futuras, ver TC-030-009).
**Estado:** ✅ Aprobado
**Hallazgos:** ACT-H apareció con normalidad en Hoy, sin indicador de diferida, con `deferUntil` en el pasado. Sin observaciones.

---

### TC-030-008 — Limpiar `deferUntil` (`PATCH` a `null`) hace reaparecer la actividad de inmediato
**Precondición:** ACT-D está oculta de Backlog (TC-030-004).
**Datos de prueba usados:** `{{id-act-d}}`.
**Pasos:**
1. Confirmar (por API o revisando que no aparece en Backlog) que ACT-D
   sigue oculta.
2. Editar ACT-D desde `ActivityForm` y limpiar el campo "Diferir hasta"
   (dejarlo vacío / enviar `null`).
3. Guardar y volver a Backlog.
**Resultado esperado:** ACT-D reaparece en Backlog inmediatamente después de
guardar, sin recargar la página ni esperar ninguna acción adicional.
**Estado:** ✅ Aprobado
**Hallazgos:** Ejecutado por Claude en el navegador con autorización explícita puntual del usuario para este caso. ACT-D estaba oculta de Backlog; se localizó vía el buscador global (mostraba el indicador "Diferida hasta 18 de ago de 2026"), se editó desde `ActivityForm` limpiando el campo "Diferir hasta" y se guardó. Al volver a Backlog sin recargar la página, ACT-D reapareció de inmediato. Sin observaciones.

---

### TC-030-009 — Indicador "Diferida hasta {fecha}" visible en la card, solo cuando la fecha es futura
**Precondición:** Existen actividades diferidas a futuro visibles en vistas
donde sí aparecen (detalle de proyecto, búsqueda).
**Datos de prueba usados:** `{{id-act-e}}` (proyecto, `deferUntil` dentro de
5 días), `{{id-act-a}}` (referencia de TC-030-001, si se reutiliza en otra
vista donde sí sea visible).
**Pasos:**
1. Ir al detalle de PROJ-A y localizar la card de ACT-E.
2. Verificar que la card muestra el indicador "Diferida hasta {fecha}" con
   la fecha correcta.
3. Repetir la verificación en los resultados del buscador para la misma
   actividad.
4. Comparar contra ACT-H (TC-030-007, `deferUntil` pasado): su card **no**
   debe mostrar el indicador.
**Resultado esperado:** El indicador solo aparece cuando `deferUntil` tiene
valor y es una fecha futura; desaparece automáticamente en cuanto la fecha
pasa (ver TC-030-007), sin ninguna acción del usuario. Los estilos del
indicador salen de los tokens semánticos de `DESIGN.md` (revisar en modo
claro y oscuro).
**Estado:** ✅ Aprobado
**Hallazgos:** Ejecutado por Claude en el navegador con autorización explícita puntual del usuario para este caso. ACT-E muestra "Diferida hasta 21 de ago de 2026" tanto en el detalle de PROJ-A como en el buscador global, en modo oscuro y en modo claro (legible, estilo consistente). ACT-H (deferUntil pasado) no muestra ningún indicador, solo "Vence: 16 de ago de 2026". Comportamiento correcto en todos los casos. Sin observaciones.
**Hallazgos:**

---

### TC-030-010 — Las instancias de una plantilla recurrente nacen con `deferUntil: null`, aunque la plantilla esté diferida
**Precondición:** Existe una plantilla recurrente diaria con `deferUntil`
futuro (dentro de 30 días).
**Datos de prueba usados:** `{{id-template-a}}`.
**Pasos:**
1. Crear TEMPLATE-A como actividad recurrente diaria (`isRecurring: true`,
   `recurrenceFrequency: daily`) y diferirla 30 días hacia el futuro desde
   `ActivityForm`.
2. Esperar a que el cron diario genere la instancia del día (o, si el
   entorno lo permite, consultar `GET /activities/{{id-template-a}}/instances`
   tras la ejecución programada) y anotar el `id` de la instancia generada
   como `{{id-instance-a}}`.
3. Abrir el detalle de la instancia generada (`GET /activities/{{id-instance-a}}`
   o su card en Hoy/Backlog según corresponda) y verificar su `deferUntil`.
**Resultado esperado:** La instancia generada por TEMPLATE-A tiene
`deferUntil: null`, sin indicador de "diferida" en su card, y aparece con
normalidad según su propio `dueDate`/`instanceDate` — el diferimiento de la
plantilla no se hereda a sus instancias ya materializadas.
**Estado:** ⬜ Pendiente (diferido — el cron diario corre a medianoche y `GET /activities/{{id-template-a}}/instances` sigue vacío al momento de esta ronda; comportamiento ya cubierto por el unit test de `buildInstanceFromTemplate()`, no bloquea el cierre de la ronda)
**Hallazgos:** Verificado por API que aún no existe ninguna instancia generada. Caso reprogramado para cuando el cron haya corrido al menos una vez sobre esta plantilla.

---

### TC-030-011 — Los `EmptyState` de Hoy/Semana/Vencidas/Backlog siguen teniendo sentido cuando todo queda oculto por diferimiento
**Precondición:** Es posible dejar temporalmente una de las vistas sin
ninguna actividad visible, diferiendo todas las que tendrían que aparecer
ahí (usar datos de prueba aislados, sin tocar actividades reales).
**Datos de prueba usados:** cualquiera de las creadas en esta ronda que, en
conjunto, puedan dejar una vista vacía momentáneamente (ej. Backlog, si es
la vista con menos datos reales de fondo).
**Pasos:**
1. Elegir una vista con pocos datos reales de fondo.
2. Diferir (vía `PATCH`) el resto de actividades visibles ahí a una fecha
   futura, de forma que la vista quede vacía.
3. Recargar la vista.
**Resultado esperado:** Se muestra el `EmptyState` existente de la app (el
mismo patrón que en vistas vacías por ausencia real de datos), sin un
mensaje engañoso que sugiera "no tienes actividades" cuando en realidad hay
actividades diferidas — revisar si el texto del `EmptyState` amerita un
matiz (fuera de scope forzar un cambio de copy si no estaba ya contemplado
en el spec; documentar como hallazgo si el texto resulta confuso).
**Estado:** ✅ Aprobado (con hallazgo de copy)
**Hallazgos:** Con autorización explícita del usuario, se diferieron temporalmente las 29 actividades visibles del Backlog (10 reales del usuario + 19 de prueba de este paquete) a `deferUntil: 2026-12-31` vía API, tras guardar un snapshot exacto de sus valores originales. El Backlog mostró el `EmptyState` genérico existente: "El backlog está vacío. Agrega tu primera tarea." — **sin ningún matiz que indique que hay actividades ocultas por diferimiento**, exactamente el caso ambiguo que el propio caso anticipaba. Se registra como hallazgo de copy (no de lógica) para `spec/backlog.md`, sin corregirlo en esta sesión. Inmediatamente después se restauraron las 29 actividades a su `deferUntil` original (verificado 200 en cada PATCH) y se confirmó por API que el conteo de Backlog volvió a 29/29 visibles, sin pérdida de datos.

---

## Casos de prueba (MCP)

### TC-MCP-030-001 — El agente puede invocar `update_activity` con `deferUntil` y `get_today_activities` deja de devolver esa actividad
**Herramienta probada:** `update_activity` y `get_today_activities` en
`todo-api`.
**Precondición:** Existe una actividad con `dueDate` = hoy.
**Input de prueba:**
```json
{ "id": "{{id-act-mcp}}", "deferUntil": "{{fecha-mañana}}" }
```
**Output esperado:**
1. `update_activity` devuelve la actividad actualizada con
   `deferUntil: "{{fecha-mañana}}"`.
2. Una llamada posterior a `get_today_activities` **no** incluye
   `{{id-act-mcp}}` en su resultado, aunque su `dueDate` siga siendo hoy.
3. Verificado por REST (`GET /activities/today`) que el comportamiento
   coincide con el de la tool.
**Estado:** ✅ Aprobado
**Hallazgos:** `update_activity` devolvió `deferUntil: "2026-08-17"` sobre ACT-MCP (`dueDate` hoy). `get_today_activities` no incluyó ACT-MCP en el resultado. Confirmado además por REST (`GET /activities/today`) que tampoco aparece ahí. Sin observaciones.

---

### TC-MCP-030-002 — `get_deferred_activities` devuelve la actividad diferida, ordenada por `deferUntil ASC`, y deja de devolverla al pasar la fecha
**Herramienta probada:** `get_deferred_activities` en `todo-api`.
**Precondición:** `{{id-act-mcp}}` está diferida (TC-MCP-030-001). Existe
además `{{id-act-mcp-2}}` con un `deferUntil` posterior.
**Input de prueba:**
```json
{}
```
**Output esperado:**
1. El resultado incluye `{{id-act-mcp}}` y `{{id-act-mcp-2}}`, en ese orden
   (el `deferUntil` más próximo primero).
2. Ninguna actividad con `deferUntil: null` ni con `deferUntil` ya pasado
   aparece en el resultado (contrastar con ACT-H, TC-030-007).
3. Tras hacer `PATCH`/`update_activity` sobre `{{id-act-mcp}}` con
   `deferUntil` = hoy (o una fecha pasada), una nueva llamada a
   `get_deferred_activities` ya no la incluye.
**Estado:** ✅ Aprobado
**Hallazgos:** El resultado devolvió las 7 actividades diferidas del entorno ordenadas ASC por `deferUntil` (2026-08-17×3, 08-21×2, 08-25, 09-15), con ACT-MCP antes de ACT-MCP-2, confirmando el orden. Ninguna con `deferUntil: null` o pasado apareció (ACT-C, ACT-H, ACT-D, ACT-G quedaron correctamente excluidas). Tras `update_activity` con `deferUntil` = hoy sobre ACT-MCP (verificado por REST), una nueva llamada a `get_deferred_activities` ya no la incluyó. Sin observaciones.

---

### TC-MCP-030-003 — `get_tomorrow_activities` excluye actividades diferidas (única vía de prueba de la vista "Mañana", sin UI propia)
**Herramienta probada:** `get_tomorrow_activities` en `todo-api`.
**Precondición:** Existe una actividad con `dueDate` = mañana.
**Input de prueba:**
```json
{ "id": "{{id-act-mcp-tomorrow}}", "deferUntil": "{{fecha-pasado-mañana}}" }
```
(enviado vía `update_activity`, tras crear la actividad con `dueDate` =
mañana)
**Output esperado:** Una llamada a `get_tomorrow_activities` **no** incluye
`{{id-act-mcp-tomorrow}}` mientras `deferUntil` (pasado mañana) siga siendo
futuro respecto de hoy — la comparación es contra hoy, no contra mañana.
**Estado:** ✅ Aprobado
**Hallazgos:** ACT-MCP-TOM se creó con `dueDate` = mañana (2026-08-17) y se le aplicó `deferUntil` = pasado mañana (2026-08-18) vía `update_activity`, confirmado persistido por REST. `get_tomorrow_activities` no la incluyó en el resultado, confirmando que la comparación es contra hoy y no contra mañana. Sin observaciones.

---

### TC-MCP-030-004 — `create_activity`/`update_activity` aceptan `deferUntil`; `create_recurring_activity` no lo expone
**Herramienta probada:** `create_activity`, `update_activity` y
`create_recurring_activity` en `todo-api`.
**Precondición:** Ninguna.
**Input de prueba (create_activity):**
```json
{ "name": "[TEST spec-030] ACT-MCP - create con deferUntil", "deferUntil": "{{fecha-futura}}" }
```
**Input de prueba (create_recurring_activity):**
```json
{
  "name": "[TEST spec-030] TEMPLATE-MCP - create_recurring_activity",
  "recurrenceFrequency": "daily",
  "deferUntil": "{{fecha-futura}}"
}
```
**Output esperado:**
1. `create_activity` acepta `deferUntil` y lo persiste (verificar con
   `GET /activities/:id`).
2. `create_recurring_activity` **rechaza** el parámetro `deferUntil` con un
   error de validación del schema Zod (`MCP error -32602`), porque no forma
   parte de su schema — las instancias no lo heredan de la plantilla, así
   que la tool no lo expone en absoluto (a diferencia de `create_activity`).
3. `update_activity` acepta `deferUntil: null` para limpiar el campo sobre
   una actividad ya diferida.
**Estado:** ❌ Fallido (criterio 2)
**Hallazgos:** Criterios 1 y 3 confirmados: `create_activity` acepta y persiste `deferUntil` (verificado con `GET /activities/:id`); `update_activity` con `deferUntil: null` limpia el campo correctamente. **Criterio 2 no se cumple tal como está escrito:** `create_recurring_activity` no rechaza `deferUntil` con `MCP error -32602` — lo acepta silenciosamente, crea la plantilla con éxito y simplemente descarta el campo (queda `deferUntil: null` en la plantilla creada, sin ningún error). Causa raíz: el schema Zod de la tool (`backend/src/mcp/mcp.service.ts`, `create_recurring_activity`) no usa `.strict()`, así que por defecto Zod descarta claves no declaradas en el shape en lugar de lanzar un error de validación — a diferencia de lo que ocurrió en `TC-MCP-029-003`, donde el rechazo fue por un **valor** inválido dentro de un campo sí declarado (`horizon`), no por un campo no declarado. Documentado en `spec/backlog.md`, sin corregir en esta sesión.

---

## Resumen de la ronda
- Aprobados: 12 (TC-030-001, 003, 004, 005, 006, 007, 008, 009, 011, TC-MCP-030-001, 002, 003) — Fallidos: 1 (TC-MCP-030-004, criterio 2) — Pendientes: 2 (TC-030-002 diferido por caer domingo, TC-030-010 diferido a que el cron corra)
- Hallazgos escalados a `spec/backlog.md`: (1) `EmptyState` no distingue "vacío de verdad" de "todo diferido" (TC-030-011); (2) `create_recurring_activity` no rechaza `deferUntil` — lo descarta silenciosamente por falta de `.strict()` en el schema Zod (TC-MCP-030-004)
- Limpieza de datos de prueba: ✅ Completada (13 actividades + 1 proyecto verificados 404 por REST tras el DELETE; no llegó a generarse instancia de TEMPLATE-A, nada que limpiar ahí)
