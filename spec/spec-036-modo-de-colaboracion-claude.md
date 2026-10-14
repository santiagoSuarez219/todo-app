# spec-036 — [DONE] Modo de colaboración con Claude: campo `mode` en actividades

> Estado inicial obligatorio: `[NOT STARTED]`.
> Actualizar a `[IN PROGRESS]`, `[TESTING]` o `[DONE]` según avance.

> Sigue el patrón de los specs 030 (`deferUntil`), 032 (`waiting`) y 034
> (filtros del listado). **Solo cubre la Fase 1 de la propuesta original**
> (`mode`); `context` y delegación quedan fuera (ver "Lo que NO incluye").

## Contexto

El asistente asigna trabajo según el **modo de colaboración con Claude Code**:
autónomo, co-work autónomo (asíncrono) o co-work. Hoy ese dato vive como
etiqueta en el título (`[A]`, `[CA]`, `[C]`), lo que:

- ensucia el título,
- no se puede filtrar ni consultar,
- se pierde si la actividad se renombra.

Se necesita un campo propio, expuesto en REST, MCP y UI.

## Alcance

### Incluye

- Campo `mode` en `Activity`: enum nullable `autonomous` · `cowork_async` ·
  `cowork`. `null` = sin Claude (trabajo propio).
- Migración con columna nullable, **sin backfill**.
- Aceptar `mode` en crear/actualizar (REST y MCP: `create_activity`,
  `update_activity`, `create_recurring_activity`); `null` en update limpia.
- `mode` en todas las respuestas de actividad (la entidad se serializa
  completa; no hay mapper que tocar).
- Propagación de `mode` de plantilla recurrente a instancias.
- Tool MCP nueva `get_activities_by_mode` (+ endpoint REST que la respalda).
- `byMode` en `get_activities_summary` / `GET /activities/summary`.
- Filtro por `mode` en el listado y el summary (necesario para filtrar en la UI
  del lado del servidor; ver D4).
- Frontend: chip del modo en la card, selector en el formulario y filtro de
  modo en Dashboard y ProjectDetail.
- Guía en el system prompt del asistente, incluida la regla de `testing`.

### Decisiones de diseño

- **Subtareas no heredan `mode`.** Una fase puede ser autónoma y otra co-work.
  Es el comportamiento actual (el `create()` con `parentId` no hereda nada);
  solo se cubre con prueba.
- **Sin validación cruzada con `status`.** `autonomous` + `waiting` está
  permitido (esperando insumo para poder delegar), igual que cualquier otra
  combinación. Las convenciones se advierten, no se imponen.
- **Propagación a plantillas: no es comportamiento nuevo.** `update()` de una
  plantilla ya copia `name`, `description`, `priority` y `energy` a las
  instancias futuras `pending` (`instanceDate > hoy`); `buildInstanceFromTemplate()`
  copia los campos al generar. `mode` se suma a ambos puntos. Limpiar `mode`
  (null) en la plantilla lo limpia en esas instancias.
  **Límite conocido:** la propagación pisa `mode` editados a mano en
  instancias futuras pendientes (igual que `priority`/`energy`) y no toca la
  instancia de hoy ni las completadas.
- **`testing` sin cambios de backend.** Es el destino natural del trabajo
  autónomo terminado ("hecho por Claude, falta que Santiago verifique"). Solo
  se documenta en el system prompt: el asistente nunca pasa trabajo autónomo
  directo a `completed`.
- **Semántica de `get_activities_by_mode` (nueva).** `get_activities_by_status`
  y `get_activities_by_priority` **no** aplican exclusiones, así que no hay
  precedente exacto. Se define: `mode = :mode`, `isTemplate = false`,
  no diferidas (`notDeferredCondition()`) y `status IN (pending, in_progress,
  testing, waiting, on_hold)` por defecto (lista explícita, mismo criterio que
  el filtro "Activas" de spec-034). Si llega `status`, sustituye esa lista.

### Propuestas por confirmar (marcadas por `@architect`)

Se redactó el spec con la **recomendación** de cada una; el usuario puede
revertirlas antes de aprobar.

- **D1 — Centinela `none`.** El parámetro de consulta `mode` (listado, summary
  y `get_activities_by_mode`) admite `none` ⇒ `mode IS NULL` ("Sin Claude").
  No es valor del enum de la entidad. Sin esto la UI no puede filtrar "trabajo
  propio".
- **D2 — Subtareas en `get_activities_by_mode`.** Se **incluyen** como filas:
  `mode` es explícito y no se hereda, así que una subtarea `autonomous` es
  trabajo delegable. (El default de `list_activities` las excluye.)
- **D3 — `byMode`.** Se cuenta sobre el mismo conjunto que `byStatus` (todos
  los estados), claves `autonomous`, `cowork_async`, `cowork`, `none`, siempre
  presentes; invariante `sum(byMode) = total` (como en spec-034).
- **D4 — Ampliación derivada.** Filtrar en la UI exige `mode` en
  `ListActivitiesQueryDto` y `ActivitiesSummaryQueryDto`; esto arrastra
  `list_activities`, `get_activities_by_project` y `get_activities_summary`
  del MCP (los schemas Zod deben reflejar el DTO). Un filtro del lado del
  cliente reintroduciría el bug de paginación/badges de spec-034.
- **D5 — Diseño.** `DESIGN.md` no tiene tokens para modos y la paleta de
  estados está agotada. Se propone un chip con borde e **ícono distinto por
  modo** (patrón del chip "Auto"/`HorizonBadge`), sin tokens nuevos.
  Cualquier color o token nuevo se aprueba aparte.
- **D6 — Edición inline del modo en la card:** **fuera** (opcional futuro).
- **D7 — `GET /activities/mode/:mode`** se crea solo para respaldar la tool
  (antecedente: spec-030); el frontend no lo consume.

### Lo que NO incluye

- **Fase 2 — `context`** (`deep` · `screen_light` · `phone` · `audio`) y la
  tool `get_activities_for_context`: se redactará como spec aparte si se
  aprueba.
- **Fase 3 — `delegationPath` / `lastRunAt`:** solo si el uso lo justifica
  tras un mes; mientras tanto el asistente guarda esa línea en `description`.
- **El script único** que migra las etiquetas `[A]/[CA]/[C]` del título al
  campo y limpia el título: lo ejecuta el asistente, fuera de este spec.
- Corregir la deuda de documentación hallada (ver "Deuda detectada"): solo se
  registra en `spec/backlog.md`.
- El gap de `.strict()` en `update_activity` (ya en backlog).

## Impacto en el sistema

- **Backend** (`backend/src/`):
  - `common/enums/activity-mode.enum.ts` (nuevo).
  - `activities/entities/activity.entity.ts`, `dto/create-activity.dto.ts`
    (update lo hereda por `PartialType`), `dto/list-activities-query.dto.ts`,
    `dto/activities-summary-query.dto.ts`, `dto/activities-by-mode-query.dto.ts`
    (nuevo).
  - `activities/activities.service.ts`: `create`, `update` (whitelist campo por
    campo: si `mode` no se añade ahí se pierde en silencio), propagación,
    `buildInstanceFromTemplate`, `applyListFilters`, `getSummary`, nuevo
    `findByMode`.
  - `activities/activities.controller.ts`: `GET /activities/mode/:mode`
    (declarado **antes** de `@Get(':id')`).
  - `mcp/mcp.service.ts`.
- **Frontend** (`frontend/src/`): `types/index.ts`, `components/ModeBadge.tsx`
  (nuevo), `components/ActivityModeFilter.tsx` (nuevo), `lib/activityModeFilters.ts`
  (nuevo), `ActivityCard.tsx`, `ActivityForm.tsx`, `pages/Dashboard.tsx`,
  `pages/ProjectDetail.tsx`; verificar `services/activities.service.ts` y
  `hooks/useActivities.ts` (las query keys ya incluyen `params`).
- **Base de datos:** migración `1787100000001-AddModeToActivities.ts`: tipo
  nativo `activities_mode_enum` + columna `mode` nullable, sin default ni
  backfill. Aditiva y no destructiva; aun así se ensaya en rama de Neon antes
  del despliegue (producción es Postgres 18, local 16).

## Evaluación MCP

**¿Aplica MCP?** Sí — cumple los cuatro criterios (dato nuevo a consultar,
acción nueva a ejecutar, dominio relacionado existente, system prompt a
actualizar).

- **MCP existente a modificar:** `todo-api`.
  - `create_activity` y `create_recurring_activity` usan `.strict()`: sin
    `mode` explícito **lo rechazan** (-32602).
  - `update_activity`: `mode` nullable y opcional (`null` limpia).
  - `list_activities`, `get_activities_by_project` (`activityListFiltersSchema`)
    y `get_activities_summary`: parámetro `mode`; `byMode` en el summary.
  - **Tool nueva:** `get_activities_by_mode(mode, status?, projectId?, page, limit)`.
    La descripción declara las exclusiones por defecto.
  - El MCP llama al servicio directamente y no pasa por `ValidationPipe`: la
    única validación del enum es Zod, que debe reflejar el DTO exactamente.
- **System prompt afectado:** `docs/mcps/asistente-personal.system-prompt.md`
  (campo en "Campos comunes", regla "asignar por `mode`, no por etiqueta en el
  título", `autonomous` terminado → `testing` y nunca `completed`,
  `autonomous` + `waiting` válido, tool nueva, `byMode`, flujo "¿qué puede
  hacer Claude solo?").
- **Fase de MCP en este spec:** Fase 5 (delegada a `@mcp-builder`).

## Fases de implementación

### Fase 0 — Pruebas (se escriben junto con el spec, en rojo)
- [x] `backend/test/e2e-036-modo-de-colaboracion-claude.e2e-spec.ts`
- [x] Unit en `backend/src/activities/activities.service.spec.ts`
- [x] `docs/testing/test-036-modo-de-colaboracion-claude.md`

### Fase 1 — Backend: modelo, enum y DTOs
- [x] `activity-mode.enum.ts`: `AUTONOMOUS='autonomous'`,
      `COWORK_ASYNC='cowork_async'`, `COWORK='cowork'`.
- [x] `activity.entity.ts`: columna `mode` (`type: 'enum'`, nullable, sin default).
- [x] `create-activity.dto.ts`: `mode?: ActivityMode | null` con
      `@IsOptional()` + `@IsEnum(ActivityMode)` (`@IsOptional` deja pasar `null`).
- [x] Sin validación cruzada con `status`.

### Fase 2 — Backend: servicio y endpoint
- [x] `create()` y `update()`: añadir `mode` a la desestructuración y al
      guardado (`!== undefined` en update, para que `null` limpie).
- [x] `buildInstanceFromTemplate()`: `mode: template.mode`.
- [x] Propagación en `update()` de plantilla: `mode: saved.mode` en el `.set({...})`.
- [x] `ListActivitiesQueryDto`/`applyListFilters()`: `mode` opcional (+ `none`, D1).
- [x] `ActivitiesSummaryQueryDto`/`getSummary()`: `mode` opcional que acota los
      conteos; `byMode` siempre completo (D3).
- [x] `findByMode()` + `activities-by-mode-query.dto.ts` (extiende
      `PaginationDto`; `status?: ActivityStatus[]` con el transform
      coma→array de `ListActivitiesQueryDto`; `projectId?: UUID`).
- [x] `GET /activities/mode/:mode` con `ParseEnumPipe`, antes de `@Get(':id')`
      (el valor `none` según D1).
- [x] `npx eslint <archivos>` **sin `--fix`** (aviso de spec-034: `npm run lint`
      reformatea todo `src/`) y `npm run build`.

### Fase 3 — Migración
- [x] `1787100000001-AddModeToActivities.ts`: `up` crea el tipo y la columna;
      `down` borra la columna y luego el tipo. Comentario: sin backfill.
- [x] Ejecutar la migración y verificar la columna: aplicada sobre una base de
      desarrollo vacía en Neon (Postgres 18.6, no en local: no hay Postgres/Docker);
      las 25 migraciones corrieron y `activities.mode` queda enum nullable. Falta el
      ensayo contra una rama de producción antes del despliegue (verificar que las
      filas existentes quedan en `null`).

### Fase 4 — Frontend
> Depende de las Fases 1 y 2. Leer `frontend/DESIGN.md` y las skills
> `react-best-practices`, `react-hook-form`, `tailwind-css-patterns`,
> `accessibility` antes de escribir código de UI.
- [x] `types/index.ts`: `ActivityMode` (`as const`), `mode` en `Activity`,
      `CreateActivityDto`, `ActivityListParams`, `ActivitiesSummaryParams`;
      `byMode` en `ActivitiesSummary`.
- [x] `ModeBadge.tsx`: chip con ícono + etiqueta (`Autónomo` / `Cowork async` /
      `Cowork`); no se renderiza si `mode` es `null`.
- [x] `ActivityCard.tsx`: badge en la fila de prioridad/energía.
- [x] `ActivityForm.tsx`: `<select>` "Modo con Claude" con opción "Sin Claude"
      (vacío → `null`); inicial `initial?.mode ?? ''`; subtarea nueva arranca
      vacío. Editar una plantilla envía `mode` (dispara la propagación).
- [x] `lib/activityModeFilters.ts` + `ActivityModeFilter.tsx` (`<select>` con
      `<label>`; opciones Todos / Autónomo / Cowork async / Cowork / Sin Claude).
- [x] `Dashboard.tsx` y `ProjectDetail.tsx`: estado `modeFilter` aplicado a la
      lista **y** al summary (badges y paginación coherentes), `setPage(1)` al
      cambiar, mismo tratamiento en modo búsqueda; no tocar `statsQ` de
      `ProjectDetail`.
- [x] Confirmar que `useActivities.ts` no necesita keys nuevas.
- [x] `npm run lint` y `npm run build` en `frontend/`.

### Fase 5 — MCP: actualizar `todo-api`
> Se ejecuta antes de las pruebas e2e. Delegada a `@mcp-builder`.
- [x] Schemas Zod de `create_activity`, `create_recurring_activity`,
      `update_activity` (nullable), `activityListFiltersSchema` y
      `get_activities_summary`.
- [x] Tool nueva `get_activities_by_mode`.
- [x] Actualizar `docs/mcps/asistente-personal.system-prompt.md`.
- [x] Verificar `docs/mcps/README.md` (inventario por dominio).
- [x] Verificar `tools/list` y `TC-MCP-036-001..005` por JSON-RPC contra el backend
      (base de desarrollo en Neon, 2026-10-14; el 006 requiere al asistente).

### Fase 6 — Documentación técnica
- [x] `backend/CLAUDE.md`: `mode` en la tabla de `Activity`, enum, rutas
      (`/activities/mode/:mode`, `?mode=`), propagación de recurrencia,
      migración, tool nueva.
- [x] `frontend/CLAUDE.md`: `ActivityMode` en enums.
- [x] `frontend/DESIGN.md`: documentar `ModeBadge` si se aprueba D5.
- [x] Registrar en `spec/backlog.md` la deuda detectada (abajo).

> **Estado al cerrar la implementación (2026-10-13):** backend (`npm run build`,
> 120 unit tests, eslint sin errores en los archivos tocados) y frontend
> (`tsc -b`, eslint, `npm run build`) en verde. **No se pudo ejecutar** en el
> entorno de implementación, por no haber Postgres/Docker: la migración en
> local, los e2e (`e2e-036`) y los casos `TC-MCP-036-*` por JSON-RPC. Se
> verificó el registro de tools cargando `McpService.createServer()` con
> dependencias vacías (69 tools; `mode` en los schemas; `'foo'` rechazado).

> **Actualización (2026-10-14) — base de desarrollo en Neon (Postgres 18.6):** las 25
> migraciones, incluida `AddModeToActivities`, corrieron sobre una base vacía.
> `e2e-036` pasa (33/33) usando una copia temporal que toma `DB_*` del entorno
> (el archivo original fija `localhost`). `TC-MCP-036-001..005` pasan por
> JSON-RPC. Para ello `app.module.ts` y `data-source.ts` aceptan `DB_SSL=true`
> como alternativa a `NODE_ENV=production` para activar SSL (cambio fuera del
> alcance original, aprobado por el usuario).

### Fase 7 — Pruebas
- [x] `@tester`: `npm run test` (120/120) y `npm run test:e2e` contra la base de
      desarrollo en Neon: 15 de 17 suites en verde, incluida e2e-036 (33/33). Las 2
      que fallan (`auth.e2e-spec` TC-014, `app.e2e-spec` `/ (GET)`) no se tocaron en
      este spec y están registradas en `spec/backlog.md`.
- [x] Ronda manual de `test-036` (2026-10-14): 15 de 16 casos aprobados por el
      usuario; datos de prueba eliminados. **Excepción aprobada por el usuario:**
      `TC-MCP-036-006` (comportamiento del asistente con el system prompt) queda
      aplazado a después del despliegue, porque el MCP de producción aún no
      expone `mode`.
- [x] `@reviewer`: APROBADO sin bloqueantes (2026-10-14). Resueltos los hallazgos
      mayores: cabecera de `ProjectDetail` independiente del filtro de modo,
      deuda preexistente registrada en `spec/backlog.md`, spec al día y `DB_SSL`
      documentado.

## Criterios de aceptación

- Se puede crear, actualizar y limpiar (`null`) `mode` vía REST y MCP; un valor
  fuera del enum se rechaza (400 en REST, -32602 en MCP).
- Todas las respuestas de actividad incluyen `mode` (`null` si no se asignó),
  también en `subtasks` anidadas.
- `autonomous` + `waiting` se acepta; no hay otras restricciones de backend.
- Las subtareas no heredan `mode` del padre.
- Las instancias generadas desde una plantilla heredan su `mode`, y editar
  `mode` en la plantilla se propaga a las instancias futuras `pending`
  (incluido limpiarlo con `null`); no toca las completadas ni la de hoy.
- `get_activities_by_mode` filtra por modo y excluye por defecto diferidas,
  plantillas y `completed`/`cancelled`; con `status` explícito los incluye;
  `projectId` acota.
- `GET /activities?mode=` y `GET /activities/summary?mode=` filtran en el
  servidor; `none` ⇒ sin Claude; `mode=foo` ⇒ 400.
- `get_activities_summary` devuelve `byMode` con 4 claves y
  `sum(byMode) = total`.
- La UI muestra el chip del modo, permite asignarlo en el formulario y filtrar
  por modo en Dashboard y ProjectDetail, con badges y paginación coherentes.
- El agente puede invocar `get_activities_by_mode(autonomous)` y recibir solo
  trabajo delegable activo, y llevar una tarea autónoma terminada a `testing`.

## Deuda detectada (a registrar en `spec/backlog.md`, no se corrige aquí)

- `backend/CLAUDE.md` desactualizado: lista `get_activities_by_type` (ya no
  existe, spec-027); la tabla de `Activity` mantiene `scheduledForToday`,
  `notionUrl`, `isRecurring` y omite `deferUntil`, `scheduledFor`,
  `waitingFor/Since`, `completedAt`, `postponementCount`; `ActivityStatus` sin
  `testing`/`waiting`; faltan migraciones `1787000000000`–`006`, la ruta
  `GET /activities/deferred` y las tools `get_activities_summary` /
  `get_deferred_activities`.
- `frontend/DESIGN.md`: la tabla de badges no incluye `testing` ni `waiting`, y
  documenta `on_hold` en gris cuando el código lo usa en púrpura.

## Pruebas asociadas

- **Manuales:** `docs/testing/test-036-modo-de-colaboracion-claude.md` —
  `TC-036-NNN` y `TC-MCP-036-NNN`.
- **Automáticas (backend):**
  `backend/test/e2e-036-modo-de-colaboracion-claude.e2e-spec.ts` y casos en
  `backend/src/activities/activities.service.spec.ts`, en rojo desde el inicio.
  Los casos que buscan elementos en listas compartidas deben acotar el
  universo (por `status` o `projectId` de prueba) para evitar la
  interferencia entre suites en paralelo vista en spec-034.

## Aprobación de implementación
> Claude no escribe código de implementación hasta que esta sección esté marcada.
- [x] Paquete (spec + pruebas) aprobado por el usuario (D1–D7 según recomendación)
- **Fecha de aprobación:** 2026-10-13
