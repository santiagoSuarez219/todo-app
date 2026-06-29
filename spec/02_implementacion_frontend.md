# Plan de Implementacion: [DONE] Frontend React + Vite + TailwindCSS

---

## Objetivo

Construir una aplicacion web SPA (Single Page Application) que consuma la API REST existente del gestor de actividades, permitiendo al usuario gestionar proyectos y actividades desde una interfaz visual moderna y responsiva.

---

## Contexto Tecnico

El backend NestJS ya expone una API REST completa en `http://localhost:3000/api/v1` con endpoints para proyectos, actividades y consultas especializadas. CORS ya esta habilitado en el backend. No existe autenticacion aun — el frontend operara sin auth en esta fase.

**Framework elegido:** React + Vite — SPA pura que consume la API REST directamente. NextJS y Astro fueron descartados porque el proyecto es una app de gestion dinamica con mucho CRUD interactivo, donde SSR no aporta valor y Astro esta disenado para sitios content-heavy.

**Ventaja clave:** Los 14+ endpoints REST ya estan estables y documentados en Swagger (`/api/v1/docs`). El frontend solo consume la API sin modificar la logica de negocio existente.

---

## Dependencias

| Paquete | Descripcion |
|---|---|
| `react` + `react-dom` | Libreria UI principal |
| `typescript` | Tipado estatico |
| `vite` | Build tool y dev server |
| `tailwindcss` | Framework de estilos utilitarios |
| `@tanstack/react-query` | Manejo de estado del servidor, cache y mutaciones |
| `react-router-dom` | Navegacion y routing entre vistas |
| `zod` | Validacion de formularios en el cliente |
| `react-hook-form` | Manejo de formularios con integracion Zod |
| `@hookform/resolvers` | Bridge entre react-hook-form y Zod |
| `axios` | Cliente HTTP para consumir la API |

---

## Fase 9 — Implementacion Frontend

### ✅ Paso 1 — Scaffold del proyecto con Vite

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
```

Instalar dependencias adicionales:

```bash
npm install @tanstack/react-query react-router-dom zod react-hook-form @hookform/resolvers axios
npm install -D tailwindcss @tailwindcss/vite
```

---

### ✅ Paso 2 — Configurar TailwindCSS

**Archivo:** `frontend/vite.config.ts`

- Agregar el plugin de TailwindCSS al array de plugins de Vite

**Archivo:** `frontend/src/index.css`

- Reemplazar contenido con la directiva de importacion de Tailwind:

```css
@import "tailwindcss";
```

---

### ✅ Paso 3 — Configurar variables de entorno

**Archivo:** `frontend/.env.local`

```env
VITE_API_URL=http://localhost:3000/api/v1
```

Vite expone unicamente variables prefijadas con `VITE_` al cliente — esto previene filtrar variables sensibles accidentalmente.

---

### ✅ Paso 4 — Ajustar CORS en el backend

**Archivo:** `backend/src/main.ts`

Cambio necesario: restringir el `origin` de CORS al puerto de Vite en desarrollo:

```typescript
app.enableCors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
});
```

**Archivo:** `.env` (raiz del proyecto)

```env
FRONTEND_URL=http://localhost:5173
```

---

### ✅ Paso 5 — Crear cliente HTTP centralizado

**Archivo:** `frontend/src/lib/api-client.ts`

Responsabilidades:
- Instanciar `axios` con `baseURL` apuntando a `VITE_API_URL`
- Configurar interceptores para manejo uniforme de errores
- Exportar instancia unica usada por todos los servicios

**Archivo:** `frontend/src/lib/query-client.ts`

- `QueryClient` con `staleTime: 1000 * 60` y `retry: 1`

---

### ✅ Paso 6 — Crear servicios de API por dominio

**Archivos:**
- `frontend/src/services/projects.service.ts`
- `frontend/src/services/activities.service.ts`

Cada servicio encapsula las llamadas HTTP correspondientes:

#### Servicio de Proyectos

| Funcion | Endpoint consumido |
|---|---|
| `getProjects(status?)` | `GET /projects` |
| `getProject(id)` | `GET /projects/:id` |
| `createProject(dto)` | `POST /projects` |
| `updateProject(id, dto)` | `PATCH /projects/:id` |
| `deleteProject(id)` | `DELETE /projects/:id` |

#### Servicio de Actividades — CRUD

| Funcion | Endpoint consumido |
|---|---|
| `getActivities(page?, limit?)` | `GET /activities` |
| `getActivity(id)` | `GET /activities/:id` |
| `createActivity(dto)` | `POST /activities` |
| `updateActivity(id, dto)` | `PATCH /activities/:id` |
| `deleteActivity(id)` | `DELETE /activities/:id` |

#### Servicio de Actividades — Consultas Especializadas

| Funcion | Endpoint consumido |
|---|---|
| `getTodayActivities()` | `GET /activities/today` |
| `getTomorrowActivities()` | `GET /activities/tomorrow` |
| `getThisWeekActivities()` | `GET /activities/this-week` |
| `getOverdueActivities()` | `GET /activities/overdue` |
| `getActivitiesByProject(projectId)` | `GET /activities/project/:projectId` |
| `getActivitiesByType(type)` | `GET /activities/type/:type` |
| `getActivitiesByPriority(priority)` | `GET /activities/priority/:priority` |
| `getActivitiesByStatus(status)` | `GET /activities/status/:status` |
| `getActivitySubtasks(id, page?, limit?)` | `GET /activities/:id/subtasks` |

---

### ✅ Paso 7 — Definir tipos TypeScript compartidos

**Archivo:** `frontend/src/types/index.ts`

Nota de implementacion: los enums se implementaron como objetos `as const` con tipos union en lugar de TypeScript `enum`, para cumplir con la opcion `erasableSyntaxOnly: true` del tsconfig generado por Vite 9.

Tipos declarados:
- `Project`, `Activity`
- `ProjectStatus`, `ActivityStatus`, `ActivityType`, `Priority`, `Energy`, `Device`, `DurationUnit`
- `CreateProjectDto`, `UpdateProjectDto`, `CreateActivityDto`, `UpdateActivityDto`
- `PaginatedResponse<T>`, `PaginationParams`

---

### ✅ Paso 8 — Configurar routing y layout principal

**Archivos:**
- `frontend/src/main.tsx` — Envolver la app con `QueryClientProvider` y `BrowserRouter`
- `frontend/src/App.tsx` — Definir rutas con `react-router-dom`
- `frontend/src/components/layout/Sidebar.tsx` — Navegacion lateral con accesos directos
- `frontend/src/components/layout/MainLayout.tsx` — Layout base con sidebar y area de contenido

**Rutas definidas:**

| Ruta | Vista | Descripcion |
|---|---|---|
| `/` | Dashboard | Resumen: hoy, vencidas, esta semana |
| `/projects` | ProjectList | Lista de proyectos con filtros |
| `/projects/:id` | ProjectDetail | Actividades del proyecto |
| `/activities` | ActivityList | Todas las actividades con filtros |
| `/activities/today` | TodayView | Actividades de hoy |
| `/activities/this-week` | WeekView | Actividades de la semana |
| `/activities/overdue` | OverdueView | Actividades vencidas |

---

### ✅ Paso 9 — Implementar vistas MVP

Las vistas se construyen en `frontend/src/pages/`. Cada vista usa hooks de TanStack Query para fetch y mutaciones.

#### Vista: Dashboard (`/`)

**Archivo:** `frontend/src/pages/Dashboard.tsx`

- Tarjetas de resumen: total de actividades hoy, vencidas, esta semana
- Lista rapida de actividades de hoy con indicadores de prioridad y energia
- Acceso rapido a crear proyecto o actividad

#### Vista: Lista de Proyectos (`/projects`)

**Archivo:** `frontend/src/pages/ProjectList.tsx`

- Tabla/grid de proyectos con filtro por `status`
- Boton para crear proyecto — abre modal con formulario
- Acciones por fila: editar, eliminar, ver detalle

#### Vista: Detalle de Proyecto (`/projects/:id`)

**Archivo:** `frontend/src/pages/ProjectDetail.tsx`

- Header con datos del proyecto y boton de edicion
- Lista de actividades del proyecto
- Boton para agregar actividad al proyecto directamente

#### Vista: Lista de Actividades (`/activities`)

**Archivo:** `frontend/src/pages/ActivityList.tsx`

- Tabla paginada de actividades
- Filtros por: status, priority, energy, type, device
- Columnas clave: nombre, proyecto, prioridad, energia, fecha de accion, vencimiento
- Acciones: editar, eliminar, ver subtareas

#### Vista: Actividades de Hoy / Esta Semana / Vencidas

**Archivos:**
- `frontend/src/pages/TodayView.tsx`
- `frontend/src/pages/WeekView.tsx`
- `frontend/src/pages/OverdueView.tsx`

- Listas filtradas usando los endpoints especializados del backend
- OverdueView con indicador visual de urgencia por color

---

### ✅ Paso 10 — Implementar componentes reutilizables

**Directorio:** `frontend/src/components/`

| Componente | Descripcion |
|---|---|
| `ActivityCard.tsx` | Tarjeta de actividad con badge de prioridad, energia y estado |
| `ActivityForm.tsx` | Formulario de crear/editar actividad con validacion Zod |
| `ProjectForm.tsx` | Formulario de crear/editar proyecto |
| `StatusBadge.tsx` | Badge coloreado segun estado (pending, in_progress, completed, etc.) |
| `PriorityBadge.tsx` | Badge coloreado segun prioridad (high=rojo, medium=amarillo, low=verde) |
| `EnergyIndicator.tsx` | Indicador visual de nivel de energia requerido |
| `ConfirmDialog.tsx` | Modal de confirmacion para acciones destructivas (eliminar) |
| `Pagination.tsx` | Componente de paginacion reutilizable |
| `EmptyState.tsx` | Pantalla cuando no hay datos en una lista |

---

### ✅ Paso 11 — Configurar TanStack Query

**Archivo:** `frontend/src/lib/query-client.ts`

- `staleTime: 1000 * 60` — datos validos por 1 minuto antes de refetch
- `retry: 1` — reintentar una vez en caso de error de red

Los hooks de TanStack Query se definen en `frontend/src/hooks/`:

- `useProjects.ts` — `useProjects`, `useProject`, `useCreateProject`, `useUpdateProject`, `useDeleteProject`
- `useActivities.ts` — `useActivities`, `useActivity`, `useTodayActivities`, `useThisWeekActivities`, `useOverdueActivities`, `useActivitiesByProject`, `useCreateActivity`, `useUpdateActivity`, `useDeleteActivity`

---

### ✅ Paso 12 — Verificar integracion completa

Build de produccion ejecutado exitosamente:

```
✓ 225 modules transformed.
dist/assets/index.css   20.37 kB
dist/assets/index.js   416.78 kB
✓ built in 132ms
```

Para verificacion completa con backend activo:

1. Levantar PostgreSQL: `docker-compose up -d`
2. Levantar backend: `cd backend && npm run start:dev`
3. Levantar frontend: `cd frontend && npm run dev`
4. Verificar en `http://localhost:5173`
5. Confirmar que los datos del backend se muestran correctamente en cada vista
6. Probar flujo completo: crear proyecto → agregar actividad → editar → eliminar

---

## Estructura de Carpetas Resultante

```
frontend/
├── public/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── MainLayout.tsx
│   │   │   └── Sidebar.tsx
│   │   ├── ActivityCard.tsx
│   │   ├── ActivityForm.tsx
│   │   ├── ProjectForm.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── PriorityBadge.tsx
│   │   ├── EnergyIndicator.tsx
│   │   ├── ConfirmDialog.tsx
│   │   ├── Pagination.tsx
│   │   └── EmptyState.tsx
│   ├── hooks/
│   │   ├── useProjects.ts
│   │   └── useActivities.ts
│   ├── lib/
│   │   ├── api-client.ts
│   │   └── query-client.ts
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── ProjectList.tsx
│   │   ├── ProjectDetail.tsx
│   │   ├── ActivityList.tsx
│   │   ├── TodayView.tsx
│   │   ├── WeekView.tsx
│   │   └── OverdueView.tsx
│   ├── services/
│   │   ├── projects.service.ts
│   │   └── activities.service.ts
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── .env.local
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## Resumen de Impacto por Componente

| Componente | Tipo de cambio | Descripcion |
|---|---|---|
| `backend/src/main.ts` | Modificacion menor | Parametrizar `origin` de CORS con variable de entorno |
| `.env` (raiz) | Agregar variable | `FRONTEND_URL=http://localhost:5173` |
| `docker-compose.yml` | Sin cambios ahora | Se agregara servicio `frontend` en fase de produccion |
| `frontend/` | Crear directorio completo | Nueva SPA React con Vite, TailwindCSS y TanStack Query |

---

## Orden de Ejecucion

```
Paso 1 (scaffold) → Paso 2 (Tailwind) → Paso 3 (env vars) → Paso 4 (CORS backend) →
Paso 5 (api-client) → Paso 6 (servicios) → Paso 7 (tipos) → Paso 8 (routing + layout) →
Paso 9 (vistas MVP) → Paso 10 (componentes) → Paso 11 (TanStack Query hooks) →
Paso 12 (verificacion)
```
