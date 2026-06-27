# CLAUDE.md — Backend

Referencia técnica del backend del proyecto ToDo. Actualizar cuando cambien endpoints, entidades, lógica de negocio o convenciones.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | NestJS 11 + TypeScript 5.7 |
| ORM | TypeORM |
| Base de datos | PostgreSQL 16 (Docker, puerto **5433**, db: `todo_db`) |
| Validación | `class-validator` + `class-transformer` |
| Documentación | Swagger / OpenAPI (`@nestjs/swagger`) |
| MCP | `@modelcontextprotocol/sdk` (JSON-RPC sobre HTTP en `/mcp`) |

**Puerto:** `3000`
**Prefijo global:** `/api/v1` (excepto `/mcp`)
**Swagger UI:** `http://localhost:3000/api/v1/docs`

---

## Variables de Entorno (`.env`)

```env
DB_HOST=localhost
DB_PORT=5433
DB_NAME=todo_db
DB_USER=todo_user
DB_PASSWORD=todo_password
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

---

## Estructura de Módulos

```
src/
├── main.ts                        Bootstrap, CORS, pipes, filtros, Swagger
├── app.module.ts                  Módulo raíz — importa Projects, Activities, Mcp
├── data-source.ts                 DataSource TypeORM para CLI de migraciones
│
├── projects/
│   ├── entities/project.entity.ts
│   ├── dto/create-project.dto.ts
│   ├── dto/update-project.dto.ts
│   ├── projects.service.ts
│   └── projects.controller.ts
│
├── activities/
│   ├── entities/activity.entity.ts
│   ├── dto/create-activity.dto.ts
│   ├── dto/update-activity.dto.ts
│   ├── activities.service.ts      Lógica de negocio + queries especializadas
│   └── activities.controller.ts   Endpoints REST
│
├── mcp/
│   ├── mcp.service.ts             Define tools MCP (proyecta sobre services)
│   └── mcp.controller.ts          Endpoint /mcp (JSON-RPC + SSE)
│
├── common/
│   ├── dto/pagination.dto.ts      page (min 1) · limit (min 1, max 100, default 20)
│   ├── enums/                     Todos los enums del dominio
│   ├── filters/http-exception.filter.ts
│   └── interceptors/transform.interceptor.ts
│
└── migrations/                    Migraciones explícitas (synchronize: false)
    ├── 1776080084318-InitialSchema.ts
    ├── 1776475116575-AddDescriptionToActivities.ts
    └── 1776800000000-AddAutomatizacionToActivities.ts
```

---

## Entidades

### Project (`projects`)

| Campo | Tipo DB | Notas |
|-------|---------|-------|
| `id` | `uuid` PK | generado |
| `name` | `varchar(255)` | requerido |
| `status` | `enum` | default `active` |
| `startDate` | `date` | requerido |
| `endDate` | `date` | nullable |
| `activities` | relación | `OneToMany → Activity` |
| `createdAt` / `updatedAt` | `timestamptz` | auto |

### Activity (`activities`)

| Campo | Tipo DB | Notas |
|-------|---------|-------|
| `id` | `uuid` PK | generado |
| `name` | `varchar(255)` | requerido |
| `description` | `text` | nullable |
| `project` | FK → `projects` | nullable, `onDelete: CASCADE` |
| `parent` | FK → `activities` | nullable, auto-referencial, `onDelete: SET NULL` |
| `subtasks` | relación | `OneToMany → Activity (self)` |
| `dueDate` | `timestamptz` | nullable — fecha límite (task) o fecha+hora del recordatorio (reminder) |
| `priority` | `enum` | default `medium` |
| `status` | `enum` | default `pending` |
| `energy` | `enum` | default `medium` |
| `type` | `enum` | default `task` |
| `scheduledForToday` | `boolean` | default `false` — aparece en la vista Today |
| `notionUrl` | `varchar` | nullable — URL de página Notion asociada |
| `isTemplate` | `boolean` | default `false` — es plantilla de recurrencia |
| `isRecurring` | `boolean` | default `false` — tiene recurrencia activa |
| `templateId` | `uuid` FK | nullable — apunta a la plantilla que generó esta instancia |
| `instances` | relación | `OneToMany → Activity (self)` — instancias generadas por la plantilla |
| `recurrenceFrequency` | `varchar` | nullable — `daily \| weekly \| biweekly \| monthly \| yearly` |
| `recurrenceDays` | `integer[]` | nullable — días de la semana (0=Dom … 6=Sáb) |
| `recurrenceDayOfMonth` | `integer` | nullable — día del mes (1–31) |
| `recurrenceEndDate` | `timestamptz` | nullable — hasta cuándo generar instancias |
| `instanceDate` | `date` | nullable — fecha de esta instancia específica |
| `createdAt` / `updatedAt` | `timestamptz` | auto |

---

## Enums

```
ProjectStatus:        active | inactive | paused | completed
ActivityStatus:       pending | in_progress | completed | cancelled | on_hold
ActivityType:         task | reminder
Priority:             high | medium | low
Energy:               high | medium | low
RecurrenceFrequency:  daily | weekly | biweekly | monthly | yearly
```

Ubicación: `src/common/enums/`

---

## Endpoints REST

### Formato de respuesta

**Éxito:**
```json
{ "statusCode": 200, "message": "success", "data": <payload> }
```
**Error:**
```json
{ "statusCode": 404, "message": "...", "data": null, "path": "...", "timestamp": "..." }
```

### Projects — `/api/v1/projects`

| Método | Ruta | Body / Params | Respuesta |
|--------|------|---------------|-----------|
| `GET` | `/projects` | `?status=` (opcional) | `Project[]` |
| `GET` | `/projects/:id` | UUID | `Project` |
| `POST` | `/projects` | `CreateProjectDto` | `Project` 201 |
| `PATCH` | `/projects/:id` | UUID + `UpdateProjectDto` | `Project` |
| `DELETE` | `/projects/:id` | UUID | 204 |

### Activities — `/api/v1/activities`

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/activities` | Lista paginada |
| `GET` | `/activities/today` | `dueDate` en el día actual o `scheduledForToday = true` |
| `GET` | `/activities/tomorrow` | `dueDate` mañana |
| `GET` | `/activities/this-week` | Semana actual (Lun–Dom) por `dueDate` |
| `GET` | `/activities/overdue` | Vencidas y no completadas (ver lógica) |
| `GET` | `/activities/without-project` | Sin proyecto asociado |
| `GET` | `/activities/project/:projectId` | Por proyecto |
| `GET` | `/activities/type/:type` | Por tipo |
| `GET` | `/activities/priority/:priority` | Por prioridad |
| `GET` | `/activities/status/:status` | Por status |
| `GET` | `/activities/search/:query` | ILIKE en name, description, project.name |
| `GET` | `/activities/:id` | Con project, parent y subtasks |
| `GET` | `/activities/:id/subtasks` | Subtareas de una actividad |
| `GET` | `/activities/:id/instances` | Instancias generadas por una plantilla recurrente |
| `POST` | `/activities` | Crear actividad / subtarea / plantilla recurrente |
| `PATCH` | `/activities/:id` | Actualizar |
| `DELETE` | `/activities/:id` | Eliminar (204) |
| `DELETE` | `/activities/:id/future-instances` | Cancelar instancias futuras pendientes (204) |

**Paginación** (query params en todos los GET de lista): `page` (default 1) · `limit` (default 20, max 100)

**Orden de resultados** (aplicado en `baseQuery`): `dueDate ASC NULLS LAST` → prioridad (`high=1, medium=2, low=3`)

---

## Lógica de Negocio Importante

### Sanitización por tipo (`sanitizeByType`)

Al crear o actualizar, el servicio limpia campos que no aplican según el tipo:

| Tipo | Comportamiento |
|------|----------------|
| `task` | `dueDate` se trunca a medianoche (sin componente horario) |
| `reminder` | `dueDate` se usa tal cual como fecha+hora del recordatorio |

### Lógica de vencimiento (`findOverdue`)

- `task`: vencida si `dueDate < hoy 00:00` y `status != 'completed'`
- `reminder`: vencida si `dueDate < ahora` y `status != 'completed'`

### Semántica de `dueDate` por tipo

| Tipo | Semántica de `dueDate` |
|------|------------------------|
| `task` | Fecha límite (hora truncada a 00:00:00) |
| `reminder` | Fecha y hora exacta del recordatorio |

---

## Infraestructura Global (`main.ts`)

| Mecanismo | Comportamiento |
|-----------|---------------|
| `ValidationPipe` | `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true` |
| `TransformInterceptor` | Envuelve todas las respuestas en `{ statusCode, message, data }` |
| `HttpExceptionFilter` | Normaliza errores en `{ statusCode, message, data: null, path, timestamp }` |
| CORS | Origen: `FRONTEND_URL` env var (default `http://localhost:5173`) |
| Swagger | Disponible en `/api/v1/docs` |

---

## Servidor MCP (`/mcp`)

El endpoint `/mcp` expone las mismas capacidades que el REST API como tools MCP para agentes de IA. Cada request crea un `McpServer` nuevo (stateless).

**Tools disponibles:**

| Tool | Descripción |
|------|-------------|
| `list_projects` | Lista proyectos, filtra por status |
| `get_project` | Obtiene proyecto por UUID |
| `create_project` | Crea proyecto |
| `update_project` | Actualiza proyecto |
| `delete_project` | Elimina proyecto |
| `list_activities` | Lista actividades paginadas |
| `get_activity` | Obtiene actividad por UUID |
| `create_activity` | Crea actividad o subtarea |
| `update_activity` | Actualiza actividad (incluye campos de recurrencia) |
| `delete_activity` | Elimina actividad |
| `get_today_activities` | Actividades de hoy (dueDate o scheduledForToday) |
| `get_tomorrow_activities` | Actividades de mañana |
| `get_this_week_activities` | Actividades de la semana actual |
| `get_overdue_activities` | Actividades vencidas |
| `get_activities_without_project` | Actividades sin proyecto asociado |
| `get_activities_by_project` | Por proyecto |
| `get_activities_by_type` | Por tipo |
| `get_activities_by_priority` | Por prioridad |
| `get_activities_by_status` | Por status |
| `search_activities` | Búsqueda ILIKE en name, description, project.name |
| `get_activity_subtasks` | Subtareas de una actividad |
| `create_recurring_activity` | Crea plantilla de actividad recurrente |
| `get_activity_instances` | Instancias generadas por una plantilla |
| `cancel_future_instances` | Cancela instancias futuras pendientes de una plantilla |

---

## Base de Datos

- **Motor:** PostgreSQL 16 en Docker (`docker-compose.yml`, puerto externo `5433`)
- **`synchronize: false`** — nunca se sincronizan esquemas automáticamente
- **Migraciones:** `npx typeorm migration:run -d src/data-source.ts`
- **Generar migración:** `npx typeorm migration:generate src/migrations/<Nombre> -d src/data-source.ts`

---

## Convenciones

- Los servicios lanzan `NotFoundException` cuando no encuentran una entidad por ID
- Nunca usar `synchronize: true` — siempre migraciones explícitas
- Los enums viven en `src/common/enums/` — uno por archivo
- Los DTOs usan `@IsOptional()` + decoradores de validación estrictos
- `UpdateActivityDto` y `UpdateProjectDto` son `PartialType` de sus Create
- El `baseQuery()` siempre hace `leftJoinAndSelect` de `project`, `parent` y `subtasks` para devolver entidades completas
- La lógica de negocio va en el servicio, nunca en el controlador

---

## Archivos Clave

| Archivo | Rol |
|---------|-----|
| `src/main.ts` | Bootstrap, CORS, pipes, filtros, Swagger |
| `src/app.module.ts` | Módulo raíz |
| `src/data-source.ts` | Config TypeORM / CLI migraciones |
| `src/activities/activities.service.ts` | Toda la lógica de actividades |
| `src/activities/activities.controller.ts` | Endpoints REST actividades |
| `src/activities/dto/create-activity.dto.ts` | Validaciones + semántica de fechas |
| `src/projects/projects.service.ts` | CRUD de proyectos |
| `src/mcp/mcp.service.ts` | Definición de tools MCP |
| `src/common/interceptors/transform.interceptor.ts` | Wrapper de respuestas |
| `src/common/filters/http-exception.filter.ts` | Formato de errores |

