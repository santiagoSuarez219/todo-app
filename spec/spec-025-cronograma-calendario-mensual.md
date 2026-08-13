# spec-025 — [NOT STARTED] Cronograma — vista de calendario mensual de actividades

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

### Fase 1 — Backend: endpoint de cronograma
- [ ] `schedule-query.dto.ts`: `year` + `month`, `@Type(() => Number)`, `@IsInt`, `@Min`/`@Max`.
- [ ] `activities.service.ts`: helper de rango visible de grilla (Lunes de la semana del día 1 → Domingo de la semana del último día) + `findByMonth(query)` sobre `baseQuery()` con los filtros descritos en "Impacto en el sistema".
- [ ] `activities.controller.ts`: `@Get('schedule')`, ubicado antes de `@Get(':id')`, con anotaciones Swagger consistentes con el resto del controlador.
- [ ] Poner en verde los unitarios y el e2e de este spec.

### Fase 2 — Frontend: capa de datos y utilidades
- [ ] `types/index.ts`: `ScheduleParams`.
- [ ] `services/activities.service.ts`: `getScheduleActivities(year, month)`.
- [ ] `hooks/useActivities.ts`: `useScheduleActivities` con `keepPreviousData`.
- [ ] `lib/calendar.ts`: matriz de semanas + agrupación por fecha local (con prueba manual explícita de zona horaria, ver `TC-025-009`).

### Fase 3 — Frontend: UI del cronograma
- [ ] Releer `frontend/DESIGN.md` antes de escribir UI (tokens, dark mode, badges).
- [ ] `components/schedule/MonthNavigator.tsx`, `ActivityChip.tsx`, `CalendarDayCell.tsx`, `MonthCalendar.tsx`, `DayActivitiesModal.tsx`.
- [ ] `pages/ScheduleView.tsx` + ruta en `App.tsx` + entrada en `Sidebar.tsx`.
- [ ] Verificar dark mode y comportamiento responsive de la grilla (desktop y mobile, aunque no esté en la Tabbar).

### Fase 4 — MCP: actualizar `todo-api`
- [ ] Agregar `get_activities_by_month` en `mcp.service.ts` como wrapper de `activitiesService.findByMonth()`, con schema Zod alineado 1:1 con `ScheduleQueryDto` (`year`, `month`).
- [ ] Registrar la tool en la tabla de `backend/CLAUDE.md` ("Tools disponibles") y en `docs/mcps/README.md` si aplica.
- [ ] Actualizar `docs/mcps/asistente-personal.system-prompt.md` con la nueva capacidad.
- [ ] Verificar con una llamada real al MCP que la tool responde el set esperado (`TC-MCP-025-001`).

### Fase 5 — Pruebas
- [ ] `@tester` ejecuta unitarios + e2e y confirma verde.
- [ ] El usuario ejecuta `docs/testing/test-025-cronograma-calendario-mensual.md`; Claude prepara datos vía API, guía paso a paso y registra hallazgos.
- [ ] Limpieza de datos de prueba y cierre del resumen de la ronda.

### Fase 6 — Revisión y cierre
- [ ] `@reviewer` audita el diff completo contra `development`.
- [ ] Marcar el spec como `[DONE]` solo si todos los criterios están verificados.

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

## Aprobación de implementación

> Claude no escribe código de implementación hasta que esta sección esté marcada.

- [ ] Paquete (spec + pruebas) aprobado por el usuario
- **Fecha de aprobación:** {{fecha}}
