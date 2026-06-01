# CLAUDE.md

Referencia técnica del frontend del proyecto ToDo. Actualizar cuando cambien rutas, tipos, hooks o convenciones.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | React 19 + Vite + TypeScript |
| Routing | React Router 7 |
| Estado servidor | TanStack React Query v5 (`staleTime: 1min`, `retry: 1`) |
| Formularios | React Hook Form 7 + Zod |
| HTTP | Axios — baseURL: `/api/v1` (proxy a `http://localhost:3000`) |
| Estilos | Tailwind CSS 4 vía `@tailwindcss/vite` |
| Fuente | JetBrains Mono (toda la UI) |

**Variables de entorno** (`frontend/.env.local`):
```
VITE_API_URL=http://localhost:3000/api/v1
```

El `api-client.ts` usa `baseURL: '/api/v1'` — Vite hace proxy al backend en desarrollo.

---

## Backend API — Referencia completa

Base: `http://localhost:3000/api/v1`

Todas las respuestas vienen envueltas: `{ data: ... }`

### Projects — `/projects`

| Método | Ruta | Descripción | Params |
|--------|------|-------------|--------|
| `GET` | `/projects` | Listar proyectos | `?status=` (opcional) |
| `GET` | `/projects/:id` | Obtener proyecto | UUID |
| `POST` | `/projects` | Crear proyecto | body: `CreateProjectDto` |
| `PATCH` | `/projects/:id` | Actualizar proyecto | UUID + body |
| `DELETE` | `/projects/:id` | Eliminar proyecto (204) | UUID |

### Activities — `/activities`

| Método | Ruta | Descripción | Params |
|--------|------|-------------|--------|
| `GET` | `/activities` | Listar (paginado) | `?page=&limit=` |
| `GET` | `/activities/today` | Actividades de hoy (por `actionDate`) | paginación |
| `GET` | `/activities/tomorrow` | Actividades de mañana | paginación |
| `GET` | `/activities/this-week` | Actividades semana actual (Lun–Dom) | paginación |
| `GET` | `/activities/overdue` | Vencidas (`dueDate < hoy`, status ≠ completed) | paginación |
| `GET` | `/activities/project/:projectId` | Por proyecto (UUID) | paginación |
| `GET` | `/activities/type/:type` | Por tipo (`task` \| `event` \| `reminder`) | paginación |
| `GET` | `/activities/priority/:priority` | Por prioridad (`high` \| `medium` \| `low`) | paginación |
| `GET` | `/activities/status/:status` | Por status | paginación |
| `GET` | `/activities/search/:query` | Búsqueda por nombre/descripción/proyecto | paginación |
| `GET` | `/activities/:id` | Obtener actividad (incluye project, parent, subtasks) | UUID |
| `GET` | `/activities/:id/subtasks` | Subtareas de una actividad | UUID + paginación |
| `POST` | `/activities` | Crear actividad | body: `CreateActivityDto` |
| `PATCH` | `/activities/:id` | Actualizar actividad | UUID + body |
| `DELETE` | `/activities/:id` | Eliminar actividad (204) | UUID |

**Paginación** — query params: `page` (default 1) · `limit` (default 20)

---

## Rutas del Frontend

| Ruta | Componente | Descripción |
|------|-----------|-------------|
| `/` | `Dashboard` | Overview / estadísticas |
| `/projects` | `ProjectList` | CRUD de proyectos |
| `/projects/:id` | `ProjectDetail` | Proyecto + sus actividades |
| `/activities/today` | `TodayView` | Actividades de hoy |
| `/activities/this-week` | `WeekView` | Actividades de la semana |
| `/activities/overdue` | `OverdueView` | Actividades vencidas |

Todas las rutas están dentro de `<MainLayout>` (sidebar + navbar).

---

## Arquitectura de Capas

```
Pages
  └── Hooks (React Query)
        └── Services (async puras)
              └── api-client (Axios)
                    └── GET/POST/PATCH/DELETE /api/v1/...
```

**Reglas:**
- `src/services/` — funciones async puras, sin React, sin hooks
- `src/hooks/` — envuelven servicios con `useQuery` / `useMutation`
- Las mutations invalidan query keys relevantes en `onSuccess`
- Tipos en `src/types/index.ts` — única fuente de verdad

---

## Query Keys

| Key | Hook | Descripción |
|-----|------|-------------|
| `['activities', params]` | `useActivities` | Lista paginada |
| `['activities', id]` | `useActivity` | Actividad individual |
| `['activities', 'today', params]` | `useTodayActivities` | Hoy |
| `['activities', 'this-week', params]` | `useThisWeekActivities` | Esta semana |
| `['activities', 'overdue', params]` | `useOverdueActivities` | Vencidas |
| `['activities', 'project', projectId, params]` | `useActivitiesByProject` | Por proyecto |
| `['activities', 'search', query, params]` | `useSearchActivities` | Búsqueda |
| `['activities', activityId, 'subtasks']` | `useActivitySubtasks` | Subtareas |
| `['projects', status]` | `useProjects` | Lista de proyectos |
| `['projects', id]` | `useProject` | Proyecto individual |

Las mutations invalidan `['activities']` o `['projects']` completo.

---

## Tipos e Interfaces (`src/types/index.ts`)

### Enums (as const)

```ts
ProjectStatus:   'active' | 'inactive' | 'paused' | 'completed'
ActivityStatus:  'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'
ActivityType:    'task' | 'event' | 'reminder'
Priority:        'high' | 'medium' | 'low'
Energy:          'high' | 'medium' | 'low'
Device:          'phone' | 'computer' | 'tablet'
DurationUnit:    'hours' | 'days'
Automatizacion:  'fully_automatable' | 'partially_automatable' | 'not_automatable'
```

### Interfaces principales

```ts
interface Project {
  id: string; name: string; status: ProjectStatus;
  startDate: string; endDate: string | null;
  createdAt: string; updatedAt: string;
}

interface Activity {
  id: string; name: string; description: string | null;
  project: Project | null; parent: Activity | null; subtasks: Activity[];
  actionDate: string | null; dueDate: string | null;
  priority: Priority; status: ActivityStatus; energy: Energy;
  type: ActivityType; device: Device | null;
  duration: number | null; durationUnit: DurationUnit | null;
  location: string | null; automatizacion: Automatizacion | null;
  createdAt: string; updatedAt: string;
}
```

### DTOs

```ts
interface CreateProjectDto  { name; status?; startDate; endDate? }
interface CreateActivityDto { name; description?; projectId?; parentId?;
  actionDate?; dueDate?; priority?; status?; energy?; type?;
  device?; duration?; durationUnit?; location?; automatizacion? }

type UpdateProjectDto  = Partial<CreateProjectDto>
type UpdateActivityDto = Partial<CreateActivityDto>
```

---

## Componentes Existentes

### Layout
- `components/layout/MainLayout.tsx` — wrapper con sidebar y navbar
- `components/layout/Sidebar.tsx` — navegación lateral
- `components/layout/Navbar.tsx` — barra superior

### Compartidos
- `ActivityCard.tsx` — tarjeta de actividad
- `ActivityForm.tsx` — formulario crear/editar actividad (React Hook Form + Zod)
- `ProjectForm.tsx` — formulario crear/editar proyecto
- `ConfirmDialog.tsx` — modal de confirmación destructiva
- `EmptyState.tsx` — estado vacío reutilizable
- `Modal.tsx` — contenedor modal genérico
- `Pagination.tsx` — paginación
- `PriorityBadge.tsx` — badge de prioridad (`high/medium/low`)
- `StatusBadge.tsx` — badge de status de actividad/proyecto
- `EnergyIndicator.tsx` — indicador de nivel de energía

---

## Sistema de Diseño

Ver [DESIGN.md](DESIGN.md) — paleta, tokens semánticos, tipografía, dark mode y clases de componentes UI.

---

## Convenciones

- Nunca llamar servicios directamente desde páginas — siempre usar hooks
- Nuevos hooks en `src/hooks/`, nuevos servicios en `src/services/`
- Tipos nuevos van en `src/types/index.ts`
- Los formularios usan React Hook Form + Zod (`resolver: zodResolver(schema)`)
- Fechas se manejan como strings ISO 8601 (`YYYY-MM-DD` o datetime completo)
- IDs son UUIDs — usar `ParseUUIDPipe` en backend, `string` en frontend
- Respuestas del backend siempre extraer `.data.data` (doble wrap por `TransformInterceptor`)

---

## Archivos Clave

| Archivo | Rol |
|---------|-----|
| `src/App.tsx` | Definición de rutas |
| `src/types/index.ts` | Enums, interfaces, DTOs |
| `src/lib/api-client.ts` | Instancia Axios + interceptor de errores |
| `src/lib/query-client.ts` | Configuración React Query |
| `src/services/activities.service.ts` | Todas las llamadas HTTP de actividades |
| `src/services/projects.service.ts` | Todas las llamadas HTTP de proyectos |
| `src/hooks/useActivities.ts` | React Query hooks — actividades |
| `src/hooks/useProjects.ts` | React Query hooks — proyectos |
| `src/index.css` | Tokens de diseño Tailwind v4 + dark mode |

---

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
```