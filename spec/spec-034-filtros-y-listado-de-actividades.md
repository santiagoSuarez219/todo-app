# spec-034 — [DONE] Corrección del listado de actividades y filtros por estado

> Estado inicial obligatorio: `[NOT STARTED]`.
> Actualizar a `[IN PROGRESS]`, `[TESTING]` o `[DONE]` según avance.

## Contexto

En producción el Dashboard (`/`) "no muestra todas las tareas" y los tabs de
estado devuelven conteos falsos o listas vacías, tanto en `/` como en
`/projects/:id`. La causa es una combinación de tres defectos verificados en
el código:

1. **`GET /activities` no filtra nada.** `ActivitiesService.findAll()`
   (`backend/src/activities/activities.service.ts:238`) es
   `this.paginate(this.baseQuery(), pagination).getMany()`: sin `where`.
   Devuelve plantillas de recurrencia (`isTemplate = true`) y subtareas
   (`parent IS NOT NULL`) como filas de primer nivel, a diferencia de
   `findToday` / `findTomorrow` / `findThisWeek` / `findOverdue`, que sí hacen
   `.where('activity.isTemplate = false')`. Esas filas consumen cupo de la
   página y luego el frontend las descarta.
2. **El orden de `baseQuery()` es `dueDate ASC NULLS LAST`**, así que las
   actividades sin fecha quedan siempre al final y nunca entran en la primera
   página. Combinado con `useActivities({ limit: 50 })` en `Dashboard.tsx:89`,
   el usuario ve una muestra sesgada y parcial del total.
3. **Todo el filtrado por estado es client-side sobre esa página parcial.**
   `Dashboard.tsx:103-115` y `ProjectDetail.tsx:139-159` filtran el array ya
   traído; los badges de conteo (`Dashboard.tsx:193-207`,
   `ProjectDetail.tsx:150-159`) cuentan sobre lo mismo. "Completadas" está
   casi siempre vacío porque las completadas rara vez caben en las primeras 50
   filas ordenadas por `dueDate`.

A eso se suma la deuda funcional de spec-032 (`waiting`) y spec-033
(`testing`): la lista `TABS` de ambas páginas solo cubre
`pending | in_progress | completed | overdue | no_date`, así que las
actividades en `testing`, `waiting`, `on_hold` y `cancelled` no son
alcanzables por ningún tab. El tab `all` además significa hoy
"`status !== 'completed'`", un criterio no declarado en su etiqueta.

Hallazgos adicionales detectados al verificar el diagnóstico:

- `findWithoutProject()` (línea ~518) tampoco excluye plantillas ni subtareas
  — mismo defecto latente en `/activities/backlog`, hoy tapado por el filtro
  client-side `!a.parent && !a.isTemplate` de `BacklogView.tsx:87`.
- `findByProject()` (línea ~508) tampoco excluye plantillas.
- `list_activities` del MCP (`backend/src/mcp/mcp.service.ts:217-229`) invoca
  `findAll()` directamente: cualquier cambio de comportamiento por defecto de
  ese método cambia también lo que ve el agente.
- Ningún endpoint de lista devuelve total ni metadata, por lo que hoy es
  imposible paginar correctamente ni mostrar un conteo real por estado.

## Alcance

**Incluye**

- Filtrado server-side en `GET /activities` y `GET /activities/project/:projectId`:
  por estado (uno o varios), exclusión de plantillas y de subtareas, y filtros
  derivados de fecha (`overdue`, `no_date`).
- Un endpoint de agregación nuevo, `GET /activities/summary`, que devuelve los
  conteos por estado y de los filtros derivados, sin traer las filas — para
  alimentar los badges de los tabs y el total de la paginación.
- Corrección de `findWithoutProject()` y `findByProject()` para que apliquen
  las mismas exclusiones que el resto de vistas.
- Rediseño de los filtros de estado en `Dashboard.tsx` y `ProjectDetail.tsx`:
  cobertura de los 7 estados del enum (incluidos `testing` y `waiting`) más
  los derivados, en una UI de 5 tabs primarios + selector "Más estados".
- Módulo compartido `frontend/src/lib/activityFilters.ts` como única fuente de
  verdad de los filtros y su traducción a query params.
- Paginación real en ambas páginas, usando el total del summary.
- Actualización del schema y la descripción de `list_activities` /
  `get_activities_by_project` en el MCP y del system prompt afectado.
- Corrección de la documentación desactualizada de `frontend/CLAUDE.md`
  (enum `ActivityStatus` sin `testing`/`waiting`, ruta inexistente
  `GET /activities/type/:type`).

**No incluye**

- Cambiar el *shape* de respuesta de los endpoints de lista (siguen devolviendo
  `Activity[]`; ver "Decisiones tomadas").
- Tabs de estado en `TodayView`, `WeekView`, `OverdueView`, `BacklogView` ni
  `ScheduleView`. Son vistas de **rango temporal**, no de estado, y su filtro
  implícito es una lista negra (`status !== 'completed'`), no una lista blanca:
  por eso `testing` y `waiting` ya aparecen correctamente en ellas y spec-032 /
  spec-033 no las dejaron incompletas. El requisito "faltan filtros de los
  estados nuevos en cada ventana" alcanza únicamente a las dos ventanas que
  **tienen** tabs de estado: Dashboard y ProjectDetail. Decisión confirmada por
  el usuario.
- Cambiar el orden por defecto de `baseQuery()` (`dueDate ASC NULLS LAST`) —
  con filtrado y paginación server-side deja de ser un problema funcional.
- Índices de base de datos sobre `status`, `parentId` e `isTemplate` — con el
  volumen actual no hacen falta y exigirían una migración. Se registran en
  `spec/backlog.md`.
- Filtros por prioridad, energía o proyecto en el Dashboard.
- El modo búsqueda del Dashboard y de ProjectDetail (`useSearchActivities`)
  sigue siendo client-side y fuera de alcance.

## Impacto en el sistema

**Backend** (`backend/src/activities/`)
- `dto/list-activities-query.dto.ts` — **nuevo**. Extiende `PaginationDto` con
  `status?: ActivityStatus[]` (acepta repetido o separado por comas),
  `dueFilter?: 'overdue' | 'no_date'`, `includeTemplates?: boolean` (default
  `false`), `includeSubtasks?: boolean` (default `false`).
- `dto/activities-summary-query.dto.ts` — **nuevo**. `projectId?: string`
  (UUID) + los mismos `includeTemplates` / `includeSubtasks`.
- `activities.service.ts` — helper privado `applyListFilters(qb, query)`
  reutilizado por `findAll`, `findByProject` y `findWithoutProject`; método
  nuevo `getSummary(query)` con un `GROUP BY activity.status` más los conteos
  derivados.
- `activities.controller.ts` — `findAll` y `findByProject` pasan a recibir el
  DTO nuevo; ruta nueva `GET /activities/summary`, que **debe declararse antes
  de `@Get(':id')`** (misma regla que el resto de rutas estáticas del archivo).
- `mcp/mcp.service.ts` — `list_activities` y `get_activities_by_project` (fase
  delegada a `@mcp-builder`).

**Frontend** (`frontend/src/`)
- `types/index.ts` — `ActivityListParams` (extiende `PaginationParams`),
  `ActivitiesSummary` (`{ total, byStatus: Record<ActivityStatus, number>,
  overdue, noDate }`). Deben coincidir exactamente con los DTOs y el retorno
  reales del backend, definidos en la Fase 1.
- `lib/activityFilters.ts` — **nuevo**. Tipo `ActivityFilterKey`, catálogo
  `ACTIVITY_FILTERS` (clave, etiqueta, params que produce, cómo se lee su
  conteo del summary). Vive en `lib/` y no en el componente, por el precedente
  documentado de `lib/scheduleFilters.ts` (`react-refresh/only-export-components`),
  y no en `types/index.ts` por ser estado de presentación.
- `components/ActivityStatusFilter.tsx` — **nuevo**. Tabs + selector de
  estados secundarios, compartido por ambas páginas.
- `services/activities.service.ts` — `getActivities` acepta
  `ActivityListParams`; `getActivitiesByProject` idem; función nueva
  `getActivitiesSummary`.
- `hooks/useActivities.ts` — `useActivities` / `useActivitiesByProject` con los
  params nuevos; hook nuevo `useActivitiesSummary`.
- `pages/Dashboard.tsx` y `pages/ProjectDetail.tsx` — consumo server-side,
  paginación y filtro compartido.
- `components/Pagination.tsx` — se reutiliza tal cual (ya recibe
  `page`/`total`/`limit`).
- `frontend/DESIGN.md` — lectura obligatoria antes de la fase de UI.

**Base de datos:** sin cambios de esquema, sin migración.

## Evaluación MCP

**¿Aplica MCP?** **Sí** — no por estados nuevos, sino por cambio de
comportamiento por defecto.

Verificado: `mcp.service.ts` ya expone `testing` y `waiting` en los enums Zod
de `create_activity`, `update_activity` y `get_activities_by_status`. Ahí no
falta nada.

Lo que sí aplica:

- **MCP existente a modificar:** `todo-api`.
  - `list_activities` invoca `findAll()` directamente. Al pasar `findAll` a
    excluir plantillas y subtareas **por defecto**, el output del agente cambia
    sin que su schema lo refleje. Hay que exponer los nuevos parámetros
    (`status`, `dueFilter`, `includeTemplates`, `includeSubtasks`) en el schema
    Zod y actualizar la descripción de la tool. Regla de `backend/CLAUDE.md`:
    "cualquier tool nueva debe declarar en su schema Zod exactamente los mismos
    campos que el DTO real".
  - `get_activities_by_project`: mismo tratamiento.
  - **Tool nueva propuesta:** `get_activities_summary` sobre
    `GET /activities/summary` — lectura barata que responde directamente
    "¿cuántas tareas tengo en cada estado?" sin traer cientos de filas.
    Decisión final delegada a `@mcp-builder` en la Fase 5.
- **System prompt afectado:** `docs/mcps/asistente-personal.system-prompt.md`
  (el de finanzas no toca actividades).
- **Fase de MCP en este spec:** Fase 5.

## Fases de implementación

### Fase 0 — Pruebas (se escriben con el spec, arrancan en rojo)
- [x] `backend/test/e2e-034-filtros-y-listado-de-actividades.e2e-spec.ts` — un
      caso por criterio de aceptación del backend, en rojo.
- [x] `docs/testing/test-034-filtros-y-listado-de-actividades.md` — casos
      `TC-034-NNN` (UI) y `TC-MCP-034-NNN` (tools MCP), todos en ⬜ Pendiente.
- [x] Diseño de los casos revisado con `@tester`.

### Fase 1 — Filtrado server-side en el servicio de actividades
- [x] `backend/src/activities/dto/list-activities-query.dto.ts`: DTO nuevo
      extendiendo `PaginationDto`, con `@IsEnum(ActivityStatus, { each: true })`
      sobre `status`, transform de string separado por comas a array,
      `@IsEnum` sobre `dueFilter` y booleanos con transform explícito (recordar
      que `ValidationPipe` corre con `forbidNonWhitelisted: true`: cualquier
      param no declarado devuelve 400).
- [x] `activities.service.ts`: helper privado `applyListFilters(qb, query)` que
      aplique, en este orden — exclusión de plantillas salvo
      `includeTemplates`, exclusión de subtareas (`activity.parent IS NULL`)
      salvo `includeSubtasks`, `status IN (:...)` si viene, y la condición de
      `dueFilter` (`overdue` = `dueDate < hoy 00:00` **y** `status != completed`,
      reusando el criterio ya vigente en `findOverdue`; `no_date` =
      `dueDate IS NULL`).
- [x] `findAll(query)`: pasa a recibir el DTO nuevo y aplicar el helper.
- [x] `findByProject(projectId, query)`: idem, conservando el `where` de
      proyecto.
- [x] `findWithoutProject(pagination)`: aplicar exclusión de plantillas y
      subtareas (hoy no las tiene), conservando su condición
      `notDeferredCondition()`.
- [x] Verificar que `findAll` **no** hereda `notDeferredCondition()`: el
      Dashboard es una vista de inventario, no una vista activa; una tarea
      diferida debe seguir siendo alcanzable desde ahí. Dejarlo comentado en el
      código como decisión explícita.

### Fase 2 — Endpoint de agregación `GET /activities/summary`
- [x] `dto/activities-summary-query.dto.ts` con `projectId?` (UUID, opcional) y
      los mismos flags de inclusión.
- [x] `activities.service.ts → getSummary(query)`: un `GROUP BY activity.status`
      sobre el mismo conjunto filtrado (sin los joins de `baseQuery()`, que no
      hacen falta para contar y encarecen la query), más dos conteos derivados
      (`overdue`, `noDate`) y `total`. Devolver `byStatus` con **todos** los
      valores de `ActivityStatus` presentes, rellenando con `0` los que Postgres
      no retorne — para que el frontend no tenga que defenderse de `undefined`.
- [x] `activities.controller.ts`: `@Get('summary')` declarado en el bloque de
      rutas estáticas, **antes** de `@Get(':id')`, con su `@ApiOkResponse`.
- [x] Ajustar las firmas de `findAll` / `findByProject` en el controlador y
      revisar que ningún otro consumidor del servicio se rompa
      (`recurrence-scheduler.service.ts`, `mcp.service.ts`).

### Fase 3 — Contratos y capa de datos del frontend
> Depende de la Fase 2: los tipos se escriben contra los DTOs reales ya
> implementados, nunca inferidos.
- [x] `types/index.ts`: `ActivityListParams` y `ActivitiesSummary`.
- [x] `services/activities.service.ts`: `getActivities` y
      `getActivitiesByProject` aceptan `ActivityListParams`;
      `getActivitiesSummary(params)` nueva. Verificar la serialización de
      `status[]` en Axios contra lo que espera el DTO (repetido vs. coma) —
      decidirlo en Fase 1 y respetarlo aquí.
- [x] `hooks/useActivities.ts`: query keys `['activities', params]`,
      `['activities', 'project', projectId, params]` y
      `['activities', 'summary', params]`. Al colgar de `['activities']`, las
      invalidaciones existentes de `useCreateActivity` / `useUpdateActivity` /
      `useDeleteActivity` / `useCreateSubtask` ya cubren el summary —
      **verificarlo explícitamente**, no asumirlo.
- [x] Usar `placeholderData: keepPreviousData` en las listas paginadas, mismo
      patrón que `useSearchActivities` / `useScheduleActivities`, para evitar el
      flash a skeleton al cambiar de tab o de página.

### Fase 4 — UI de filtros compartida
- [x] Leer `frontend/DESIGN.md` **antes** de escribir código de UI.
- [x] `lib/activityFilters.ts`: catálogo único de filtros, con el reparto
      aprobado por el usuario:
      - **Tabs primarios:** `Activas` (default), `Pendientes`, `En progreso`,
        `Atrasadas`, `Completadas`.
      - **Selector "Más estados":** `En pruebas`, `Esperando`, `En pausa`,
        `Canceladas`, `Sin fecha`, `Todas`.
      - `Activas` se define como lista **explícita** de estados
        (`pending, in_progress, testing, waiting, on_hold`), no como
        "distinto de completed", para que su etiqueta diga la verdad.
- [x] Cada entrada del catálogo declara: `key`, `label`, los params que produce
      y cómo derivar su conteo desde `ActivitiesSummary`.
- [x] `components/ActivityStatusFilter.tsx`: tabs + `<select>` secundario.
      Reutilizar las clases de tab ya vigentes en ambas páginas y el `selectCls`
      de `components/schedule/ProjectFilter.tsx` (patrón ya validado en el
      sistema de diseño). Etiquetas de estado consistentes con el `labelMap` de
      `StatusBadge.tsx` (`on_hold` = "En pausa", `waiting` = "Esperando",
      `testing` = "En pruebas").
- [x] Accesibilidad: `role="tablist"` / `aria-selected` en los tabs, `<label>`
      asociado al selector, navegación por teclado — aplicar la skill
      `accessibility`.
- [x] `pages/Dashboard.tsx`: reemplazar `TABS` local y el bloque
      `filteredActivities` client-side por el filtro compartido + params
      server-side; eliminar `sourceList.filter(a => !a.parent)` (ya lo hace el
      backend); los badges leen del summary; agregar `<Pagination>` con
      `total` derivado del summary. **Mantener** el modo búsqueda tal cual;
      definir que al buscar los tabs se deshabilitan o se resetean, y dejarlo
      documentado.
- [x] `pages/ProjectDetail.tsx`: mismo reemplazo (`TABS` de las líneas 21-28,
      `filteredActivities` y `tabCount`); las StatCards (`todayCount`,
      `weekCount`, `overdueCount`) pasan a leerse del summary del proyecto en
      lugar de contarse sobre una página parcial — **verificar** que el summary
      cubre esos tres conteos o, si no, acotar el cambio a `overdueCount` y
      dejar los otros dos como están, señalándolo.
- [x] Revisar `handleClearCompleted`: hoy borra `completedActivities` derivadas
      de la página cargada. Con filtrado server-side el conteo del botón debe
      venir del summary, pero el borrado sigue operando solo sobre lo cargado —
      alinear el texto del `ConfirmDialog` con lo que realmente se va a borrar.

### Fase 5 — MCP: actualizar `todo-api`
> Diseño de `@mcp-builder`. **Se aprueba `get_activities_summary` como tool
> nueva**: `get_activities_by_status` no resuelve "¿cuántas tareas tengo en
> cada estado?" en una sola llamada exacta (7 invocaciones + suma de páginas,
> aproximada si algún estado supera `limit`); `get_activities_summary` es una
> agregación SQL barata sobre `activitiesService.getSummary()`, ya construido
> en la Fase 2 — extensión, no MCP nuevo.
- [x] `backend/src/mcp/mcp.service.ts`: agregar el bloque compartido
      `activityListFiltersSchema` (`status`, `dueFilter`, `includeTemplates`,
      `includeSubtasks`) junto a `paginationSchema`, con los mismos valores y
      descripciones que el DTO `ListActivitiesQueryDto` de la Fase 1 — nunca
      inventar parámetros (regla de `backend/CLAUDE.md`). `status` llega desde
      Zod como array nativo — no reutilizar el transform de coma-a-array del
      DTO HTTP, el MCP no pasa por `ValidationPipe`.
- [x] `list_activities` (~línea 217): reemplazar `paginationSchema` por
      `{ ...paginationSchema, ...activityListFiltersSchema }`, pasar los
      campos nuevos a `activitiesService.findAll()` como
      `ListActivitiesQueryDto`, y actualizar la descripción de la tool para
      declarar el comportamiento por defecto nuevo (excluye plantillas y
      subtareas salvo `includeTemplates`/`includeSubtasks`).
- [x] `get_activities_by_project` (~línea 557): mismo tratamiento —
      `{ projectId, ...paginationSchema, ...activityListFiltersSchema }`,
      pasar los campos nuevos a `activitiesService.findByProject()`, y
      actualizar su descripción con la misma nota de comportamiento por
      defecto.
- [x] Agregar la tool nueva `get_activities_summary` sobre
      `activitiesService.getSummary()` (`GET /activities/summary`), con
      `projectId`, `includeTemplates`, `includeSubtasks` opcionales — sin
      `status` ni `dueFilter` en su schema (la agregación es siempre por
      todos los estados a la vez; contrato mínimo).
- [x] Actualizar `docs/mcps/asistente-personal.system-prompt.md`:
      - Fila `list_activities` (tabla "Actividades — CRUD"): agregar
        "**Excluye plantillas recurrentes y subtareas por defecto** — pásale
        `includeTemplates`/`includeSubtasks` si las necesitas. Acepta
        `status` (uno o varios) y `dueFilter` (`overdue` \| `no_date`)".
      - Fila `get_activities_by_project` (tabla "consultas especializadas"):
        agregar "Mismo comportamiento por defecto que `list_activities`:
        excluye plantillas y subtareas salvo que se pidan explícitamente".
      - Fila nueva justo debajo, `get_activities_summary`: "Conteo por
        estado (+ `overdue`, `noDate`, `total`) sin traer filas. Úsala en vez
        de sumar varias llamadas a `get_activities_by_status` — acepta
        `projectId` opcional".
      - Fila nueva en "Consultas y flujos frecuentes": "¿Cuántas tareas
        tengo en cada estado? / ¿cómo va mi bandeja?" →
        "`get_activities_summary` — nunca sumes varias llamadas a
        `get_activities_by_status`, el conteo no sería exacto".
- [x] `docs/mcps/README.md`: verificar que el inventario (descrito a nivel de
      dominio, no tool por tool) sigue siendo válido sin cambios de contenido.
- [x] Verificar por JSON-RPC directo contra `/mcp` (con `MCP_API_KEY`) los 12
      casos `TC-MCP-034-001` a `012` de
      `docs/testing/test-034-filtros-y-listado-de-actividades.md`.

### Fase 6 — Documentación y verificación
- [x] `backend/CLAUDE.md`: documentar los query params nuevos y la ruta
      `/activities/summary` en la tabla de Activities.
- [x] `frontend/CLAUDE.md`: actualizar la tabla de endpoints y —deuda ya
      detectada, incluida por decisión del usuario— corregir el enum
      `ActivityStatus` documentado (le faltan `testing` y `waiting`) y eliminar
      la ruta inexistente `GET /activities/type/:type`. Registrar en
      `spec/backlog.md` cualquier otra desincronización que aparezca, más los
      índices de BD descartados.
- [x] `npm run build` + `npm run lint` en `backend/` y `frontend/`.

### Fase 7 — Pruebas
- [x] Poner en verde `backend/test/e2e-034-filtros-y-listado-de-actividades.e2e-spec.ts`
      (`@tester`).
- [x] Ejecutar los casos de
      `docs/testing/test-034-filtros-y-listado-de-actividades.md`, incluidos los
      `TC-MCP-034`. Ejecutados por Claude (navegador + API/MCP directa) con
      autorización explícita del usuario en esta sesión: 25/27 aprobados con
      evidencia, 2 pendientes por limitación de la herramienta de prueba
      (`TC-034-014` responsive, `TC-034-017` paginación en ProjectDetail —
      ninguno por comportamiento incorrecto). Sin hallazgos de bugs. Datos de
      prueba limpiados y verificados sin restos. Usuario confirmó cerrar la
      ronda — ver "Resumen de la ronda" en el archivo de test.

## Criterios de aceptación

**Backend**
- `GET /activities` no devuelve plantillas (`isTemplate = true`) ni subtareas
  (`parent != null`) salvo que se pasen `includeTemplates=true` /
  `includeSubtasks=true`.
- `GET /activities?status=testing` devuelve solo actividades en `testing`;
  `?status=waiting,on_hold` devuelve la unión de ambos estados.
- `GET /activities?dueFilter=no_date` devuelve solo actividades con
  `dueDate = null`, alcanzables aunque el orden por defecto sea
  `dueDate ASC NULLS LAST`.
- `GET /activities?dueFilter=overdue` aplica el mismo criterio que
  `/activities/overdue` (vencida y no completada).
- Un query param no declarado devuelve `400` (`forbidNonWhitelisted`).
- `GET /activities/project/:id` y `GET /activities/without-project` aplican las
  mismas exclusiones de plantillas y subtareas.
- `GET /activities/summary` devuelve `total`, `byStatus` con **los 7** valores
  de `ActivityStatus` (rellenando `0` los ausentes), `overdue` y `noDate`;
  con `?projectId=` los conteos se acotan a ese proyecto.
- La suma de `byStatus` es igual a `total` para el mismo conjunto de flags.

**Frontend**
- El Dashboard permite filtrar por los 7 estados del enum (incluidos
  `testing` y `waiting`) más "Atrasadas", "Sin fecha", "Activas" y "Todas".
- Los badges de conteo de cada filtro coinciden con el total real en base de
  datos, no con la página cargada.
- Seleccionar "Completadas" muestra actividades completadas aunque no tengan
  `dueDate` reciente.
- El Dashboard pagina: si hay más resultados que el `limit`, aparece
  `<Pagination>` y navegar de página trae filas distintas.
- `/projects/:id` ofrece exactamente el mismo conjunto de filtros y el mismo
  comportamiento.
- Las etiquetas de estado coinciden con `StatusBadge` ("En pausa", "Esperando",
  "En pruebas").
- Dashboard y ProjectDetail no contienen ninguna lista de tabs propia: ambas
  consumen `lib/activityFilters.ts`.

**MCP**
- `list_activities` acepta `status`, `dueFilter`, `includeTemplates` e
  `includeSubtasks`, y su descripción declara el comportamiento por defecto.
- El agente puede invocar la tool de summary (si `@mcp-builder` la aprueba) y
  obtener el conteo por estado sin traer las filas.
- `docs/mcps/asistente-personal.system-prompt.md` refleja el comportamiento
  nuevo.

## Pruebas asociadas
> Estos archivos se crean junto con el spec (ver "Artefactos que acompañan al spec").
- **Manuales:** `docs/testing/test-034-filtros-y-listado-de-actividades.md` —
  casos `TC-034-NNN` (Dashboard, ProjectDetail, paginación, etiquetas,
  búsqueda + filtros) y `TC-MCP-034-NNN` (tools del MCP).
- **Automáticas (backend):**
  `backend/test/e2e-034-filtros-y-listado-de-actividades.e2e-spec.ts` — un caso
  por criterio de aceptación de backend, en rojo desde el inicio.

## Decisiones tomadas

Resueltas con el usuario antes de redactar este spec:

1. **Filtrado server-side** en lugar de subir el `limit` client-side. Subir el
   `limit` a 100 es un parche: ese es el máximo del `PaginationDto` y sin
   `total` no se puede paginar ni mostrar conteos honestos, que es exactamente
   el síntoma reportado. **Trade-off aceptado:** cada cambio de tab pasa a ser
   un request (mitigado con `keepPreviousData` y el `staleTime` de 1 min ya
   configurado).
2. **No se cambia el shape de las listas.** Envolverlas en
   `{ items, total, page, limit }` rompería a todos los consumidores del
   frontend (`getList<T>` devuelve `data.data` como array) y a todas las tools
   MCP de actividades, y aun así haría falta una query agregada aparte para los
   conteos por estado. `GET /activities/summary` entrega los badges **y** el
   total de la paginación sin tocar ningún contrato existente.
3. **UI de filtros:** 5 tabs primarios + selector "Más estados" (ver Fase 4).
   Descartado agrupar `on_hold` + `waiting` en un tab "Bloqueadas" — perdería
   la distinción que spec-032 introdujo a propósito— y descartado poner los 11
   filtros como tabs con scroll horizontal, ilegible en móvil.
4. **Alcance limitado a `/` y `/projects/:id`**, las dos únicas ventanas con
   tabs de estado.
5. **Se incluyen** la corrección de `findWithoutProject()` (mismo bug, hoy
   tapado por un filtro client-side) y la de la documentación desactualizada de
   `frontend/CLAUDE.md`.
6. **Cambio de comportamiento por defecto de `GET /activities`:** excluir
   plantillas y subtareas es un cambio de contrato silencioso para consumidores
   externos, incluido `list_activities` del MCP. Se mitiga con los flags
   `includeTemplates` / `includeSubtasks` y con la Fase 5.
7. **Rama:** `bug/filtros-y-listado-de-actividades` — prefijo `bug/` porque el
   origen del paquete es un defecto en producción, aunque incluya
   funcionalidad nueva.

## Revisión de código (`@reviewer`, previo al commit)

Auditoría completa contra `development`: build + typecheck + lint (sin
`--fix`, ver advertencia abajo) + unit (109/109) + e2e (14/14 de spec-034,
180/182 del total — los 2 restantes preexistentes y ajenos al spec). Veredicto
inicial: **CAMBIOS REQUERIDOS**, por dos hallazgos corregidos antes de
commitear:

1. **🔴 Bloqueante — pérdida de datos.** `ProjectDetail.tsx`: el botón
   "Limpiar completadas" y su `ConfirmDialog` derivaban de `rootActivities`,
   que cambia de fuente a `searchQ.data` en modo búsqueda. Con el tab
   "Completadas" activo, al escribir en el buscador el botón mostraba el
   conteo de los resultados de búsqueda (**de cualquier estado**) y el borrado
   los eliminaba todos, mientras el diálogo seguía diciendo "completadas".
   **Corregido:** nuevo derivado `completedOnPage`, calculado siempre desde
   `listQ.data` (nunca de `searchQ.data`) y filtrado explícitamente por
   `status === 'completed'`, independiente de `activeFilter`/`isSearching`.
   El botón además se oculta mientras se busca.
2. **🟠 Mayor — e2e frágil con el comando documentado.** `npm run test:e2e`
   corre las suites en paralelo sobre la BD de desarrollo compartida;
   `TC-034-E2E-02/03/04/07` (aserciones positivas contra `GET /activities` sin
   acotar) podían caer fuera de la página 1 por el orden
   `dueDate ASC NULLS LAST` si la BD tenía ≥100 filas con fecha por delante.
   **Corregido:** esos casos ahora fijan `status: 'testing'` en las
   actividades que crean y filtran la consulta por el mismo `status` — acota
   el universo comparado sin dejar de ejercitar el endpoint real. Verificado
   estable en 3 corridas consecutivas de `npm run test:e2e`.
   `TC-034-E2E-08`/`TC-034-E2E-11` (`/activities/overdue` y
   `/activities/without-project`) no aceptan `status` — mitigados con
   `limit: 100`; queda un riesgo residual menor y documentado, igual que en
   cualquier otra suite `e2e-*` que ya consulta esos mismos endpoints
   compartidos.

Hallazgos 🟡 también corregidos: docblock de `applyListFilters` que afirmaba
que `overdue` coincide "fila por fila" con `findOverdue` (no es así:
`findAll`/`getSummary` no aplican `notDeferredCondition()`, a propósito — ver
comentario actualizado); restos de la fase roja en el e2e (`as any` sin tipar,
`console.warn`, `void ProjectsService`) eliminados; `ProjectDetail.tsx` usa
`id!` de forma consistente con el resto del archivo.

**Advertencia operativa registrada:** `npm run lint` en `backend/` ejecuta
`eslint --fix` sobre **todo** `src/`+`test/`, no solo los archivos tocados —
reformateó ~50 archivos ajenos al spec durante la implementación. Se
revirtieron y no quedaron en el diff. Para lint de verificación puntual usar
`npx eslint <archivo>` sin `--fix`.

**Excepción explícita documentada:** el spec cierra en `[DONE]` con 2 casos
manuales en `docs/testing/test-034-*.md` sin verificar en UI real
(`TC-034-014` responsive, `TC-034-017` paginación en ProjectDetail) — por
limitación de la herramienta de automatización de navegador, no por
comportamiento incorrecto observado. El usuario fue informado y decidió
cerrar la ronda igualmente; ver "Resumen de la ronda" en el archivo de test.

## Aprobación de implementación
> Claude no escribe código de implementación hasta que esta sección esté marcada.
- [x] Paquete (spec + pruebas) aprobado por el usuario
- **Fecha de aprobación:** 2026-08-24
