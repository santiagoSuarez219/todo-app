# CLAUDE.md — Frontend

> Referencia técnica del frontend. Leer antes de modificar cualquier archivo de la SPA.
> Para decisiones de UI, leer `DESIGN.md` antes de escribir código.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | React 19 + Vite + TypeScript |
| Routing | React Router 7 |
| Estado servidor | TanStack React Query v5 (`staleTime: 1min`, `retry: 1`) |
| Formularios | React Hook Form 7 + Zod |
| HTTP | Axios — proxy a `http://localhost:3000` en desarrollo |
| Estilos | Tailwind CSS 4 vía `@tailwindcss/vite` |
| Fuente | JetBrains Mono (toda la UI) |

### Comandos

```bash
# Instalar dependencias
npm install

# Desarrollo
npm run dev

# Build
npm run build

# Preview del build
npm run preview
```

---

## Variables de entorno

Archivo real: `.env.local` (nunca commitear).

```env
VITE_API_URL=http://localhost:3000/api/v1
```

El `api-client.ts` usa `baseURL: '/api/v1'` — Vite hace proxy al backend en desarrollo.

---

## Rutas del frontend

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

## Arquitectura de capas

```
Pages
  └── Hooks (React Query)
        └── Services (async puras)
              └── api-client (Axios)
                    └── GET/POST/PATCH/DELETE /api/v1/...
```

**Reglas:**
- `src/services/` — funciones async puras, sin React, sin hooks.
- `src/hooks/` — envuelven servicios con `useQuery` / `useMutation`.
- Las mutations invalidan query keys relevantes en `onSuccess`.
- Tipos en `src/types/index.ts` — única fuente de verdad.
- Nunca llamar servicios directamente desde páginas; siempre usar hooks.

---

## Query keys

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

## Tipos e interfaces (`src/types/index.ts`)

### Enums

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

## Componentes existentes

### Layout

- `components/layout/MainLayout.tsx` — wrapper con sidebar y navbar
- `components/layout/Sidebar.tsx` — navegación lateral
- `components/layout/Navbar.tsx` — barra superior

### Compartidos

- `ActivityCard.tsx` — tarjeta de actividad con quick-edit inline (nombre, prioridad, proyecto)
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

## Sistema de diseño

Ver `DESIGN.md` — paleta primitiva, tokens semánticos, tipografía, dark mode y clases de componentes UI.

Resumen rápido:
- Fuente: **JetBrains Mono** para todo el proyecto.
- Dark mode: clase `dark` en `<html>`, persistida en `localStorage` con clave `'color-theme'`.
- Tailwind v4: `@custom-variant dark (&:where(.dark, .dark *))` en `index.css`.

---

## Convenciones

- Nuevos hooks en `src/hooks/`, nuevos servicios en `src/services/`.
- Tipos nuevos van en `src/types/index.ts`.
- Los formularios usan React Hook Form + Zod (`resolver: zodResolver(schema)`).
- Fechas se manejan como strings ISO 8601 (`YYYY-MM-DD` o datetime completo).
- IDs son UUIDs — usar `string` en frontend.
- Respuestas del backend: extraer `.data.data` (doble wrap por `TransformInterceptor`).
- No usar `any`; documentar excepciones con `// TODO: type this`.

---

## Archivos clave

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
