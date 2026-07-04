# CLAUDE.md — ToDo (Frontend)

> Este archivo es la fuente de verdad técnica para Claude Code al trabajar en
> `frontend/`. La gobernanza del proyecto (git, specs, despliegue, MCPs) vive
> en el `CLAUDE.md` de la raíz — leerlo primero si no se ha hecho en esta sesión.

---

## Inicialización de sesión

1. Leer el `CLAUDE.md` de la raíz del repo (gobernanza y convenciones compartidas).
2. Leer este archivo completo.
3. Leer `DESIGN.md` (siempre que la tarea involucre UI).
4. Listar los specs activos (`[IN PROGRESS]` o `[TESTING]`) en `spec/` (raíz del repo).
5. Confirmar la rama actual con `git status`.

---

## Reglas generales

Ver "Reglas generales" del `CLAUDE.md` raíz — aplican sin cambios aquí
(comunicación en español, no adivinar rutas/imports, cambios quirúrgicos,
leer `DESIGN.md` antes de escribir código de UI, etc.).

---

## Agentes especializados

Viven en `frontend/.agents/`. Leer el archivo del agente antes de invocarlo.

| Agente        | Cuándo invocarlo                                                          |
|---------------|-----------------------------------------------------------------------------|
| `@architect`  | Diseño de specs que impactan el frontend: fases, archivos, sin código     |
| `@reviewer`   | Revisión de código frontend antes de marcar un spec como `[DONE]`        |
| `@tester`     | Preparación de casos de prueba manuales en `docs/testing/`                |
| `@mcp-builder`| Coordina con el `@mcp-builder` de `backend/.agents/` cuando un cambio de UI requiere actualizar un system prompt |

---

## Contexto del proyecto

SPA del proyecto ToDo: gestión de proyectos, actividades (con subtareas y
recurrencia) y finanzas personales (gastos, ingresos, cuentas, tarjetas de
crédito, CDTs, presupuestos, deudas, lista de deseos). Consume la API REST
del backend (`backend/`). Estado actual: MVP en desarrollo activo.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | React 19 + Vite + TypeScript |
| Routing | React Router 7 |
| Estado servidor | TanStack React Query v5 (`staleTime: 1min`, `retry: 1`) |
| Formularios | React Hook Form 7 + Zod |
| HTTP | Axios — baseURL: `/api/v1` (proxy a `http://localhost:3002`) |
| Estilos | Tailwind CSS 4 vía `@tailwindcss/vite` |
| Fuente | JetBrains Mono (toda la UI) |

### Comandos

```bash
npm install
npm run dev      # desarrollo
npm run build     # build de producción
npm run lint
```

---

## Dependencias

Ver reglas de dependencias del `CLAUDE.md` raíz (npm, no mezclar managers,
confirmación explícita antes de instalar). No hay reglas adicionales
específicas de este repo.

---

## Variables de entorno

Archivo real (nunca commitear): `frontend/.env.local`

```
VITE_API_URL=http://localhost:3002/api/v1
```

El `api-client.ts` usa `baseURL: '/api/v1'` — Vite hace proxy al backend en desarrollo.

---

## Base de datos

No aplica — el frontend no accede a la base de datos directamente, solo a
través de la API REST del backend.

---

## Backend y/o APIs

Backend propio (NestJS) del mismo proyecto, en `backend/`. Detalle completo
de rutas y lógica de negocio: ver `backend/CLAUDE.md`.

- Base URL desarrollo: `http://localhost:3002/api/v1`
- Base URL producción: `{{url de producción — ver Despliegue en CLAUDE.md raíz}}`
- Autenticación: no implementada — app de uso personal, sin token.
- Todas las respuestas vienen envueltas: `{ statusCode, message, data }` — el
  cliente Axios/hooks debe leer `.data.data`.

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
| `GET` | `/activities/today` | Actividades de hoy (`dueDate` o `scheduledForToday`) | paginación |
| `GET` | `/activities/tomorrow` | Actividades de mañana | paginación |
| `GET` | `/activities/this-week` | Actividades semana actual (Lun–Dom) | paginación |
| `GET` | `/activities/overdue` | Vencidas (`dueDate < hoy`, status ≠ completed) | paginación |
| `GET` | `/activities/without-project` | Sin proyecto asociado | paginación |
| `GET` | `/activities/project/:projectId` | Por proyecto (UUID) | paginación |
| `GET` | `/activities/type/:type` | Por tipo (`task` \| `reminder`) | paginación |
| `GET` | `/activities/priority/:priority` | Por prioridad (`high` \| `medium` \| `low`) | paginación |
| `GET` | `/activities/status/:status` | Por status | paginación |
| `GET` | `/activities/search/:query` | Búsqueda por nombre/descripción/proyecto | paginación |
| `GET` | `/activities/:id` | Obtener actividad (incluye project, parent, subtasks) | UUID |
| `GET` | `/activities/:id/subtasks` | Subtareas de una actividad | UUID + paginación |
| `GET` | `/activities/:id/instances` | Instancias de una plantilla recurrente | UUID |
| `POST` | `/activities` | Crear actividad / subtarea / plantilla recurrente | body: `CreateActivityDto` |
| `PATCH` | `/activities/:id` | Actualizar actividad | UUID + body |
| `DELETE` | `/activities/:id` | Eliminar actividad (204) | UUID |
| `DELETE` | `/activities/:id/future-instances` | Cancelar instancias futuras pendientes (204) | UUID |

> No existe `type: 'event'` — solo `task` y `reminder` (corregido; versiones
> anteriores de este archivo lo mencionaban por error). Tampoco existen
> `actionDate`, `device`, `duration`, `durationUnit`, `location` ni
> `automatizacion` — fueron eliminados del modelo (ver `backend/CLAUDE.md`).

**Paginación** — query params: `page` (default 1) · `limit` (default 20, max 100)

### Finanzas — `/expenses`, `/incomes`, `/purchases`, `/accounts`, `/credit-cards`, `/cdts`, `/budgets`, `/debts`

CRUD estándar por recurso, más `GET /cdts/active`, `GET /budgets/monthly-summary?year=&month=`,
`POST/PATCH/DELETE /budgets/:id/items[...]` y `POST /debts/:id/pay`. Detalle
completo: ver `backend/CLAUDE.md`.

---

## Arquitectura y patrones internos

```
src/
├── components/          # Componentes reutilizables (sin lógica de negocio)
│   ├── layout/           # MainLayout, Sidebar, Tabbar
│   └── finances/         # Cards y forms de cada recurso financiero
├── pages/                # Vistas por ruta
│   └── finances/         # Dashboard y vistas por recurso financiero
├── hooks/                # Custom hooks (React Query)
│   └── finances/         # Un hook por recurso financiero
├── services/             # Llamadas HTTP puras (sin React)
│   └── finances/         # Un servicio por recurso financiero
├── lib/                  # api-client.ts (Axios) y query-client.ts
└── types/index.ts        # Enums, interfaces y DTOs — única fuente de verdad
```

**Reglas:**
- `src/services/` (y `services/finances/`) — funciones async puras, sin React, sin hooks
- `src/hooks/` (y `hooks/finances/`) — envuelven servicios con `useQuery` / `useMutation`
- Las mutations invalidan query keys relevantes en `onSuccess`
- Tipos en `src/types/index.ts` — única fuente de verdad, deben coincidir
  exactamente con los DTOs/entidades reales del backend

### Capas

```
Pages
  └── Hooks (React Query)
        └── Services (async puras)
              └── api-client (Axios)
                    └── GET/POST/PATCH/DELETE /api/v1/...
```

### Rutas del Frontend

| Ruta | Componente | Descripción |
|------|-----------|-------------|
| `/` | `Dashboard` | Overview / estadísticas |
| `/projects` | `ProjectList` | CRUD de proyectos |
| `/projects/:id` | `ProjectDetail` | Proyecto + sus actividades |
| `/activities/today` | `TodayView` | Actividades de hoy |
| `/activities/this-week` | `WeekView` | Actividades de la semana |
| `/activities/overdue` | `OverdueView` | Actividades vencidas |
| `/activities/backlog` | `BacklogView` | Actividades sin fecha |
| `/finances` | `FinancesDashboard` | Overview financiero |
| `/finances/expenses` | `ExpensesView` | Gastos |
| `/finances/incomes` | `IncomesView` | Ingresos |
| `/finances/purchases` | `PurchasesView` | Lista de deseos |
| `/finances/accounts` | `AccountsView` | Cuentas |
| `/finances/credit-cards` | `CreditCardsView` | Tarjetas de crédito |
| `/finances/cdts` | `CdtsView` | CDTs |
| `/finances/budgets` | `BudgetsView` | Presupuestos |
| `/finances/budgets/:id` | `BudgetDetailView` | Detalle de presupuesto |
| `/finances/debts` | `DebtsView` | Deudas |

Todas las rutas están dentro de `<MainLayout>` (sidebar + navbar). Las rutas
`/finances/*` están envueltas además en un layout que oculta la sección en
móvil (`FinancesLayout` en `App.tsx`) — finanzas solo es usable en desktop.

### Tipos e Interfaces (`src/types/index.ts`)

#### Enums (as const)

```ts
ProjectStatus:        'active' | 'inactive' | 'paused' | 'completed'
ActivityStatus:       'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'
ActivityType:         'reminder' | 'task'
Priority:             'high' | 'medium' | 'low'
Energy:               'high' | 'medium' | 'low'
RecurrenceFrequency:  'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'
ExpenseType:          'basico' | 'lujo' | 'ahorro' | 'pago_deuda'
IncomeType:           'sueldo' | 'freelance' | 'intereses' | 'dividendos' | 'otro'
AccountType:          'corriente' | 'ahorros' | 'digital'
PurchasePriority:     'alta' | 'media' | 'baja'
PurchaseStore:        'amazon' | 'temu' | 'mercadolibre' | 'otra'
PurchaseStatus:       'pendiente' | 'comprado' | 'descartado'
DebtStatus:           'activa' | 'pagada'
```

#### Interfaces principales

```ts
interface Project {
  id: string; name: string; status: ProjectStatus;
  startDate: string; endDate: string | null;
  createdAt: string; updatedAt: string;
}

interface Activity {
  id: string; name: string; description: string | null;
  project: Project | null; parent: Activity | null; subtasks: Activity[];
  dueDate: string | null;
  priority: Priority; status: ActivityStatus; energy: Energy; type: ActivityType;
  scheduledForToday: boolean; notionUrl: string | null;
  isTemplate: boolean; isRecurring: boolean; templateId: string | null;
  recurrenceFrequency: RecurrenceFrequency | null;
  recurrenceDays: WeekDay[] | null; recurrenceDayOfMonth: number | null;
  recurrenceEndDate: string | null; instanceDate: string | null;
  createdAt: string; updatedAt: string;
}
```

Las entidades y DTOs financieros (`Expense`, `Income`, `Purchase`, `Account`,
`CreditCard`, `Cdt`, `Budget`/`BudgetItem`, `Debt`, `MonthlySummary`,
`CardTotal`) viven en el mismo archivo — consultarlo directamente antes de
asumir un shape, no reproducirlo aquí para evitar que ambos se desincronicen.

---

## Componentes existentes

### Layout
- `components/layout/MainLayout.tsx` — wrapper con sidebar y navbar
- `components/layout/Sidebar.tsx` — navegación lateral
- `components/layout/Tabbar.tsx` — navegación inferior (mobile)

### Compartidos
- `ActivityCard.tsx`, `ActivityForm.tsx` (React Hook Form + Zod)
- `ProjectForm.tsx`
- `ConfirmDialog.tsx`, `EmptyState.tsx`, `Modal.tsx`, `Pagination.tsx`
- `PriorityBadge.tsx`, `StatusBadge.tsx`, `EnergyIndicator.tsx`

### Finanzas (`components/finances/`)
- Un `*Card.tsx` + `*Form.tsx` por recurso: `Account`, `CreditCard`, `Cdt`,
  `Debt`, `Expense`, `Income`, `Purchase`, más `BudgetForm.tsx` /
  `BudgetItemForm.tsx`.

---

## Sistema de Diseño

Ver `DESIGN.md` — paleta, tokens semánticos, tipografía, dark mode y clases
de componentes UI. Leerlo antes de escribir código de UI, siempre.

---

## MCPs del proyecto

El frontend no expone MCPs propios. El único servidor MCP (`todo-api`) vive
en `backend/src/mcp/mcp.service.ts`. Si un cambio de frontend introduce un
concepto de dominio que un agente debería entender, coordinar con
`@mcp-builder` (ver tabla de agentes arriba) y actualizar el system prompt
correspondiente en `docs/mcps/` — reglas completas en el `CLAUDE.md` raíz.

---

## Convenciones de código

- Nunca llamar servicios directamente desde páginas — siempre usar hooks
- Nuevos hooks en `src/hooks/`, nuevos servicios en `src/services/`
- Tipos nuevos van en `src/types/index.ts`
- Los formularios usan React Hook Form + Zod (`resolver: zodResolver(schema)`)
- Fechas se manejan como strings ISO 8601 (`YYYY-MM-DD` o datetime completo)
- IDs son UUIDs — usar `ParseUUIDPipe` en backend, `string` en frontend
- Respuestas del backend siempre extraer `.data.data` (doble wrap por `TransformInterceptor`)
- Exportaciones: preferir **named exports**; default export solo para páginas
- No usar `any` salvo que sea absolutamente inevitable; documentarlo con `// TODO: type this`

---

## Testing

- No hay tests automatizados en frontend actualmente.
- Validación por casos manuales en `docs/testing/test-NNN.md`, preparados con
  `@tester` de `frontend/.agents/` y ejecutados por el usuario.
- Antes de cerrar una tarea de UI, verificar manualmente el golden path y los
  casos borde relevantes (ver skill `/verify` si aplica).

---

## Specs de funcionalidades

Ubicación, nomenclatura, estados y estructura mínima: ver `CLAUDE.md` raíz.
Los specs que impactan el frontend se diseñan con `@architect` de
`frontend/.agents/` y se revisan con `@reviewer` de la misma carpeta antes de
marcarlos `[DONE]`.

---

## Despliegue

Ver sección "Despliegue" del `CLAUDE.md` raíz — infraestructura (Vercel),
checklist y proceso paso a paso son los mismos para todo el ecosistema.
Verificar siempre que `VITE_API_URL` en Vercel apunte a producción, no a
`localhost`.

---

## Acciones prohibidas

Ver "Acciones prohibidas" del `CLAUDE.md` raíz — aplican sin cambios aquí.

---

## Archivos Clave

| Archivo | Rol |
|---------|-----|
| `src/App.tsx` | Definición de rutas |
| `src/types/index.ts` | Enums, interfaces, DTOs |
| `src/lib/api-client.ts` | Instancia Axios + interceptor de errores |
| `src/lib/query-client.ts` | Configuración React Query |
| `src/services/activities.service.ts` | Llamadas HTTP de actividades |
| `src/services/projects.service.ts` | Llamadas HTTP de proyectos |
| `src/services/finances/*.service.ts` | Llamadas HTTP por recurso financiero |
| `src/hooks/useActivities.ts` | React Query hooks — actividades |
| `src/hooks/useProjects.ts` | React Query hooks — proyectos |
| `src/hooks/finances/*.ts` | React Query hooks por recurso financiero |
| `src/index.css` | Tokens de diseño Tailwind v4 + dark mode |
