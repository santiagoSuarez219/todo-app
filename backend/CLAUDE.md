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
| `project` | FK → `projects` | nullable, `onDelete: SET NULL` |
| `parent` | FK → `activities` | nullable, auto-referencial |
| `subtasks` | relación | `OneToMany → Activity (self)` |
| `actionDate` | `timestamptz` | nullable |
| `dueDate` | `timestamptz` | nullable |
| `priority` | `enum` | default `medium` |
| `status` | `enum` | default `pending` |
| `energy` | `enum` | default `medium` |
| `type` | `enum` | default `task` |
| `device` | `enum` | nullable |
| `duration` | `numeric` | nullable |
| `durationUnit` | `enum` | nullable |
| `location` | `varchar(255)` | nullable |
| `automatizacion` | `enum` | nullable |
| `createdAt` / `updatedAt` | `timestamptz` | auto |

---

## Enums

```
ProjectStatus:   active | inactive | paused | completed
ActivityStatus:  pending | in_progress | completed | cancelled | on_hold
ActivityType:    task | event | reminder
Priority:        high | medium | low
Energy:          high | medium | low
Device:          phone | computer | tablet
DurationUnit:    hours | days
Automatizacion:  fully_automatable | partially_automatable | not_automatable
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
| `GET` | `/activities/today` | `actionDate` o `dueDate` en el día actual |
| `GET` | `/activities/tomorrow` | `actionDate` o `dueDate` mañana |
| `GET` | `/activities/this-week` | Semana actual (Lun–Dom) |
| `GET` | `/activities/overdue` | Vencidas y no completadas (ver lógica) |
| `GET` | `/activities/project/:projectId` | Por proyecto |
| `GET` | `/activities/type/:type` | Por tipo |
| `GET` | `/activities/priority/:priority` | Por prioridad |
| `GET` | `/activities/status/:status` | Por status |
| `GET` | `/activities/search/:query` | ILIKE en name, description, project.name |
| `GET` | `/activities/:id` | Con project, parent y subtasks |
| `GET` | `/activities/:id/subtasks` | Subtareas de una actividad |
| `POST` | `/activities` | Crear actividad / subtarea |
| `PATCH` | `/activities/:id` | Actualizar |
| `DELETE` | `/activities/:id` | Eliminar (204) |

**Paginación** (query params en todos los GET de lista): `page` (default 1) · `limit` (default 20, max 100)

**Orden de resultados** (aplicado en `baseQuery`): `actionDate ASC NULLS LAST` → `dueDate ASC NULLS LAST` → prioridad (`high=1, medium=2, low=3`)

---

## Lógica de Negocio Importante

### Sanitización por tipo (`sanitizeByType`)

Al crear o actualizar, el servicio limpia campos que no aplican según el tipo:

| Tipo | Campos forzados a `null`/`undefined` |
|------|--------------------------------------|
| `reminder` | `dueDate`, `duration`, `durationUnit`, `device`, `location`, `automatizacion`, `parentId` |
| `event` | `duration`, `durationUnit`, `device`, `location`, `automatizacion`, `parentId` |
| `task` | `actionDate` y `dueDate` se truncan a medianoche (sin componente horario) |

### Lógica de vencimiento (`findOverdue`)

- `task` / `event`: vencida si `dueDate < hoy 00:00`
- `reminder`: vencida si `actionDate < ahora`
- En todos los casos: `status != 'completed'`

### Semántica de fechas por tipo

| Campo | `task` | `event` | `reminder` |
|-------|--------|---------|-----------|
| `actionDate` | Fecha de acción (00:00:00) | Inicio del evento | Fecha y hora del recordatorio |
| `dueDate` | Fecha límite (00:00:00) | Fin del evento | Ignorado (forzado null) |

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
| `update_activity` | Actualiza actividad |
| `delete_activity` | Elimina actividad |
| `get_today_activities` | Actividades de hoy |
| `get_tomorrow_activities` | Actividades de mañana |
| `get_this_week_activities` | Actividades de la semana |
| `get_overdue_activities` | Actividades vencidas |
| `get_activities_by_project` | Por proyecto |
| `get_activities_by_type` | Por tipo |
| `get_activities_by_priority` | Por prioridad |
| `get_activities_by_status` | Por status |
| `get_activity_subtasks` | Subtareas de una actividad |

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

## Git — Branching & Commits

### Estructura de ramas

| Propósito | Prefijo | Ejemplo |
|-----------|---------|---------|
| Nueva funcionalidad o spec | `feature/` | `feature/offline-sync` |
| Corrección de bug | `bug/` | `bug/login-token-refresh` |
| Preparación de despliegue | `deploy/` | `deploy/v1.0.0-android` |

- `main` — rama de producción; solo recibe merges desde `deploy/`.
- `development` — rama de integración y pruebas; **todas las ramas `feature/` y `bug/` se desprenden de aquí**.
- Una vez mergeada una rama a `development`, **eliminar la rama de origen**.
- Los ajustes de despliegue se implementan en `deploy/<nombre>` y se mergean a `main`.

### Commits

- Crear commits cuando la cantidad de cambios lo amerite (no hacer commits triviales de un solo carácter).
- Los mensajes de commit deben estar **completamente en inglés** y seguir Conventional Commits:

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

Tipos válidos: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `style`, `perf`, `ci`.

Ejemplos:
```
feat(auth): add JWT persistence in expo-secure-store
fix(sync): prevent duplicate batch upload on reconnect
chore(deps): upgrade expo-sqlite to v14
```

---

## Formato de Análisis Técnico

```markdown
# Análisis Técnico: [Feature]

## Problema

[Descripción del problema a resolver]

## Impacto Arquitectural

- Backend: [cambios en modelos, servicios, API]
- Frontend: [cambios en componentes, estado, UI]
- Base de datos: [nuevas tablas, relaciones, índices]

## Propuesta de Solución

[Diseño técnico siguiendo Clean Architecture]

## Plan de Implementación

1. [Paso 1]
2. [Paso 2]
   ...

## Prioridades de implementación

1. Estructura base: Expo Router + Zustand + esquema SQLite
2. Autenticación: login, persistencia de token, headers en requests
3. Descarga y caché offline de instrumentos
4. Flujo completo de encuesta (navegación + validación + guardado local)
5. Sync con backend (upload de surveys pendientes)
6. GPS y construcción de polígonos
7. Multimodalidad: voz e imágenes

## AskUserQuestion
Utiliza la herramienta `AskUserQuestion` para aclarar cualquier duda sobre requisitos, diseño o implementación antes de comenzar a escribir código.