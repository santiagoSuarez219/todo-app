# spec-030 — [DONE] Diferir actividades: `deferUntil`

> Estado inicial obligatorio: `[NOT STARTED]`.
> Actualizar a `[IN PROGRESS]`, `[TESTING]` o `[DONE]` según avance.

> **Paquete "Actividades — modelo de capas"** (specs 027→032, rama
> `feature/actividades-modelo-capas`). Depende de **spec-027**, **spec-028** y
> **spec-029** (`[DONE]`). Es **el spec de mayor impacto del paquete**: cambia lo
> que el usuario ve en casi todas las vistas.

## Contexto

Hoy `Activity` tiene una sola fecha, `dueDate`, y con ella responde dos
preguntas distintas que no son la misma: **"¿cuándo vence?"** y **"¿desde cuándo
puedo empezar?"**. Al colapsarlas, todo lo que el usuario no puede tocar todavía
—porque depende de una fecha, de un trámite, de que llegue el mes que viene—
igual aparece hoy en Backlog y en las vistas activas, compitiendo por atención
con lo que sí es accionable.

Esa es exactamente la separación entre **Capa 1** (diferido: existe, no es
accionable ahora) y **Capa 2** (accionable ahora) que estructura todo este
paquete. `deferUntil` es el campo que la materializa: mientras no llegue esa
fecha, la actividad **desaparece de las vistas activas**, sin desaparecer del
sistema.

## Alcance

### Incluye

Un campo `deferUntil` (fecha) en `Activity` y el filtrado consecuente en las
consultas del backend, más el control en la UI para diferir una actividad.

### Semántica (decisión ya tomada por el usuario)

- Mientras **`deferUntil > hoy`**, la actividad queda **oculta de todas las
  vistas activas** (Hoy, Mañana, Semana, Vencidas, Backlog). No aparece en
  ninguna, ni siquiera si su `dueDate` ya venció.
- El día en que **`deferUntil <= hoy`**, la actividad **reaparece por sí sola**,
  sin ninguna acción del usuario y sin ningún job: entra en Backlog o en Hoy
  según lo que diga su `dueDate`, con las reglas de siempre. `deferUntil` deja
  de tener efecto: **no altera** dónde aparece, solo **cuándo empieza a
  aparecer**.
- **`deferUntil: null` = comportamiento idéntico al actual.** Compatibilidad
  total: toda la base de datos existente queda en `null` y nada cambia para ella.
- La comparación es siempre **contra hoy**, no contra la ventana de cada vista.
  Una actividad diferida hasta el jueves **no** aparece hoy en la vista Semana
  aunque el jueves caiga dentro de esa semana. Alternativa evaluada y
  descartada: comparar contra el fin de la ventana de cada consulta — se
  descarta porque rompe la regla mental del usuario ("si está diferida, no la
  veo") y hace que la misma tarea aparezca o no según la vista.
- **Diferir no es posponer:** cambiar `deferUntil` **no** incrementa
  `postponementCount` (spec-028). Son dos señales distintas y se miden por
  separado.

### Vistas y consultas afectadas (detalle exacto)

Se agrega la **misma condición** a las consultas de las vistas activas:

```
AND (activity.deferUntil IS NULL OR activity.deferUntil <= :today)
```

donde `:today` es la fecha de calendario local de hoy en formato `YYYY-MM-DD`
(ver "Tipo de columna" más abajo).

| Método (`activities.service.ts`) | Vista / endpoint | ¿Cambia? | Detalle |
|---|---|---|---|
| `findToday()` (~399) | Hoy — `GET /activities/today` | **Sí** | Se agrega un tercer `andWhere` con la condición, **fuera** del paréntesis `(dueDate BETWEEN…) OR (scheduledForToday…)`: el filtro de diferidas aplica a las dos ramas |
| `findTomorrow()` (~416) | `GET /activities/tomorrow` (usada por el MCP) | **Sí** | Se agrega la condición comparando contra **hoy**, no contra mañana |
| `findThisWeek()` (~434) | Semana — `GET /activities/this-week` | **Sí** | Se agrega la condición comparando contra **hoy** |
| `findOverdue()` (~455) | Vencidas — `GET /activities/overdue` | **Sí** | Se agrega la condición. Consecuencia intencional: **una tarea vencida pero diferida no aparece en Vencidas** — es justo el objetivo de diferir |
| `findWithoutProject()` (~392) | **Backlog** — `GET /activities/without-project` (la vista Backlog del frontend consume este endpoint vía `useBacklogActivities`) | **Sí** | Se agrega la condición. Nótese que hoy este método **no** filtra `isTemplate`; ese comportamiento **no se toca** en este spec |
| `findByMonth()` (~520) | Cronograma (spec-025) — `GET /activities/schedule` | **No** | El calendario es una vista de planificación, no de ejecución: ya muestra las completadas (atenuadas) en lugar de ocultarlas. Una tarea diferida sigue ocupando su fecha en el calendario. **Ver "Decisiones a confirmar"** |
| `findByProject()` (~385) | Detalle de proyecto | **No** | Vista explícita de un contenedor: ocultar tareas ahí haría que el proyecto "perdiera" trabajo sin explicación |
| `findSubtasks()` (~560) | Subtareas de una actividad | **No** | Misma razón |
| `findAll()`, `search()`, `findByPriority()`, `findByStatus()` | Listados y búsqueda explícitos | **No** | El usuario pidió el dato explícitamente; ocultarlo sería mentir |

- **`findActiveTemplates()` y `recurrence-scheduler.service.ts` no cambian.** La
  generación de instancias recurrentes es independiente de `deferUntil`.
- **`buildInstanceFromTemplate()`:** las instancias generadas nacen con
  `deferUntil: null` (no se hereda de la plantilla). Diferir una plantilla
  recurrente afectaría a la plantilla, no a sus instancias ya materializadas.

### Lo que NO incluye

- **No incluye la vista/filtro "Diferidas"** que permitiría ver lo oculto. El
  usuario la mencionó como trabajo futuro; este spec solo garantiza que el campo
  y el filtrado la hagan posible después (el dato está, y basta invertir la
  condición). **No la diseñes ni la implementes aquí.**
- **No agrega ningún indicador de "tienes N tareas diferidas"** ni notificación
  de reaparición.
- **No agrega validación cruzada** entre `deferUntil` y `dueDate` (ver
  "Decisiones a confirmar").
- **No cambia `postponementCount`** ni ninguna regla de spec-028.
- **No toca `scheduledForToday`** — eso es spec-031, el spec siguiente.
- **No incluye `size`**: fuera de alcance de todo el paquete 027–032.

## Impacto en el sistema

### Backend (`backend/src/`)

| Archivo | Cambio |
|---|---|
| `activities/entities/activity.entity.ts` | Nueva columna `deferUntil: string \| null` (`date`, nullable) |
| `activities/dto/create-activity.dto.ts` | Nueva prop opcional `deferUntil` con `@IsDateString()` + `@IsOptional()`, nullable para poder limpiarla |
| `activities/activities.service.ts` | Nuevo helper privado que devuelve la fecha local de hoy como `YYYY-MM-DD` — **ya existe** `toDateOnlyString()` (~495) y debe reutilizarse; agregar la condición a `findToday`, `findTomorrow`, `findThisWeek`, `findOverdue` y `findWithoutProject`; `buildInstanceFromTemplate()` fija `deferUntil: null`; nuevo método `findDeferred(pagination, projectId?)` (actividades con `deferUntil` no nulo y `> hoy`, orden `deferUntil ASC`) que respalda la tool MCP `get_deferred_activities` |
| `activities/activities.controller.ts` | Nuevo endpoint **`GET /activities/deferred`** (paginación + `?projectId=` opcional) → `findDeferred()`, mismo patrón que `GET /activities/without-project`. Es el endpoint REST que envuelve la tool MCP; sin él, `get_deferred_activities` no tendría dónde apoyarse |
| `activities/activities.service.spec.ts` | Casos unitarios de las cinco consultas afectadas y de `findDeferred()` |
| `migrations/1787000000003-AddDeferUntilToActivities.ts` | **Nueva migración** |

**Tipo de columna: `date` (fecha de calendario), no `timestamptz`.** Motivos:

- Diferir es una decisión de **día**, no de instante ("no lo veas hasta el 3").
- Es el mismo tipo que `instanceDate`, y evita el bug de promoción de tipos
  documentado en spec-025: al comparar un `date` con un `timestamptz` construido
  desde medianoche local, Postgres promueve usando la **zona de sesión** (UTC) y
  el resultado se corre un día en los bordes. Comparando `date` contra strings
  `YYYY-MM-DD` construidos con campos **locales** (`toDateOnlyString()`), la
  comparación es puramente de calendario e inmune a la zona horaria.

### Base de datos

**Migración `1787000000003-AddDeferUntilToActivities.ts`** — **agrega** columna:

- `up()`: `ALTER TABLE "activities" ADD COLUMN "deferUntil" date`
  (nullable, **sin default**).
- `down()`: `ALTER TABLE "activities" DROP COLUMN "deferUntil"`.
- **Sin backfill**: todas las actividades existentes quedan en `null`, es decir,
  con comportamiento idéntico al actual. Es la garantía de compatibilidad total.

### Frontend (`frontend/src/`)

| Archivo | Cambio |
|---|---|
| `types/index.ts` | `deferUntil: string \| null` en `Activity`; `deferUntil?: string \| null` en `CreateActivityDto` |
| `components/ActivityForm.tsx` | Nuevo campo de fecha "Diferir hasta" junto a "Fecha límite", con texto de ayuda explicando que la actividad no aparecerá hasta esa fecha; permitir limpiarlo (enviar `null`) |
| `components/ActivityCard.tsx` | Mostrar un indicador "Diferida hasta {fecha}" cuando `deferUntil` tenga valor **y sea futura**. Es visible en las vistas donde la actividad sí aparece (detalle de proyecto, búsqueda, cronograma) |
| `pages/TodayView.tsx`, `WeekView.tsx`, `OverdueView.tsx`, `BacklogView.tsx` | **Sin cambios de lógica**: el filtrado ocurre en el backend. Solo verificar que los estados vacíos (`EmptyState`) siguen teniendo sentido cuando la lista queda vacía porque todo está diferido |
| `hooks/useActivities.ts` | **Sin query keys nuevas.** Las mutations ya invalidan `['activities']` completo, así que diferir una actividad refresca Hoy/Semana/Vencidas/Backlog automáticamente |
| `services/activities.service.ts` | Sin cambios: `deferUntil` viaja en los DTO existentes |

> **Leer `frontend/DESIGN.md` antes de tocar `ActivityForm` y `ActivityCard`.**
> El indicador de "diferida" debe salir de los tokens existentes; si hiciera
> falta un token nuevo, se propone aparte y no se da por aprobado aquí.

### MCP (`backend/src/mcp/mcp.service.ts`) y system prompts

- `create_activity` y `update_activity`: nuevo parámetro `deferUntil`
  (nullable en `update_activity`, para poder "des-diferir").
- `create_recurring_activity`: evaluar si acepta `deferUntil` — dado que las
  instancias no lo heredan, probablemente **no** deba exponerlo.
- Tools de consulta (`get_today_activities`, `get_tomorrow_activities`,
  `get_this_week_activities`, `get_overdue_activities`,
  `get_activities_without_project`): **su salida cambia** — dejan de devolver
  actividades diferidas. El system prompt debe explicarlo para que el agente no
  concluya que una tarea "no existe" cuando solo está diferida, y para que sepa
  que `list_activities` / `search_activities` sí las siguen viendo.
- Evaluar una forma de que el agente consulte lo diferido (p. ej. un flag en
  `list_activities`) **sin** crear la vista "Diferidas" del frontend.

## Evaluación MCP

**¿Aplica MCP?** **Sí.** `deferUntil` oculta actividades de las vistas
activas, y esas vistas tienen tools MCP equivalentes. El filtro vive en el
servicio (mismo patrón que `findToday`/`findThisWeek`/`findOverdue`), así que
las tools lo heredan automáticamente sin cambio de schema — pero el
comportamiento debe documentarse explícitamente para que el agente no se
sorprenda con actividades "desaparecidas".

- **MCP existente a modificar:** `todo-api`.

**Tools a modificar:**

| Tool | Cambio |
|---|---|
| `create_activity` | Agregar `deferUntil: z.string().optional().describe('Defer this activity: hidden from active views until this date (ISO 8601)')` |
| `update_activity` | Agregar `deferUntil: z.string().nullable().optional().describe('Set or clear (null) the defer date')` |
| `get_today_activities`, `get_tomorrow_activities`, `get_this_week_activities`, `get_overdue_activities`, `get_activities_without_project` | Sin cambio de schema Zod (el filtro vive en el servicio) — solo actualizar su descripción textual para que el agente sepa que excluyen diferidas |
| `list_activities`, `search_activities`, `get_activities_by_priority`, `get_activities_by_status` | **No** filtran por `deferUntil` — son consultas de propósito general, no las "vistas activas" (Hoy/Semana/Backlog) que sí lo hacen. Mismo criterio que la tabla de vistas afectadas del spec |
| `create_recurring_activity` | **No** expone `deferUntil` — las instancias no lo heredan de la plantilla (nacen siempre en `null`) |

**Tools a crear:** `get_deferred_activities` — se crea **en este mismo spec**, aunque la vista "Diferidas" de UI quede fuera de alcance. Sin ella, un agente no tiene forma de consultar qué hay oculto ni de avisar "tienes 3 actividades diferidas hasta la próxima semana". Costo bajo (mismo patrón que `get_overdue_activities`, sin dependencia de UI). Input: paginación estándar + `projectId` opcional. Output: actividades con `deferUntil` no nulo y `deferUntil > hoy`, ordenadas por `deferUntil ASC`.

**System prompt afectado:** `docs/mcps/asistente-personal.system-prompt.md` — agregar `deferUntil` a "Campos comunes"; agregar fila `get_deferred_activities` a la tabla de tools; anotar en `get_today_activities`/`get_this_week_activities`/`get_activities_without_project`/`get_overdue_activities` que excluyen diferidas; agregar flujo "¿Qué tengo diferido?" → `get_deferred_activities`; agregar regla de comportamiento: si el agente no encuentra una actividad esperada en las vistas activas, considerar que podría estar diferida antes de asumir que no existe.

**Fase de MCP en este spec:** Fase 4 (ya reflejada abajo).

## Fases de implementación

### Fase 1 — Backend: modelo y DTO
- [x] `activity.entity.ts`: columna `deferUntil` (`date`, nullable)
- [x] `create-activity.dto.ts`: prop opcional `deferUntil` validada como fecha
- [x] `buildInstanceFromTemplate()`: `deferUntil: null` en las instancias
- [x] `npm run build` y `npm run lint` en `backend/` — build limpio (lint se
      valida al cierre de la Fase 2, junto con el resto de los cambios del
      servicio)

### Fase 2 — Backend: filtrado de vistas activas
- [x] Helper de "hoy" como `YYYY-MM-DD` local, reutilizando `toDateOnlyString()`
      — nuevo `notDeferredCondition()` que arma la condición `AND (deferUntil
      IS NULL OR deferUntil <= :todayDateOnly)` compartida por las 5 vistas
- [x] `findToday()`: agregar la condición **fuera** del paréntesis OR existente
- [x] `findTomorrow()`: agregar la condición (contra **hoy**)
- [x] `findThisWeek()`: agregar la condición (contra **hoy**)
- [x] `findOverdue()`: agregar la condición
- [x] `findWithoutProject()` (Backlog): agregar la condición
- [x] Verificar explícitamente que `findByMonth()`, `findByProject()`,
      `findSubtasks()`, `findAll()` y `search()` **no** quedaron filtrados —
      confirmado por lectura directa, ninguno de los 5 fue tocado
- [x] Agregar `findDeferred(pagination, projectId?)` y el endpoint
      `GET /activities/deferred` en el controlador (`DeferredActivitiesQueryDto`
      nuevo, mismo patrón que `SearchActivitiesQueryDto`)
- [x] `npm run build` y `npm run lint` en `backend/` — build limpio; lint
      scoped sin hallazgos nuevos (los 3 errores en `create-activity.dto.ts`
      son preexistentes, ya confirmados en spec-027)

### Fase 3 — Migración
- [x] Crear `migrations/1787000000003-AddDeferUntilToActivities.ts`
- [x] Ejecutar en local y verificar que todas las filas existentes quedan en
      `null` — confirmado: 89/89 actividades con `deferUntil` nulo
- [x] Comprobar en local que ninguna vista cambió su contenido tras migrar
      (compatibilidad total) — con `deferUntil` nulo en todas las filas, la
      condición `deferUntil IS NULL OR deferUntil <= hoy` es verdadera para
      las 89, por lo que el filtro es matemáticamente un no-op; verificado
      también que las 5 vistas responden sin error (today: 0, tomorrow: 0,
      this-week: 0, overdue: 3, without-project: 18) y que `GET
      /activities/deferred` devuelve `[]` (sin datos diferidos aún)

### Fase 4 — MCP: actualizar `todo-api`
- [x] Agregar `deferUntil` a `create_activity` y `update_activity`
- [x] `create_recurring_activity` **no** expone `deferUntil` (las instancias nacen en `null`)
- [x] Agregar el método de servicio `findDeferred()` (actividades con `deferUntil` no nulo y `> hoy`, `projectId` opcional, orden `deferUntil ASC`) — hecho en Fase 2
- [x] Crear la tool `get_deferred_activities` (paginación + `projectId` opcional)
- [x] Actualizar descripciones de las tools de consulta afectadas
- [x] Actualizar `docs/mcps/asistente-personal.system-prompt.md` — campo en
      "Campos comunes", 6 filas de tabla actualizadas, regla de
      comportamiento y 2 flujos frecuentes nuevos
- [x] Actualizar `docs/mcps/README.md` — sin cambios necesarios (no enumera
      tools individuales)
- [x] Verificar que el MCP responde correctamente a las herramientas
      declaradas — backend local: `tools/list` confirma `get_deferred_activities`
      presente, `deferUntil` en `create_activity`/`update_activity`, ausente
      en `create_recurring_activity`; smoke test funcional: actividad creada
      con `deferUntil` mañana aparece en `get_deferred_activities`

### Fase 5 — Frontend
- [x] Leer `frontend/DESIGN.md`
- [x] `types/index.ts`: `deferUntil` en `Activity` y `CreateActivityDto`
- [x] `ActivityForm.tsx`: campo "Diferir hasta" + ayuda + limpieza a `null`
      (junto a "Fecha límite", limpiar el input envía `null`)
- [x] `ActivityCard.tsx`: indicador "Diferida hasta {fecha}" — bug evitado en
      el camino: `fmt()` usa `new Date(string)`, que interpreta un `date`
      puro (`YYYY-MM-DD`) como medianoche UTC y corre el día un lugar atrás
      en timezones negativos (mismo bug ya documentado en `lib/calendar.ts`
      para spec-025); se agregó `fmtDateOnly()` con parseo local para
      evitarlo
- [x] Revisar los `EmptyState` de Hoy / Semana / Vencidas / Backlog — los
      cuatro mensajes siguen siendo ciertos aunque la vista esté vacía por
      diferimiento; sin cambios necesarios
- [x] `npm run lint` y `npm run build` en `frontend/` — ambos limpios

### Fase 6 — Pruebas
- [x] `docs/testing/test-030-defer-until.md` con casos `TC-030-xx` y `TC-MCP-030-xx`
      (redactado junto con el spec; pendiente de ejecución manual por el usuario)
- [x] `backend/test/e2e-030-defer-until.e2e-spec.ts` — 25/26 en verde (1 skip
      condicional, `itUnlessSunday`, no es una falla). Se corrigieron 3
      desajustes reales del archivo (no de la implementación): el helper
      `createActivity()` seguía enviando `type: 'task'` (eliminado en
      spec-027) y un caso enviaba `isRecurring: true` (también eliminado),
      ambos causaban 400 en cascada sobre casi toda la suite; y faltaba el
      caso de `postponementCount` que el propio archivo documentaba como
      pendiente por spec-028 no estar `[DONE]` al redactarlo — ya lo está,
      se agregó el caso
- [x] Casos unitarios de las cinco consultas en `activities.service.spec.ts` —
      15/15 en verde. Se corrigieron 2 desajustes reales del archivo: el
      nombre del parámetro ligado esperado era `:today`, no `:todayDateOnly`
      (renombrado en la implementación para alinear); y un `it()` de
      `findToday()` no invocaba `service.findToday()` antes de inspeccionar
      los parámetros de la query, dejando el mock vacío
- [x] Registrar en `spec/backlog.md` que `findWithoutProject()` (Backlog) no
      excluye `isTemplate = true`, a diferencia de las demás vistas activas
      (hallazgo preexistente, no corregido en este spec)
- [x] Ejecutar `npm run test` y `npm run test:e2e` en verde (`@tester`) —
      sin regresiones fuera de alcance (los 11 fallos restantes de la suite
      completa son de specs 031/032, aún no implementados)

## Criterios de aceptación

- Una actividad con `deferUntil` **futura** no aparece en `GET /activities/today`,
  `/tomorrow`, `/this-week`, `/overdue` ni `/without-project`.
- Esa misma actividad **sí** aparece en `GET /activities`, en
  `GET /activities/search/:query`, en `GET /activities/project/:id` y en
  `GET /activities/schedule`.
- Una actividad con `deferUntil` **igual a hoy** aparece con normalidad en todas
  las vistas activas que le correspondan por `dueDate`.
- Una actividad con `deferUntil` **pasada** se comporta exactamente como una con
  `deferUntil: null`.
- Una actividad **vencida** (`dueDate` pasado) con `deferUntil` futura **no**
  aparece en Vencidas; al llegar `deferUntil`, aparece.
- Una actividad diferida hasta un día de esta semana **no** aparece hoy en la
  vista Semana.
- `deferUntil: null` en un `PATCH` limpia el diferimiento y la actividad
  reaparece de inmediato.
- Todas las actividades preexistentes a la migración quedan con
  `deferUntil: null` y ninguna vista cambia su contenido respecto de antes.
- Cambiar `deferUntil` **no** modifica `postponementCount` (spec-028).
- Las instancias generadas por una plantilla recurrente nacen con
  `deferUntil: null`, aunque la plantilla esté diferida.
- El agente puede invocar `update_activity` con `deferUntil` y comprobar que
  `get_today_activities` deja de devolver esa actividad.
- `get_deferred_activities` devuelve esa misma actividad, ordenada por
  `deferUntil ASC`, y deja de devolverla una vez pasada la fecha.

## Pruebas asociadas

- **Manuales:** `docs/testing/test-030-defer-until.md` — casos `TC-030-xx`
  (diferir desde el formulario; verificar desaparición en Hoy, Semana, Vencidas
  y Backlog; verificar presencia en detalle de proyecto, búsqueda y cronograma;
  reaparición al limpiar `deferUntil`; indicador en la card) y `TC-MCP-030-xx`.
  Los casos con fecha "que llega" se preparan por API creando actividades con
  `deferUntil` = ayer / hoy / mañana, en lugar de esperar al día siguiente.
- **Automáticas (backend):** `backend/test/e2e-030-defer-until.e2e-spec.ts` +
  casos unitarios en `backend/src/activities/activities.service.spec.ts`.

## Decisiones ya resueltas (criterio de menor riesgo, ver justificación)

1. **Cronograma (`findByMonth`, spec-025): no oculta las diferidas.** Es una
   vista de planificación, no de ejecución — ya muestra las completadas
   (atenuadas) en vez de ocultarlas; una tarea diferida sigue ocupando su fecha
   ahí, con el mismo criterio.
2. **Backlog y plantillas: no se toca en este spec.** `findWithoutProject()`
   hoy no excluye `isTemplate = true`, a diferencia de las demás vistas
   activas — es un comportamiento preexistente, ajeno al alcance de
   `deferUntil`. Se registra como hallazgo en `spec/backlog.md` al cerrar la
   Fase 6 (pruebas), sin corregirlo aquí.
3. **Sin validación cruzada `deferUntil` vs `dueDate`.** Un `deferUntil`
   posterior al `dueDate` es raro pero legítimo ("no lo mires hasta después de
   que venza"); una validación estricta produciría errores 400 en flujos
   válidos.
4. **Diferidas y `status`: independientes.** Una actividad diferida puede
   estar `completed` (se oculta por ambas razones a la vez). No se agrega
   ninguna regla que cambie `status` al diferir.

## Aprobación de implementación

> Claude no escribe código de implementación hasta que esta sección esté marcada.
- [x] Paquete (spec + pruebas) aprobado por el usuario
- **Fecha de aprobación:** 2026-08-17

## Cierre de la ronda de pruebas (2026-08-16)

- **Manuales:** 13/15 casos aprobados. `TC-030-002` diferido (hoy cayó
  domingo, sin día válido "de esta semana + futuro"). `TC-030-010` diferido
  (el cron diario no corrió durante la ventana de la ronda). `TC-MCP-030-004`
  falló inicialmente en su criterio 2 (`create_recurring_activity` no
  rechazaba `deferUntil`, lo descartaba en silencio por falta de `.strict()`
  en su schema Zod) — **corregido y re-verificado en verde**, ver más abajo.
  Detalle completo en `docs/testing/test-030-defer-until.md`.
- **Fix aplicado (2026-08-17):** `backend/src/mcp/mcp.service.ts` —
  `create_activity` y `create_recurring_activity` migradas de `server.tool()`
  (shape Zod crudo) a `server.registerTool()` con `z.object({...}).strict()`,
  para que rechacen explícitamente parámetros no declarados en vez de
  descartarlos en silencio. Alcance quirúrgico aprobado por el usuario:
  solo estas dos tools (las probadas como rotas); el resto de tools de
  escritura de `mcp.service.ts` (~30) puede tener el mismo gap latente, sin
  confirmar — registrado en `spec/backlog.md` como candidato a una pasada
  sistémica futura, fuera de alcance de este spec. `TC-MCP-030-004`
  re-ejecutado tras el fix: ahora responde `MCP error -32602` como se
  esperaba originalmente.
- **Automáticas:** confirmadas por `@tester` tras el fix — unit 105/105,
  e2e 151/154 (incluye `e2e-027`, único archivo que ejercita
  `create_activity`/`create_recurring_activity` vía MCP), sin fallos nuevos.
  Únicos 2 fallos de la suite completa son preexistentes y no relacionados
  (`app.e2e-spec.ts`, `auth.e2e-spec.ts` TC-014).
- Hallazgo adicional (no bloqueante, ya en `spec/backlog.md`): el
  `EmptyState` de Hoy/Semana/Vencidas/Backlog no distingue "vacío de
  verdad" de "todo diferido" — es un hallazgo de copy, no de lógica, sin
  corregir en esta sesión.
- Datos de prueba de la ronda eliminados y verificados `404` por API.
- Spec marcado como `[DONE]`.
