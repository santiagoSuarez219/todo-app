# spec-030 — [NOT STARTED] Diferir actividades: `deferUntil`

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
| `activities/activities.service.ts` | Nuevo helper privado que devuelve la fecha local de hoy como `YYYY-MM-DD` — **ya existe** `toDateOnlyString()` (~495) y debe reutilizarse; agregar la condición a `findToday`, `findTomorrow`, `findThisWeek`, `findOverdue` y `findWithoutProject`; `buildInstanceFromTemplate()` fija `deferUntil: null` |
| `activities/activities.service.spec.ts` | Casos unitarios de las cinco consultas |
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
- [ ] `activity.entity.ts`: columna `deferUntil` (`date`, nullable)
- [ ] `create-activity.dto.ts`: prop opcional `deferUntil` validada como fecha
- [ ] `buildInstanceFromTemplate()`: `deferUntil: null` en las instancias
- [ ] `npm run build` y `npm run lint` en `backend/`

### Fase 2 — Backend: filtrado de vistas activas
- [ ] Helper de "hoy" como `YYYY-MM-DD` local, reutilizando `toDateOnlyString()`
- [ ] `findToday()`: agregar la condición **fuera** del paréntesis OR existente
- [ ] `findTomorrow()`: agregar la condición (contra **hoy**)
- [ ] `findThisWeek()`: agregar la condición (contra **hoy**)
- [ ] `findOverdue()`: agregar la condición
- [ ] `findWithoutProject()` (Backlog): agregar la condición
- [ ] Verificar explícitamente que `findByMonth()`, `findByProject()`,
      `findSubtasks()`, `findAll()` y `search()` **no** quedaron filtrados

### Fase 3 — Migración
- [ ] Crear `migrations/1787000000003-AddDeferUntilToActivities.ts`
- [ ] Ejecutar en local y verificar que todas las filas existentes quedan en `null`
- [ ] Comprobar en local que ninguna vista cambió su contenido tras migrar
      (compatibilidad total)

### Fase 4 — MCP: actualizar `todo-api`
- [ ] Agregar `deferUntil` a `create_activity` y `update_activity`
- [ ] `create_recurring_activity` **no** expone `deferUntil` (las instancias nacen en `null`)
- [ ] Agregar el método de servicio `findDeferred()` (actividades con `deferUntil` no nulo y `> hoy`, `projectId` opcional, orden `deferUntil ASC`)
- [ ] Crear la tool `get_deferred_activities` (paginación + `projectId` opcional)
- [ ] Actualizar descripciones de las tools de consulta afectadas
- [ ] Actualizar `docs/mcps/asistente-personal.system-prompt.md`
- [ ] Actualizar `docs/mcps/README.md`
- [ ] Verificar que el MCP responde correctamente a las herramientas declaradas

### Fase 5 — Frontend
- [ ] Leer `frontend/DESIGN.md`
- [ ] `types/index.ts`: `deferUntil` en `Activity` y `CreateActivityDto`
- [ ] `ActivityForm.tsx`: campo "Diferir hasta" + ayuda + limpieza a `null`
- [ ] `ActivityCard.tsx`: indicador "Diferida hasta {fecha}"
- [ ] Revisar los `EmptyState` de Hoy / Semana / Vencidas / Backlog
- [ ] `npm run lint` y `npm run build` en `frontend/`

### Fase 6 — Pruebas
- [ ] `docs/testing/test-030-defer-until.md` con casos `TC-030-xx` y `TC-MCP-030-xx`
- [ ] `backend/test/e2e-030-defer-until.e2e-spec.ts` en rojo
- [ ] Casos unitarios de las cinco consultas en `activities.service.spec.ts`
- [ ] Registrar en `spec/backlog.md` que `findWithoutProject()` (Backlog) no
      excluye `isTemplate = true`, a diferencia de las demás vistas activas
      (hallazgo preexistente, no corregido en este spec)
- [ ] Ejecutar `npm run test` y `npm run test:e2e` en verde (`@tester`)

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
- [ ] Paquete (spec + pruebas) aprobado por el usuario
- **Fecha de aprobación:** {{fecha}}
