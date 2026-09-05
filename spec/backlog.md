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

- **`create_activity`/`create_recurring_activity` corregidas — el resto de
  tools de escritura del servidor MCP puede tener el mismo gap latente, sin
  confirmar.** Se detectó (rondas manuales de `test-030`/`test-031`,
  `TC-MCP-030-004` y `TC-MCP-031-003`) que ninguna tool MCP rechazaba claves
  no declaradas en su input — las descartaba silenciosamente en vez de dar
  un error de validación:
  - `create_recurring_activity` no rechazaba `deferUntil` (`TC-MCP-030-004`,
    criterio 2): el spec esperaba `MCP error -32602`, igual que con un valor
    fuera de enum (ej. `TC-MCP-029-003`), pero la plantilla se creaba con
    éxito y el campo simplemente no se persistía.
  - `create_activity` no rechazaba `scheduledForToday` (nombre viejo del
    campo, `TC-MCP-031-003`): mismo patrón — la actividad se creaba con
    éxito y el campo se descartaba sin aviso.

  Causa raíz: ningún `server.tool(...)` de `backend/src/mcp/mcp.service.ts`
  usa `.strict()` en su shape Zod, así que por defecto Zod descarta
  cualquier clave no declarada del input en lugar de lanzar un error —
  a diferencia del rechazo por **valor** inválido dentro de un campo sí
  declarado (ej. `horizon` en `TC-MCP-029-003`), que sí funciona porque ahí
  el rechazo lo hace el propio `z.enum()`.

  **Corregido (2026-08-17), alcance quirúrgico aprobado por el usuario:**
  `create_activity` y `create_recurring_activity` migradas de `server.tool()`
  a `server.registerTool()` con `z.object({...}).strict()` — ambas rechazan
  ahora explícitamente cualquier clave no declarada (`MCP error -32602:
  Unrecognized key: "..."`). `TC-MCP-030-004` y `TC-MCP-031-003`
  re-verificados en verde; suite completa confirmada por `@tester` sin
  fallos nuevos. `docs/mcps/asistente-personal.system-prompt.md` actualizado
  para reflejar el rechazo explícito.

  **Pendiente (deuda técnica, sin resolver):** el fix se limitó a las 2
  tools probadas como rotas, por decisión explícita del usuario de mantener
  el alcance quirúrgico. El resto de tools de escritura de `mcp.service.ts`
  (`update_activity`, `create_project`, `update_project`, `create_expense`,
  `update_expense`, y las demás `create_*`/`update_*` de finanzas — unas
  ~30 en total) usan el mismo patrón `server.tool()` sin `.strict()` y
  podrían tener el mismo gap latente, sin confirmar caso por caso. Evaluar
  el alcance completo antes de decidir si conviene una pasada sistémica.

## spec-033 — Estado `testing`: trabajo hecho, pendiente de probar

- **`ActivityForm.tsx` corre `dueDate` un día hacia atrás en cada guardado,
  para cualquier actividad con hora distinta de medianoche.**
  Detectado en la ronda manual de `test-033` (TC-033-002), sin relación con
  el estado `testing` en sí — es un bug del manejo de `dueDate` en el
  formulario, preexistente, expuesto al guardar cualquier cambio de estado.
  - `initial.dueDate.slice(0, 10)` (línea ~135) trunca el `dueDate` original
    a `YYYY-MM-DD` para poblar el `<input type="date">`, descartando
    cualquier componente de hora que tuviera (ej. `T12:00:00`).
  - Al guardar, `values.dueDate || null` (línea ~182) reenvía ese string
    "solo fecha" tal cual al backend — **en todo guardado del formulario**,
    haya cambiado o no el campo Fecha límite.
  - El backend persiste ese string date-only como medianoche UTC
    (`2026-08-17T00:00:00.000Z`). En una zona horaria de offset negativo
    (Colombia, UTC-5), medianoche UTC es las 7pm del día anterior — la UI
    muestra "16 de ago" para una actividad guardada como "17 de ago".
  - Reproducido de forma determinística: una actividad con `dueDate:
    "2026-08-17T12:00:00"` guardada sin tocar ningún campo (solo abrir el
    formulario y pulsar Guardar) queda con `dueDate:
    "2026-08-17T00:00:00.000Z"`, un día antes en la UI.
  - Corregirlo implica que `ActivityForm` preserve el componente de hora
    original al reconstruir el payload (o que el backend interprete
    fechas-solo-día en la zona horaria de la app, no en UTC) — fuera del
    alcance de spec-033, que no toca `dueDate` ni `ActivityForm` más allá de
    agregar la opción de estado.

## spec-035 — Unificación de presupuesto y gastos

- **`BudgetsService.findAll()` hidrata todos los `expenses` de cada
  presupuesto de la página, solo para calcular `plannedTotal`.**
  (`backend/src/finances/budgets.service.ts`) — cada `GET /finances/budgets`
  hace `leftJoinAndSelect('budget.expenses', ...)` con join a `debt`, trae
  todas las filas de gasto de cada presupuesto listado y luego suma en
  memoria. `BudgetsView` (la única vista que consume este endpoint) no
  necesita el detalle de gastos, solo el conteo y el total planeado. Para el
  volumen actual (uso personal) es intrascendente, pero si un presupuesto
  acumula muchos gastos, el listado se vuelve más pesado de lo necesario.
  Corregirlo implica una agregación `SUM`/`COUNT` por `budgetId` en el propio
  query en vez de traer las entidades completas — fuera del alcance
  quirúrgico de spec-035, que reutilizó el patrón de `findOne()` por
  simplicidad. Análogo al hallazgo ya registrado de `findByMonth()` en
  spec-024, aunque aquí no hay truncamiento silencioso, solo sobre-fetch.
- **`Expense.executionStatus` no tiene `@ApiProperty` en la entidad**
  (`backend/src/finances/entities/expense.entity.ts`) — es un campo calculado
  no persistido (ver "Semántica derivada" en spec-035), documentado con un
  comentario pero sin decorador Swagger, así que no aparece tipado en
  `/api/v1/docs` aunque el backend sí lo devuelve en cada respuesta. Bajo
  impacto (cosmético, no afecta el contrato real), pendiente si se retoma
  trabajo en la documentación Swagger del módulo de finanzas.
- **Gap de validación `.strict()` en tools MCP — reducido, no cerrado.**
  Continuación del hallazgo de spec-030: `create_expense`, `update_expense` y
  `create_budget` se migraron a `server.registerTool()` con `.strict()` como
  parte de la Fase 6 de spec-035 (mismo precedente de `create_activity`). El
  resto de tools de escritura de `mcp.service.ts` (`update_project`,
  `create_income`, y las ~25 restantes) sigue sin `.strict()`. Sin cambios
  respecto de la evaluación pendiente ya registrada en spec-030.
