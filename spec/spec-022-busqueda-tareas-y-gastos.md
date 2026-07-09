# spec-022 — [TESTING] Búsqueda de tareas y gastos con scope

## Contexto

Hoy no existe ninguna barra de búsqueda funcional en la UI. El backend ya tiene
un endpoint de búsqueda de actividades (`GET /activities/search/:query`) y el
frontend tiene el hook `useSearchActivities` / servicio `searchActivities`, pero
**nunca se usan en ninguna página**. En gastos, `GET /expenses` ya filtra por
`year`/`month` pero no permite buscar por texto.

El usuario necesita:
1. Buscar tareas por texto, con dos scopes:
   - **Global**: en la ventana principal de todas las tareas (Dashboard, `/`).
   - **Por proyecto**: dentro de la vista de detalle de un proyecto.
2. Buscar gastos por texto, dentro del scope **mes + año** que ya existe.

## Alcance

**Incluye:**
- Búsqueda de actividades por nombre/descripción/nombre de proyecto (ya soportado
  por el backend), con filtro opcional adicional por proyecto.
- Búsqueda de gastos por descripción, combinable con los filtros de mes/año
  actuales.
- Un componente `SearchBar` reutilizable y un hook `useDebounce`.
- Actualización de las tools MCP `search_activities` y `list_expenses`.

**No incluye:**
- Búsqueda en otras secciones financieras (ingresos, compras, cuentas, etc.).
- Búsqueda difusa / full-text avanzada (índices GIN `pg_trgm`) — se deja como
  deuda técnica opcional en `spec/backlog.md`.
- Filtros nuevos por prioridad/estado/energía dentro de la búsqueda (los tabs
  existentes ya cubren eso y se combinan con la búsqueda).

## Impacto en el sistema

### Backend (`backend/src/`)

| Archivo | Acción |
|---------|--------|
| `activities/activities.service.ts` | `search()` acepta 3er parámetro opcional `projectId?`; `andWhere('activity.projectId = :projectId')` solo si viene. No cambia ILIKE ni `baseQuery()`/orden. |
| `activities/activities.controller.ts` | Handler `search` (~135): añadir `@Query('projectId') projectId?: string` y reenviarlo al servicio. |
| `finances/dto/expenses-query.dto.ts` | Añadir `search?: string` opcional (`@IsOptional()` + `@IsString()` + `@ApiPropertyOptional`). |
| `finances/expenses.service.ts` | `findAll()`: desestructurar `search` y añadir `andWhere('expense.description ILIKE :search')` cuando venga con texto (trim), combinable con year/month/creditCardId. Mantener orden `date DESC`. |
| `mcp/mcp.service.ts` | (Fase MCP) `search_activities` + `projectId` opcional; `list_expenses` alineado a `ExpensesQueryDto` (year/month/creditCardId/search). |
| `activities/*.spec.ts` · `finances/*.spec.ts` | Casos felices Jest (ver Testing). |

**Migración:** no se requiere. Ambas búsquedas son ILIKE sobre columnas ya
existentes + filtro por FK ya presente (`activity.projectId`). Índices `pg_trgm`
quedan como optimización opcional documentada en backlog.

**Nota de diseño (asimetría intencional):** en `activities` el scope por proyecto
se añade como **query param suelto** (`projectId`) porque el endpoint ya recibe
`@Query() pagination` y es el cambio mínimo retrocompatible; en `expenses` el
`search` se añade **dentro del `ExpensesQueryDto`** porque ese módulo ya usa un
DTO de query con múltiples filtros. Cada módulo mantiene su patrón previo.

### Frontend (`frontend/src/`)

| Archivo | Acción |
|---------|--------|
| `hooks/useDebounce.ts` | **Crear** — `useDebounce<T>(value, delayMs)` genérico, sin dependencias. |
| `components/SearchBar.tsx` | **Crear** — input controlado (props `value`, `onChange`, `placeholder?`, `onClear?`), icono de lupa + botón X, tokens de `DESIGN.md` con dark mode. Named export. |
| `types/index.ts` | **Editar** — `ActivitySearchParams extends PaginationParams { projectId?: string }`. No modificar `PaginationParams`. |
| `services/activities.service.ts` | **Editar** — `searchActivities(query, params?: ActivitySearchParams)`; `projectId` viaja en `params`. |
| `hooks/useActivities.ts` | **Editar** — `useSearchActivities` tipa `ActivitySearchParams`; `enabled` con query ≥ 2 caracteres. |
| `services/finances/expenses.service.ts` | **Editar** — `getExpenses(params, year, month, search?)`. |
| `hooks/finances/useExpenses.ts` | **Editar** — `search` en firma y query key `['expenses', params, year, month, search]`. |
| `pages/Dashboard.tsx` | **Editar** — SearchBar global sobre "Todas las tareas"; `useSearchActivities` server-side coexistiendo con tabs. |
| `pages/ProjectDetail.tsx` | **Editar** — SearchBar con `projectId=id`; coexiste con tabs. |
| `pages/finances/ExpensesView.tsx` | **Editar** — SearchBar junto a los selects mes/año. |

**Query keys:** actividades reutiliza `['activities','search', query, params]` (el
`projectId` entra vía `params`). Gastos añade `search` al final:
`['expenses', params, year, month, search]`.

**Coexistencia con filtros existentes:**
- *Dashboard / ProjectDetail*: cuando el término (debounced) no está vacío, la
  fuente de datos pasa a ser el resultado server-side de búsqueda; sobre esa
  fuente se sigue aplicando el filtro del tab activo y se recalculan contadores.
  Al vaciar el input, vuelve la lista original y los tabs íntegros.
- *ExpensesView*: los selects mes/año siguen mandando el fetch; el `search`
  (debounced) se añade como parámetro más, refinando dentro del scope mes/año.

### Decisión — gastos server-side (no client-side)

Se evaluó filtrar gastos en cliente (la lista del mes ya se carga con
`limit:100`). Se descarta a favor de **server-side** porque: (1) el `limit:100`
trunca hoy en silencio meses grandes y client-side heredaría ese punto ciego;
(2) el costo backend es mínimo (~4 líneas) y consistente con el filtrado
year/month que ya es server-side; (3) habilita la tool MCP `list_expenses` para
buscar de verdad. La búsqueda de actividades es server-side de forma obligatoria
porque el Dashboard solo carga `limit:50`.

## Evaluación MCP

**¿Aplica MCP?** Sí.

- **MCP existente a modificar:** `todo-api`.
  - `search_activities` (`mcp.service.ts` ~484): agregar `projectId:
    z.string().uuid().optional()` y pasarlo como 3er argumento a
    `activitiesService.search`.
  - `list_expenses` (`mcp.service.ts` ~605): hoy solo pasa `pagination`; alinear
    su schema Zod al `ExpensesQueryDto` real (`year`, `month`, `creditCardId`,
    `search`) y pasar el objeto completo a `findAll`. Regla: el schema Zod debe
    declarar exactamente los mismos campos que el DTO real.
- **System prompts afectados:**
  `docs/mcps/asistente-personal.system-prompt.md` (búsqueda de tareas por
  proyecto) y `docs/mcps/finanzas-personales.system-prompt.md` (búsqueda de
  gastos por texto + mes/año).
- **Fase de MCP en este spec:** Fase 4 (delegada a `@mcp-builder`, antes de e2e).

## Fases de implementación

### Fase 1 — Backend: búsqueda de actividades con scope por proyecto ✅
- [x] Cambiar el estado del spec a `[IN PROGRESS]`.
- [x] `activities.service.ts`: extender `search(query, pagination, projectId?)`
      manteniendo early-return con término vacío y la cláusula ILIKE; `andWhere`
      por `activity.projectId` solo si `projectId` está presente.
- [x] `activities.controller.ts`: añadir `@Query('projectId', ParseUUIDPipe)` y
      reenviarlo.
- [x] Verificar retrocompatibilidad: sin `projectId`, respuesta idéntica a hoy;
      orden de `baseQuery()` intacto (TypeScript compilation verified).

### Fase 2 — Backend: búsqueda de gastos por texto ✅
- [x] `expenses-query.dto.ts`: añadir `search?: string` opcional.
- [x] `expenses.service.ts` `findAll()`: `andWhere` ILIKE sobre
      `expense.description` cuando `search` venga con texto, combinable con
      year/month/creditCardId.
- [x] Verificar retrocompatibilidad: sin `search`, respuesta idéntica; con
      `search` + year/month los filtros se combinan con AND (TypeScript verified).

### Fase 3 — Frontend: infraestructura + capa de datos ✅
- [x] Leer `frontend/DESIGN.md` (tokens de input, dark mode, focus ring).
- [x] Crear `hooks/useDebounce.ts` (genérico, 300ms default, sin dependencias).
- [x] Crear `components/SearchBar.tsx` (icono lupa, botón X, dark mode, DESIGN.md tokens).
- [x] `types/index.ts`: añadir `PaginationParams` + `ActivitySearchParams`.
- [x] `services/activities.service.ts` + `hooks/useActivities.ts`: tipar
      `ActivitySearchParams`; `enabled` con query ≥ 2 caracteres.
- [x] `services/finances/expenses.service.ts` + `hooks/finances/useExpenses.ts`:
      añadir `search` a firma y query key.

### Fase 4 — MCP: actualizar `todo-api` ✅
> Antes de la fase de pruebas e2e para que `@tester` valide también las tools.
- [x] Extender `search_activities` con `projectId` opcional.
- [x] Extender `list_expenses` con `year`/`month`/`creditCardId`/`search`
      alineados al DTO.
- [x] Verificar que cada schema Zod coincide exactamente con el DTO real
      (year 2000–2100, month 1–12, uuid fields validated).
- [x] Actualizar `docs/mcps/asistente-personal.system-prompt.md` y
      `docs/mcps/finanzas-personales.system-prompt.md`.
- [x] Crear `docs/testing/test-022-busqueda-tareas-gastos.md` con 5 casos MCP + 9 manuales.

### Fase 5 — Frontend: integración en las vistas ✅
- [x] Dashboard: SearchBar global + `useSearchActivities({limit:50})`;
      `sourceList` bajo tabs; estados carga/vacío; reset al limpiar.
- [x] ProjectDetail: SearchBar + `useSearchActivities({limit:100, projectId:id})`;
      coexistencia con tabs y contadores; stat cards se mantienen sobre el total
      del proyecto.
- [x] ExpensesView: SearchBar junto a mes/año; `EmptyState` distingue "sin
      gastos en el mes" de "sin resultados para el término".

### Fase 6 — Tests y cierre
- [ ] Backend: casos felices Jest (actividades por proyecto + retrocompat global;
      gastos por texto + combinación con year/month). Ejecutar `npm run test`.
- [ ] Crear `docs/testing/test-022-busqueda-tareas-y-gastos.md` (casos manuales
      UI + `TC-MCP-NNN`).
- [ ] Cambiar el estado del spec a `[TESTING]`.
- [ ] Tras aprobación manual, invocar `@tester` para e2e y marcar `[DONE]`.

## Criterios de aceptación

- `GET /activities/search/:query` sin `projectId` → resultados globales (igual
  que hoy).
- `GET /activities/search/:query?projectId=<uuid>` → solo actividades de ese
  proyecto que matchean el término.
- `GET /expenses?search=<texto>` filtra por `description` (ILIKE), combinable con
  `year`/`month`/`creditCardId`; sin `search` conserva el comportamiento actual.
- El usuario puede buscar tareas en el Dashboard y encontrar resultados más allá
  de las 50 cargadas inicialmente (valida server-side).
- La búsqueda en ProjectDetail solo devuelve tareas del proyecto actual.
- La búsqueda de gastos refina dentro del mes/año seleccionados.
- La búsqueda y los tabs/filtros existentes se combinan sin romperse; al limpiar
  el input, la vista vuelve a su estado previo.
- (MCP) El agente puede invocar `search_activities` con `projectId` y
  `list_expenses` con `year`/`month`/`search` y obtener resultados filtrados.

## Pruebas e2e (si aplica)

Backend (`@tester`, `backend/test/`):
- `GET /activities/search/:query` con y sin `projectId`.
- `GET /expenses` con `search` combinado con `year`/`month`.
- Tools MCP `search_activities` (con `projectId`) y `list_expenses` (con
  `year`/`month`/`search`).

Manuales (frontend, `docs/testing/test-022`): Dashboard (server-side, búsqueda +
tab, sin resultados, < 2 chars), ProjectDetail (aislamiento por proyecto),
ExpensesView (refinado dentro del mes, EmptyState diferenciado), dark mode del
SearchBar, y verificación de debounce en Network.
