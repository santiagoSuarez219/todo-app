# Backlog — deuda técnica y hallazgos diferidos

> Registro de deuda técnica detectada durante la implementación o revisión de
> specs, y de hallazgos de rondas de pruebas manuales que no se corrigen en la
> sesión donde se detectan. Cada entrada referencia el spec que la originó.

## spec-024 — Completar subtareas automáticamente al completar la tarea padre

- **Cascada no atómica.** `ActivitiesService.completeSubtaskTree()`
  (`backend/src/activities/activities.service.ts`) ejecuta un `save()` del
  padre y luego un `UPDATE` por nivel del árbol de subtareas, todos como
  statements independientes, sin transacción. Si un nivel intermedio falla,
  el padre queda persistido como `completed` pero el árbol de subtareas queda
  parcialmente completado, y el cliente recibe un 500 pese a que el padre sí
  se guardó. Para el volumen actual de la app es tolerable, pero envolver la
  operación completa en `manager.transaction(...)` (o resolverla con un CTE
  recursivo en un solo statement) eliminaría el estado inconsistente.
  Detectado en revisión de código previa a `[DONE]`.

- **Test unitario superficial del recorrido recursivo.**
  `backend/src/activities/activities.service.spec.ts` (describe
  `completeSubtaskTree() recursive traversal`) verifica que `find` se llama 3
  veces y que `set` recibe `status: COMPLETED`, pero no asserta los
  `parentIds` pasados a cada `find` ni los `ids` del `where('id IN (:...ids)')`
  por nivel, ni ejercita explícitamente la guarda anti-ciclo (`visited`). El
  test pasaría igual si la implementación solo actualizara el primer nivel.
  La recursión real queda cubierta por el caso e2e `TC-024-02`
  (`backend/test/e2e-024-completar-subtareas-con-tarea-padre.e2e-spec.ts`),
  por eso no bloqueó el `[DONE]`, pero conviene reforzar el unitario con
  asserts explícitos en una próxima pasada por el módulo de actividades.

- **`visited` no incluye `rootId`.** En `completeSubtaskTree()`, si existiera
  un ciclo hipotético en la relación auto-referencial `parent`, el propio
  `rootId` podría reaparecer como "hijo" y recibir un `UPDATE` redundante a
  `completed`. Es inocuo (la terminación está garantizada porque `visited`
  crece monótonamente y el bucle corta cuando `childIds.length === 0`), pero
  `visited.add(rootId)` al inicio del método lo dejaría cerrado del todo.

- **`take(500)` silencioso en `findByMonth()` (Cronograma, spec-025).**
  `ActivitiesService.findByMonth()` (`backend/src/activities/activities.service.ts`)
  aplica un `take(500)` de seguridad sobre el rango visible de la grilla
  mensual, sin paginar. Si un mes acumulara más de 500 actividades de nivel
  superior, la respuesta se trunca en silencio — ni la UI (`ScheduleView`) ni
  el agente vía `get_activities_by_month` reciben ninguna señal de que el
  set está incompleto; ambos ven un array "completo" que no lo es. Para el
  volumen actual de la app (uso personal) es un límite muy lejano, pero si
  se vuelve relevante, agregar un indicador de truncamiento en la respuesta
  (ej. un campo `truncated: boolean` o un total aparte) evitaría el
  silencio. Detectado en revisión de código de spec-025, no bloqueó el
  `[DONE]`.

## spec-027 — Limpieza del modelo de Activity: eliminar `notionUrl`, `isRecurring` y `type`

- **Aviso "tiene instancias generadas" no comprueba el conteo real.**
  `ActivityForm.tsx` (`hasInstances = initial?.isTemplate && initial?.id`)
  muestra el aviso "Este template tiene instancias generadas. Los cambios
  afectarán las instancias futuras pendientes." con solo comprobar que la
  actividad es plantilla (`isTemplate`) y tiene `id` — no consulta
  `GET /activities/:id/instances` ni ningún conteo real. El aviso aparece
  igual aunque la plantilla no tenga ninguna instancia generada todavía
  (por ejemplo, recién creada, antes de que corra el cron de medianoche).
  No es un bug introducido por spec-027 (el componente ya existía así antes),
  detectado durante la ronda manual de `test-027` (TC-027-006). Corregirlo
  requeriría cargar el conteo de instancias al abrir el modal de edición —
  bajo impacto, no bloquea nada.

## spec-030 — Diferir actividades: `deferUntil`

- **`findWithoutProject()` (Backlog) no excluye plantillas (`isTemplate = true`).**
  A diferencia de `findToday()`, `findThisWeek()`, `findTomorrow()` y
  `findOverdue()` (que sí filtran `activity.isTemplate = false`),
  `findWithoutProject()` (`backend/src/activities/activities.service.ts`) no
  tiene ese filtro — una plantilla recurrente sin proyecto aparece en el
  Backlog junto con actividades normales. Es un comportamiento preexistente,
  ajeno al alcance de `deferUntil` (spec-030 solo agregó el filtro de
  diferidas a esta consulta, sin tocar su lógica de `isTemplate`). Detectado
  al redactar spec-030 (ver "Decisiones ya resueltas", punto 2). Corregirlo
  implicaría agregar `.andWhere('activity.isTemplate = false')` a
  `findWithoutProject()` — bajo riesgo, pero cambia qué se ve hoy en Backlog,
  por lo que requiere confirmación del usuario antes de aplicarlo.

- **El `EmptyState` de Hoy/Semana/Vencidas/Backlog no distingue "vacío de
  verdad" de "todo diferido".** Cuando todas las actividades que
  corresponderían a una vista quedan ocultas por `deferUntil`, la vista
  muestra el mismo mensaje genérico que cuando no hay datos en absoluto (ej.
  Backlog: "El backlog está vacío. Agrega tu primera tarea."), sin ningún
  matiz que indique que hay actividades diferidas. Detectado en la ronda
  manual de `test-030` (TC-030-011), vaciando temporalmente el Backlog real
  (con autorización explícita del usuario, datos restaurados de inmediato
  tras la verificación). Es un hallazgo de copy/UX, no de lógica — el
  filtrado de `deferUntil` funciona correctamente. Corregirlo requeriría que
  `EmptyState` (o las vistas que lo consumen) sepa distinguir "sin datos" de
  "datos ocultos por diferimiento", fuera del scope de spec-030.

- **`create_recurring_activity` no rechaza `deferUntil` con un error de
  validación — lo acepta silenciosamente y descarta el campo.** El spec
  esperaba (`TC-MCP-030-004`, criterio 2) que la tool MCP rechazara
  `deferUntil` con `MCP error -32602`, igual que ocurre con un valor fuera
  de enum (ej. `TC-MCP-029-003`). En la práctica, el schema Zod de
  `create_recurring_activity` (`backend/src/mcp/mcp.service.ts`) no declara
  `deferUntil` en su shape y **no usa `.strict()`**, así que Zod descarta
  silenciosamente cualquier clave no declarada del input en vez de lanzar un
  error — la plantilla se crea con éxito, simplemente sin persistir el
  campo. Funcionalmente inofensivo (el campo nunca se guarda ni se hereda a
  instancias), pero el agente no recibe ninguna señal de que el parámetro
  fue ignorado. Detectado en la ronda manual de `test-030`
  (`TC-MCP-030-004`, marcado `❌ Fallido` por este motivo). Corregirlo
  implicaría agregar `.strict()` (o un `.refine()` equivalente) al shape de
  la tool para que rechace explícitamente parámetros no declarados —
  evaluar si aplica al resto de tools MCP del proyecto, no solo a esta,
  antes de decidir el alcance del fix.
