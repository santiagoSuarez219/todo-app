# CLAUDE.md — ToDo Project

Memoria de contexto para el desarrollo de este proyecto. Actualizar cuando cambien decisiones de arquitectura, diseño o convenciones.

---

## Arquitectura del Sistema

### Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + Vite 8 + TypeScript 6 |
| Routing | React Router 7 |
| Estado servidor | TanStack React Query v5 (staleTime: 1min, retry: 1) |
| Formularios | React Hook Form 7 + Zod |
| HTTP | Axios (`VITE_API_URL=http://localhost:3000/api/v1`) |
| Estilos | Tailwind CSS 4 (vía `@tailwindcss/vite`) |
| Backend | NestJS 11 + TypeScript 5.7 |
| ORM | TypeORM + PostgreSQL 16 |
| MCP | `@modelcontextprotocol/sdk` (JSON-RPC + SSE en `/mcp`) |
| Base de datos | PostgreSQL 16 (Docker, puerto 5433, db: `todo_db`) |

### Diagrama

```
Browser :5173
  └── React SPA
        Pages → Hooks → Services → Axios
                                      │
                              REST /api/v1
                                      │
                           NestJS :3000
                             Controllers
                             Services
                             TypeORM
                                      │
                           PostgreSQL :5433
                             projects
                             activities (self-ref subtasks)

                           + MCP Server /mcp
                             (JSON-RPC tools para IA)
```

### Convenciones Backend

- Prefijo global: `/api/v1`
- Respuestas envueltas por `TransformInterceptor`: `{ data: ... }`
- Errores formateados por `HttpExceptionFilter`
- Validación con `ValidationPipe` (whitelist + transform)
- CORS habilitado para `FRONTEND_URL` (`.env`)
- Migraciones explícitas (synchronize: false)

### Convenciones Frontend

- Servicios (`src/services/`) son funciones async puras, sin React
- Hooks (`src/hooks/`) envuelven servicios con React Query
- Mutations invalidan query keys relevantes en `onSuccess`
- Tipos centralizados en `src/types/index.ts`
- API client en `src/lib/api-client.ts` (interceptor extrae mensaje de error)

---

## Entidades del Dominio

### Project
`id` · `name` · `status` (ACTIVE | INACTIVE | PAUSED | COMPLETED) · `startDate` · `endDate`

### Activity
`id` · `name` · `description` · `project?` · `parent?` · `subtasks[]`
`status` (PENDING | IN_PROGRESS | COMPLETED | CANCELLED | ON_HOLD)
`priority` (HIGH | MEDIUM | LOW) · `energy` (HIGH | MEDIUM | LOW)
`type` (TASK | EVENT | REMINDER) · `device` (PHONE | COMPUTER | TABLET)
`actionDate` · `dueDate` · `duration` · `durationUnit` · `location`

---

## Sistema de Diseño — Flowbite + Tailwind CSS 4

### Fuente

**JetBrains Mono** para todo el proyecto (texto, UI, código).

```css
/* index.css */
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap');

@theme {
  --font-sans: 'JetBrains Mono', 'ui-monospace', monospace;
  --font-body: 'JetBrains Mono', 'ui-monospace', monospace;
  --font-mono: 'JetBrains Mono', 'ui-monospace', monospace;
}
```

### Paleta Primitiva

| Escala | 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 |
|--------|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
| **gray** | `#F9FAFB` | `#F3F4F6` | `#E5E7EB` | `#D1D5DB` | `#9CA3AF` | `#6B7280` | `#4B5563` | `#374151` | `#1F2937` | `#111827` |
| **blue** | `#EBF5FF` | `#E1EFFE` | `#C3DDFD` | `#A4CAFE` | `#76A9FA` | `#3F83F8` | `#1C64F2` | `#1A56DB` | `#1E429F` | `#233876` |
| **green** | `#F3FAF7` | `#DEF7EC` | `#BCF0DA` | `#84E1BC` | `#31C48D` | `#0E9F6E` | `#057A55` | `#046C4E` | `#03543F` | `#014737` |
| **red** | `#FDF2F2` | `#FDE8E8` | `#FBD5D5` | `#F8B4B4` | `#F98080` | `#F05252` | `#E02424` | `#C81E1E` | `#9B1C1C` | `#771D1D` |
| **yellow** | `#FDFDEA` | `#FDF6B2` | `#FCE96A` | `#FACA15` | `#E3A008` | `#C27803` | `#9F580A` | `#8E4B10` | `#723B13` | `#633112` |
| **purple** | `#F6F5FF` | `#EDEBFE` | `#DCD7FE` | `#CABFFD` | `#AC94FA` | `#9061F9` | `#7E3AF2` | `#6C2BD9` | `#5521B5` | `#4A1D96` |
| **pink** | `#FDF2F8` | `#FCE8F3` | `#FAD1E8` | `#F8B4D9` | `#F17EB8` | `#E74694` | `#D61F69` | `#BF125D` | `#99154B` | `#751A3D` |

### Tokens Semánticos

```css
@theme {
  /* Texto */
  --color-body:              var(--color-gray-600);
  --color-body-subtle:       var(--color-gray-500);
  --color-heading:           var(--color-gray-900);
  --color-fg-brand:          var(--color-blue-700);
  --color-fg-brand-subtle:   var(--color-blue-200);
  --color-fg-brand-strong:   var(--color-blue-900);
  --color-fg-success:        var(--color-green-700);
  --color-fg-danger:         var(--color-red-700);
  --color-fg-warning:        var(--color-orange-600);
  --color-fg-disabled:       var(--color-gray-400);

  /* Fondos — jerarquía de superficies */
  --color-neutral-primary:        white;
  --color-neutral-secondary:      var(--color-gray-50);
  --color-neutral-tertiary:       var(--color-gray-100);
  --color-neutral-quaternary:     var(--color-gray-200);

  /* Brand */
  --color-brand-softer:    var(--color-blue-50);
  --color-brand-soft:      var(--color-blue-100);
  --color-brand:           var(--color-blue-700);
  --color-brand-medium:    var(--color-blue-200);
  --color-brand-strong:    var(--color-blue-800);

  /* Estados */
  --color-success:         var(--color-green-700);  /* emerald en Flowbite */
  --color-danger:          var(--color-red-700);    /* rose en Flowbite */
  --color-warning:         var(--color-yellow-500);

  /* Bordes */
  --color-border-light:    var(--color-gray-100);
  --color-border-default:  var(--color-gray-200);
  --color-border-brand:    var(--color-blue-200);
  --color-border-dark:     var(--color-gray-800);

  /* Border radius */
  --radius-xs:   4px;
  --radius-sm:   6px;
  --radius:      8px;
  --radius-base: 12px;
  --radius-lg:   16px;
}
```

### Modo Claro / Oscuro — Tabla de Referencia

| Elemento | Modo Claro | Modo Oscuro |
|----------|-----------|-------------|
| Fondo página | `bg-white` | `dark:bg-gray-900` |
| Fondo card / panel | `bg-white` | `dark:bg-gray-800` |
| Fondo sidebar | `bg-gray-50` | `dark:bg-gray-800` |
| Fondo input | `bg-white` | `dark:bg-gray-700` |
| Fondo hover nav | `hover:bg-gray-100` | `dark:hover:bg-gray-700` |
| Fondo deshabilitado | `bg-gray-100` | `dark:bg-gray-700` |
| Texto principal | `text-gray-900` | `dark:text-white` |
| Texto secundario | `text-gray-600` | `dark:text-gray-300` |
| Texto sutil | `text-gray-500` | `dark:text-gray-400` |
| Texto deshabilitado | `text-gray-400` | `dark:text-gray-500` |
| Texto placeholder | `placeholder:text-gray-500` | `dark:placeholder:text-gray-400` |
| Borde estándar | `border-gray-200` | `dark:border-gray-700` |
| Borde input | `border-gray-300` | `dark:border-gray-600` |
| Focus ring | `focus:ring-gray-200` | `dark:focus:ring-gray-700` |
| Botón primario | `bg-blue-700 text-white` | `dark:bg-blue-600` |
| Botón primario hover | `hover:bg-blue-800` | `dark:hover:bg-blue-700` |
| Badge éxito | `bg-green-100 text-green-800` | `dark:bg-green-900 dark:text-green-300` |
| Badge peligro | `bg-red-100 text-red-800` | `dark:bg-red-900 dark:text-red-300` |
| Badge advertencia | `bg-yellow-100 text-yellow-800` | `dark:bg-yellow-900 dark:text-yellow-300` |
| Badge info | `bg-blue-100 text-blue-800` | `dark:bg-blue-900 dark:text-blue-300` |

### Implementación Dark Mode

```javascript
// Pegar en el <head> de index.html (antes del bundle) para evitar FOUC
if (
  localStorage.getItem('color-theme') === 'dark' ||
  (!('color-theme' in localStorage) &&
    window.matchMedia('(prefers-color-scheme: dark)').matches)
) {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}
```

```css
/* index.css — Tailwind v4 */
@custom-variant dark (&:where(.dark, .dark *));
```

Toggle persiste en `localStorage` con clave `'color-theme'` (`'dark'` | `'light'`).

---

## Rutas del Frontend

| Ruta | Componente | Descripción |
|------|-----------|-------------|
| `/` | `Dashboard` | Overview / estadísticas |
| `/projects` | `ProjectList` | CRUD de proyectos |
| `/projects/:id` | `ProjectDetail` | Proyecto + actividades |
| `/activities` | `ActivityList` | Todas las actividades (paginado) |
| `/activities/today` | `TodayView` | Actividades de hoy |
| `/activities/this-week` | `WeekView` | Actividades de la semana |
| `/activities/overdue` | `OverdueView` | Actividades vencidas |

---

## Archivos Clave

### Backend
- [backend/src/main.ts](backend/src/main.ts) — Bootstrap, CORS, pipes globales
- [backend/src/app.module.ts](backend/src/app.module.ts) — Módulo raíz
- [backend/src/data-source.ts](backend/src/data-source.ts) — Config TypeORM / CLI
- [backend/src/activities/activities.service.ts](backend/src/activities/activities.service.ts) — Lógica de negocio
- [backend/src/activities/activities.controller.ts](backend/src/activities/activities.controller.ts) — Endpoints REST
- [backend/src/mcp/mcp.service.ts](backend/src/mcp/mcp.service.ts) — Definición de tools MCP

### Frontend
- [frontend/src/App.tsx](frontend/src/App.tsx) — Router raíz
- [frontend/src/types/index.ts](frontend/src/types/index.ts) — Tipos e interfaces globales
- [frontend/src/lib/api-client.ts](frontend/src/lib/api-client.ts) — Instancia Axios
- [frontend/src/services/activities.service.ts](frontend/src/services/activities.service.ts) — Llamadas HTTP actividades
- [frontend/src/services/projects.service.ts](frontend/src/services/projects.service.ts) — Llamadas HTTP proyectos
- [frontend/src/hooks/useActivities.ts](frontend/src/hooks/useActivities.ts) — React Query hooks
- [frontend/src/index.css](frontend/src/index.css) — Estilos globales + tokens Tailwind

### Config
- [.env](.env) — Variables de entorno backend (DB, CORS)
- [frontend/.env.local](frontend/.env.local) — `VITE_API_URL`
- [docker-compose.yml](docker-compose.yml) — PostgreSQL container
