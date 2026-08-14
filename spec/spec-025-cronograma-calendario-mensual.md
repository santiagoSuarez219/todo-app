# spec-025 — [IN PROGRESS] Cronograma — vista de calendario mensual de actividades

> Estado inicial obligatorio: `[NOT STARTED]`.
> Actualizar a `[IN PROGRESS]`, `[TESTING]` o `[DONE]` según avance.

## Contexto

Hoy las actividades se navegan por listas planas agrupadas por rango relativo
(`Hoy`, `Esta semana`, `Vencidas`, `Backlog`) o por proyecto. Ninguna vista
responde visualmente a la pregunta "¿qué tengo programado a lo largo del
mes?" — para eso el usuario tiene que sumar mentalmente varias vistas o
recorrer proyecto por proyecto.

Este spec agrega una vista de **Cronograma**: un calendario mensual que ubica
cada actividad en el día de su fecha límite, con navegación entre meses. El
objetivo es dar una lectura temporal de la carga de trabajo, no reemplazar
las vistas existentes.

## Alcance

Incluye:
- Un endpoint de backend que devuelve, en una sola llamada, las actividades
  de nivel superior (no plantillas, no subtareas) ubicadas dentro del rango
  visible de una grilla mensual (mes objetivo + días de relleno del mes
  anterior/siguiente hasta completar semanas Lunes–Domingo).
- Una nueva página de frontend (`/activities/schedule`) con grilla de
  calendario, navegación mes anterior/siguiente/"Hoy", chips de actividad por
  día y detalle del día al hacer clic.
- Una entrada nueva en el Sidebar ("Cronograma"), a nivel de las vistas
  existentes de actividades.
- Una tool MCP nueva (`get_activities_by_month`) para que un agente pueda
  responder "¿qué tengo en marzo?".

### Decisiones tomadas con el usuario

- **Tipo de vista:** calendario mensual (no timeline/Gantt).
- **Datos mostrados:** solo actividades de nivel superior (`parent IS NULL`),
  no plantillas (`isTemplate = false`). Se ubican por
  `COALESCE(dueDate, instanceDate)` — así las instancias de **tareas**
  recurrentes (que hoy solo reciben `instanceDate`, no `dueDate`, ver
  "Hallazgo de datos" abajo) también aparecen en el calendario, no solo los
  `reminder`.
- **Rango que devuelve el endpoint:** el rango **visible de la grilla**
  (Lunes de la semana que contiene el día 1 → Domingo de la semana que
  contiene el último día del mes), no el mes estricto. Así la UI no necesita
  llamadas adicionales para pintar los días de relleno.
- **Actividades completadas:** se **muestran**, con estilo atenuado — a
  diferencia de `TodayView`/`WeekView`/`OverdueView`, que las ocultan. Es una
  desviación consciente del criterio de esas vistas: en un calendario, ver lo
  ya hecho aporta valor histórico.
- **Subtareas:** no se muestran con su propia fecha en el calendario (fuera
  de alcance de este spec). Si el usuario necesita verlas, entra al detalle
  de la actividad padre.
- **Ubicación en navegación:** entrada nueva en el Sidebar, ruta
  `/activities/schedule`, al mismo nivel que Hoy/Esta semana/Vencidas/
  Backlog. **No** se agrega a la Tabbar móvil en este spec (ver "Lo que NO
  incluye").
- **MCP:** se agrega `get_activities_by_month` en este mismo spec (Fase 4),
  wrapper delgado sobre el mismo método de servicio que usa el endpoint REST.

### Hallazgo de datos (documentado, no es un bug de este spec)

`buildInstanceFromTemplate()` (`activities.service.ts`) solo asigna `dueDate`
a las instancias generadas de tipo `reminder`; las instancias de tipo `task`
reciben únicamente `instanceDate`. Sin el `COALESCE`, esas tareas recurrentes
nunca aparecerían en el cronograma. Este spec **no modifica** el generador de
instancias (fuera de alcance) — solo hace que el endpoint de lectura tolere
ambos casos.

### Lo que NO incluye

- Vista tipo timeline/Gantt horizontal (evaluada y descartada por el usuario
  para este spec).
- Fechas de subtareas en el calendario.
- Proyección virtual de instancias recurrentes futuras más allá de las ya
  generadas (el cron de recurrencia sigue generando solo D+1; los meses
  futuros mostrarán huecos donde el usuario "espera" recurrencia — limitación
  conocida, candidata a spec aparte).
- Entrada en la Tabbar móvil.
- Cambios en el modelo de datos, migraciones, ni en
  `recurrence-scheduler.service.ts`.
- Edición de actividades desde la celda del día (se abre el detalle/`ActivityCard`
  existente, que ya trae su propia edición inline — no se duplica lógica).
- Librerías nuevas de fechas/calendario (`date-fns` u otras): la grilla se
  calcula con `Date` nativo.

## Ampliación — filtro por proyecto (post-ronda 1)

> Agregada después de que la Fase 5 (ronda manual 1) cerrara con 9/9 casos
> aprobados. El paquete original quedaba en `[TESTING]`; esta ampliación lo
> devuelve a `[IN PROGRESS]` hasta cerrar la Fase 9. Diseñada con `@architect`.

El usuario pidió agregar un **filtro por proyecto** a `/activities/schedule`.

### Decisiones tomadas con el usuario para la ampliación

- **Tipo de filtro:** selector único (`<select>` nativo) — "Todos" / un
  proyecto concreto / "Sin proyecto". No hay multi-selección.
- **Dónde se filtra:** **100% client-side**, sobre los datos que ya trae
  `GET /activities/schedule` para el mes visible (el endpoint no pagina, ya
  trae todo el mes). **No se toca el backend ni la tool MCP
  `get_activities_by_month`** — ni su DTO, ni su servicio, ni su schema Zod.
- **Proyectos listados:** todos, incluidos `completed`/`inactive`/`paused` —
  el Cronograma muestra actividades históricas, y ocultar proyectos ya
  completados dejaría esas actividades sin poder filtrarse.
- **Persistencia:** el filtro **se mantiene** al navegar entre meses con el
  `MonthNavigator` (no se resetea a "Todos" en cada cambio de mes).
- **Ubicación del tipo `ProjectFilterValue`/constante `NO_PROJECT`:** viven en
  `components/schedule/ProjectFilter.tsx`, no en `types/index.ts` — es un tipo
  de estado de UI sin contraparte en el backend/DTOs, a diferencia del resto
  de tipos centralizados en `types/index.ts` (dominio + DTOs espejo del
  backend).

### Evaluación MCP de la ampliación

**¿Aplica MCP?** No. `get_activities_by_month` ya devuelve el set completo
del mes con `project` embebido en cada actividad — un agente puede filtrar
por proyecto sobre ese resultado sin ninguna llamada ni campo nuevo. Agregar
un `projectId` opcional al endpoint/tool sería redundante con el filtrado
trivial que ya es posible sobre la respuesta, y contradice la decisión de no
tocar backend. `docs/mcps/` no se modifica.

### Impacto en el sistema — ampliación (solo frontend)

| Archivo | Cambio |
|---|---|
| `frontend/src/lib/scheduleFilters.ts` | **Nuevo, función pura.** Constante centinela `NO_PROJECT = '__no_project__'` (no colisiona con UUIDs reales), tipo `ProjectFilterValue = string \| typeof NO_PROJECT \| null` (`null` = "Todos"), predicado `matchesProjectFilter()`. Separado de `ProjectFilter.tsx` para no romper Fast Refresh (`react-refresh/only-export-components`: un archivo de componente solo puede exportar el componente) — ajuste sobre el plan original de `@architect`, que los ubicaba dentro de `ProjectFilter.tsx`. |
| `frontend/src/components/schedule/ProjectFilter.tsx` | **Nuevo.** `<select>` nativo (no el dropdown custom de `InlineProjectEditor`) consumiendo `useProjects()` y los tipos/constante de `lib/scheduleFilters.ts`, estilos derivados de `inputCls` de `ActivityForm.tsx`. |
| `frontend/src/pages/ScheduleView.tsx` | Estado `projectFilter`; nueva fila de filtros (debajo del header, no dentro de la fila del `MonthNavigator`) con `<ProjectFilter />`; `filteredActivities` aplicado **antes** de `groupActivitiesByDate`; condición de render de `MonthCalendar` sobre `filteredActivities.length > 0`; empty state diferenciado ("sin actividades de este proyecto en este mes" + botón "Ver todas" que limpia el filtro), distinto del de "mes sin actividades" de `TC-025-007`. |
| `frontend/CLAUDE.md` | Agregar `ProjectFilter.tsx`/`scheduleFilters.ts` al inventario de `components/schedule/`. |

**Se reutilizan sin modificar:** `lib/calendar.ts` (el filtro se aplica antes
de agrupar, no dentro del agrupador), `MonthCalendar.tsx`,
`CalendarDayCell.tsx`, `ActivityChip.tsx`, `DayActivitiesModal.tsx` (sigue
derivando del array ya filtrado, conserva el fix de datos vivos de
`TC-025-003`), `MonthNavigator.tsx`, `hooks/useActivities.ts`,
`services/activities.service.ts`.

Sin cambios de backend, sin migración, sin cambios en `docs/mcps/`.

## Impacto en el sistema

### Backend

| Archivo | Cambio |
|---------|--------|
| `backend/src/activities/dto/schedule-query.dto.ts` | **Nuevo.** `ScheduleQueryDto`: `year` (int, 2000–2100) + `month` (int, 1–12), siguiendo el patrón de `MonthlySummaryQueryDto`. Ambos requeridos, sin paginación. |
| `backend/src/activities/activities.service.ts` | Nuevo método `findByMonth(query: ScheduleQueryDto): Promise<Activity[]>`. Calcula el rango visible de la grilla (Lunes–Domingo que envuelve el mes) y consulta sobre `baseQuery()` filtrando `isTemplate = false`, `parent IS NULL` y `COALESCE(dueDate, instanceDate)` dentro del rango. Sin `paginate()`; `take` de seguridad (500) para no dejar la query abierta. No filtra por `status` (a diferencia de `findThisWeek`/`findToday`/`findOverdue`). |
| `backend/src/activities/activities.controller.ts` | Nueva ruta `@Get('schedule')`, registrada en el bloque de "Consultas especializadas" **antes** de `@Get(':id')` (si va después, `ParseUUIDPipe` intenta parsear `"schedule"` como UUID y revienta). |
| `backend/src/activities/activities.service.spec.ts` | Casos unitarios nuevos para `findByMonth()` (ver "Pruebas asociadas"). |
| `backend/test/e2e-025-cronograma-calendario-mensual.e2e-spec.ts` | Nuevo archivo de pruebas e2e. |

- **No requiere migración.** No cambia el esquema; `dueDate` e `instanceDate`
  ya existen y son consultables. `synchronize: false` se mantiene intacto.
- **Nota de implementación (zona horaria):** `dueDate` es `timestamptz`;
  `instanceDate` es `date`. El cálculo del rango visible de la grilla debe
  hacerse en términos de fecha calendario (no de instante UTC) para que un
  `dueDate` truncado a medianoche no "salte" de día por el offset. Punto
  sensible a validar en las pruebas manuales (`TC-025` de zona horaria).

### Frontend

| Archivo | Cambio |
|---------|--------|
| `frontend/src/types/index.ts` | Tipo auxiliar `ScheduleParams { year: number; month: number }`. Sin cambios en `Activity`. |
| `frontend/src/services/activities.service.ts` | `getScheduleActivities(year, month)` sobre el helper `getList` existente. |
| `frontend/src/hooks/useActivities.ts` | `useScheduleActivities(year, month)`, `queryKey: ['activities', 'schedule', year, month]`, `placeholderData: keepPreviousData` (evita flash al cambiar de mes, mismo patrón que `useSearchActivities`). Las mutations existentes (`useCreateActivity`/`useUpdateActivity`/`useDeleteActivity`) ya invalidan el prefijo `['activities']` — cubren esta key sin tocarlas. |
| `frontend/src/lib/calendar.ts` | **Nuevo, función pura.** Construye la matriz de semanas (Lunes–Domingo) del mes visible y agrupa actividades por fecha local (`Map<string, Activity[]>`, clave `YYYY-MM-DD` en hora local del navegador). |
| `frontend/src/components/schedule/MonthNavigator.tsx` | **Nuevo.** Mes anterior / siguiente / "Hoy" + título del mes. |
| `frontend/src/components/schedule/ActivityChip.tsx` | **Nuevo.** Chip compacto: nombre truncado + color por prioridad (tokens de `DESIGN.md`), atenuado si `status === 'completed'`. |
| `frontend/src/components/schedule/CalendarDayCell.tsx` | **Nuevo.** Celda de día: número, marca de "hoy", días fuera del mes atenuados, hasta N chips + "+X más". |
| `frontend/src/components/schedule/MonthCalendar.tsx` | **Nuevo.** Grilla 7×N, recibe el mapa `fecha → Activity[]`, sin fetch propio. |
| `frontend/src/components/schedule/DayActivitiesModal.tsx` | **Nuevo.** Al hacer clic en un día: reutiliza `Modal` + `ActivityCard` existentes para listar las actividades de ese día. |
| `frontend/src/pages/ScheduleView.tsx` | **Nueva página.** Estado de mes visible, loading/error/vacío con `EmptyState` existente. |
| `frontend/src/App.tsx` | Ruta `<Route path="activities/schedule" element={<ScheduleView />} />`. |
| `frontend/src/components/layout/Sidebar.tsx` | Nuevo `NavLink` "Cronograma" (icono nuevo, `CalendarIcon`), después de "Backlog". |

**Se reutilizan sin modificar:** `ActivityCard.tsx`, `StatusBadge.tsx`,
`PriorityBadge.tsx`, `Modal.tsx`, `EmptyState.tsx`.

### Base de datos

Sin cambios de esquema. Sin migración.

## Evaluación MCP

**¿Aplica MCP?** Sí.

| Criterio | Respuesta |
|---|---|
| ¿Expone datos que un agente podría consultar? | Sí — hoy no existe forma de consultar actividades por mes/rango arbitrario; solo `get_today_activities`, `get_tomorrow_activities`, `get_this_week_activities`, `get_overdue_activities`. |
| ¿Permite acciones nuevas? | No — solo lectura. |
| ¿Hay tool relacionada a extender? | `list_activities` solo pagina (máx. 100 por página) sin filtro de fecha — no sirve para componer un mes sin iterar todo el dataset. |
| ¿Hay system prompt que se beneficie? | Sí, `docs/mcps/asistente-personal.system-prompt.md`. |

- **MCP existente a modificar:** `todo-api` — nueva tool `get_activities_by_month`.
- **MCP nuevo a crear:** ninguno.
- **System prompt afectado:** `docs/mcps/asistente-personal.system-prompt.md`
  — documentar la tool nueva en la tabla de capacidades de actividades.
- **Fase de MCP en este spec:** Fase 4.

## Fases de implementación

### Fase 1 — Backend: endpoint de cronograma ✅ Completada
- [x] `schedule-query.dto.ts`: `year` + `month`, `@Type(() => Number)`, `@IsInt`, `@Min`/`@Max`.
- [x] `activities.service.ts`: helper de rango visible de grilla (Lunes de la semana del día 1 → Domingo de la semana del último día) + `findByMonth(query)` sobre `baseQuery()` con los filtros descritos en "Impacto en el sistema".
- [x] `activities.controller.ts`: `@Get('schedule')`, ubicado antes de `@Get(':id')`, con anotaciones Swagger consistentes con el resto del controlador.
- [x] Poner en verde los unitarios y el e2e de este spec.

### Fase 2 — Frontend: capa de datos y utilidades ✅ Completada
- [x] `types/index.ts`: `ScheduleParams`.
- [x] `services/activities.service.ts`: `getScheduleActivities(year, month)`.
- [x] `hooks/useActivities.ts`: `useScheduleActivities` con `keepPreviousData`.
- [x] `lib/calendar.ts`: matriz de semanas + agrupación por fecha local (con prueba manual explícita de zona horaria, ver `TC-025-009`).

### Fase 3 — Frontend: UI del cronograma ✅ Completada
- [x] Releer `frontend/DESIGN.md` antes de escribir UI (tokens, dark mode, badges).
- [x] `components/schedule/MonthNavigator.tsx`, `ActivityChip.tsx`, `CalendarDayCell.tsx`, `MonthCalendar.tsx`, `DayActivitiesModal.tsx`.
- [x] `pages/ScheduleView.tsx` + ruta en `App.tsx` + entrada en `Sidebar.tsx`.
- [x] `npm run build` (tsc + vite) y `npm run lint` sin errores nuevos — verificación de dark mode/responsive real queda para la ronda manual (`TC-025-*`), que ejecuta el usuario.

### Fase 4 — MCP: actualizar `todo-api` ✅ Completada
- [x] Agregar `get_activities_by_month` en `mcp.service.ts` como wrapper de `activitiesService.findByMonth()`, con schema Zod alineado 1:1 con `ScheduleQueryDto` (`year`, `month`).
- [x] Registrar la tool en la tabla de `backend/CLAUDE.md` ("Tools disponibles"). `docs/mcps/README.md` no requirió cambios (es un índice de MCPs, no de tools individuales — mismo criterio que spec-024).
- [x] Actualizar `docs/mcps/asistente-personal.system-prompt.md` con la nueva capacidad (tabla de consultas especializadas + tabla de "Consultas y flujos frecuentes").
- [ ] Verificar con una llamada real al MCP que la tool responde el set esperado (`TC-MCP-025-001`) — pendiente de la ronda de pruebas manuales (Fase 5).

### Fase 5 — Pruebas ✅ Completada
- [x] `@tester` ejecuta unitarios + e2e y confirma verde: 29/29 unitarios, 44/46 e2e (2 fallas preexistentes, ajenas a spec-025), 6/6 e2e y 6/6 unitarios específicos de spec-025 en verde, sin regresiones de los 3 fixes de frontend.
- [x] El usuario ejecuta `docs/testing/test-025-cronograma-calendario-mensual.md`; Claude prepara datos vía API, guía paso a paso y registra hallazgos. **9/9 casos manuales aprobados (`TC-025-001`–`009`)**; `TC-MCP-025-001` diferido a post-despliegue (MCP de la sesión apunta a producción).
- [x] Limpieza de datos de prueba y cierre del resumen de la ronda — 0 registros huérfanos verificados.

**Bug encontrado y corregido durante la ronda manual (`TC-025-007`):**
`ScheduleView` no mostraba ningún `EmptyState` cuando el mes no tenía
actividades — solo la grilla vacía. Corregido: se agregó
`<EmptyState message="No tienes actividades este mes." />` cuando
`data.length === 0`, sin ocultar la grilla. `npm run build`/`npm run lint`
verificados.

**Bug encontrado y corregido durante la ronda manual (`TC-025-003`):**
`DayActivitiesModal` mostraba un snapshot congelado de las actividades del día
(capturado en `ScheduleView` al hacer clic en la celda), por lo que una
edición inline dentro del modal se persistía correctamente en el backend pero
no se reflejaba visualmente. Corregido: `ScheduleView` ahora solo guarda la
fecha seleccionada en estado y deriva las actividades del día en cada render
desde los datos vivos de `useScheduleActivities` — ver
`frontend/src/pages/ScheduleView.tsx`, `CalendarDayCell.tsx`,
`MonthCalendar.tsx`. `npm run build`/`npm run lint` verificados tras el fix.

### Fase 6 — Revisión y cierre de la implementación original
> Reemplazada por la Fase 9 tras la ampliación — se deja el checklist original
> sin marcar; la revisión de código final cubre implementación + ampliación
> juntas.
- [ ] `@reviewer` audita el diff completo contra `development`.
- [ ] Marcar el spec como `[DONE]` solo si todos los criterios están verificados.

### Fase 7 — Frontend: filtro por proyecto en el Cronograma ✅ Completada
- [x] Releer `frontend/DESIGN.md` antes de escribir UI.
- [x] `lib/scheduleFilters.ts` (nuevo): `NO_PROJECT`, `ProjectFilterValue`, `matchesProjectFilter()`. Movido acá desde `ProjectFilter.tsx` (plan original) porque `react-refresh/only-export-components` no permite que un archivo de componente exporte también constantes/tipos/funciones — lint lo detectó al primer intento.
- [x] `components/schedule/ProjectFilter.tsx`: `<select>` nativo con opciones Todos/Sin proyecto/proyectos.
- [x] `pages/ScheduleView.tsx`: estado `projectFilter`, fila de filtros, `filteredActivities` antes de `groupActivitiesByDate`, empty state diferenciado con botón "Ver todas".
- [x] Verificado que `DayActivitiesModal` refleja el filtro (deriva de `activitiesByDate`, ya filtrado) y que el fix de datos vivos de `TC-025-003` sigue intacto.
- [x] `frontend/CLAUDE.md`: agregado `ProjectFilter.tsx`/`scheduleFilters.ts` al inventario.
- [x] `npm run build` y `npm run lint` sin errores nuevos (4 preexistentes ajenos).

### Fase 8 — Pruebas de la ampliación (ronda manual 2)
- [ ] `docs/testing/test-025-cronograma-calendario-mensual.md`: sección "Ronda 2 — filtro por proyecto", casos `TC-025-010`–`013` (ver "Pruebas asociadas" más abajo), redactados junto con esta ampliación (test-first).
- [ ] El usuario ejecuta la ronda 2; Claude prepara datos vía API, guía y registra hallazgos.
- [ ] Limpieza de los datos de la ronda 2.

### Fase 9 — Revisión y cierre final
- [ ] `@reviewer` audita el diff completo contra `development` (implementación original + ampliación juntas).
- [ ] Marcar el spec como `[DONE]` solo si AC-1 a AC-16 están verificados, ambas rondas manuales aprobadas, y `TC-MCP-025-001` resuelto (hoy diferido a post-despliegue — su resolución no bloquea el `[DONE]` si se documenta como deuda de verificación post-deploy, a decidir con el usuario en esa fase).

## Criterios de aceptación

1. `GET /activities/schedule?year=&month=` devuelve únicamente actividades
   con `parent IS NULL` y `isTemplate = false`.
2. El resultado incluye actividades cuya `COALESCE(dueDate, instanceDate)`
   cae dentro del rango visible de la grilla (mes objetivo + relleno
   Lunes–Domingo), y excluye las que caen fuera de ese rango.
3. El resultado incluye actividades sin `dueDate` pero con `instanceDate`
   dentro del rango (instancias de tareas recurrentes).
4. El resultado excluye actividades sin `dueDate` **y** sin `instanceDate`
   (backlog).
5. El resultado incluye actividades con `status: completed` dentro del rango
   (no se filtran, a diferencia de Hoy/Semana/Vencidas).
6. `year`/`month` fuera de rango o ausentes devuelven `400`.
7. En la UI, `/activities/schedule` muestra una grilla mensual con los días
   de relleno del mes anterior/siguiente poblados correctamente.
8. Al navegar a mes anterior/siguiente, el mes se actualiza sin parpadeo de
   skeleton completo (se mantienen los datos previos mientras cargan los
   nuevos).
9. Al hacer clic en un día con actividades, se abre el detalle con la lista
   de esas actividades usando `ActivityCard` (edición/borrado funcionan
   igual que en el resto de la app).
10. Las actividades completadas se muestran atenuadas, no ocultas.
11. La vista respeta dark mode según `DESIGN.md`.
12. El agente puede invocar `get_activities_by_month` y obtener el mismo
    conjunto de actividades que el endpoint REST para el mismo mes/año.

### Criterios de aceptación — ampliación (filtro por proyecto)

13. La vista ofrece un selector único de proyecto con las opciones "Todos",
    cada proyecto existente y "Sin proyecto"; el valor por defecto es "Todos".
14. Al seleccionar un proyecto, la grilla, los chips, el contador "+X más" y
    el modal del día muestran únicamente actividades de ese proyecto; al
    seleccionar "Sin proyecto", únicamente actividades con `project: null`.
15. El filtrado no dispara ninguna petición nueva al backend (la query key
    `['activities','schedule',year,month]` no cambia) y el filtro se
    conserva al navegar entre meses.
16. Si el filtro no arroja resultados en el mes visible, se muestra un estado
    vacío específico que permite volver a "Todos", distinto del estado vacío
    de "mes sin actividades" (`TC-025-007`).

## Pruebas asociadas

> Estos archivos se crean junto con el spec (ver "Artefactos que acompañan al
> spec" en `CLAUDE.md`).

- **Manuales:** `docs/testing/test-025-cronograma-calendario-mensual.md` —
  casos `TC-025-*` y `TC-MCP-025-001`.
- **Automáticas (backend):**
  - `backend/test/e2e-025-cronograma-calendario-mensual.e2e-spec.ts` — un
    caso por criterio de aceptación verificable vía API (1–6).
  - `backend/src/activities/activities.service.spec.ts` — casos unitarios de
    `findByMonth()`: cálculo del rango visible, filtros de plantilla/
    subtarea, `COALESCE`, no-filtrado de `status`.
  - La ampliación (filtro por proyecto, AC-13 a AC-16) es 100% frontend, sin
    tocar backend — no agrega pruebas automáticas; se cubre solo con la ronda
    manual 2 (`TC-025-010`–`013`), consistente con que el frontend no tiene
    suite automatizada.

## Aprobación de implementación

> Claude no escribe código de implementación hasta que esta sección esté marcada.

- [x] Paquete (spec + pruebas) aprobado por el usuario
- **Fecha de aprobación:** 2026-08-13

### Aprobación de la ampliación (filtro por proyecto)

- [x] Paquete de la ampliación (spec + casos `TC-025-010`–`013`) aprobado por el usuario
- **Fecha de aprobación:** 2026-08-14
- **Decisión de diseño confirmada:** el empty state de "filtro sin resultados"
  reutiliza el componente `EmptyState` (mensaje distinto al de `TC-025-007`)
  con un botón que limpia el filtro a "Todos" — no un mensaje inline junto al
  selector.
- **Sin caso de prueba dedicado** para proyectos `completed`/`inactive`/
  `paused` listados en el selector — queda cubierto implícitamente por
  `useProjects()` sin filtro de status; se deja como nota en `TC-025-010`, no
  como caso aparte.
