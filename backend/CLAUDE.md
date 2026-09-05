# CLAUDE.md — ToDo (Backend)

> Este archivo es la fuente de verdad técnica para Claude Code al trabajar en
> `backend/`. La gobernanza del proyecto (git, specs, despliegue, MCPs) vive
> en el `CLAUDE.md` de la raíz — leerlo primero si no se ha hecho en esta sesión.

---

## Inicialización de sesión

1. Leer el `CLAUDE.md` de la raíz del repo (gobernanza y convenciones compartidas).
2. Leer este archivo completo.
3. Listar los specs activos (`[IN PROGRESS]` o `[TESTING]`) en `spec/` (raíz del repo).
4. Confirmar la rama actual con `git status`.

---

## Reglas generales

Ver "Reglas generales" del `CLAUDE.md` raíz — aplican sin cambios aquí
(comunicación en español, no adivinar rutas/imports, cambios quirúrgicos, etc.).

---

## Agentes especializados

Viven en `/.claude/agents/` (raíz del monorepo, compartidos con frontend).
Leer el archivo del agente antes de invocarlo. Las skills de apoyo (patrones
de NestJS, Zod, TypeScript avanzado, etc.) viven en `/.claude/skills/`.

| Agente        | Cuándo invocarlo                                                          |
|---------------|-----------------------------------------------------------------------------|
| `@architect`  | Diseño de specs que impactan el backend: fases, archivos, sin código      |
| `@reviewer`   | Revisión de código backend antes de marcar un spec como `[DONE]`         |
| `@tester`     | Generación y ejecución de pruebas e2e (`backend/test/`)                   |
| `@mcp-builder`| Evaluación, diseño y actualización de `mcp.service.ts` y los system prompts en `docs/mcps/` |

---

## Contexto del proyecto

API REST + servidor MCP del proyecto ToDo. Expone la gestión de proyectos,
actividades (con subtareas y recurrencia) y el dominio financiero completo
(gastos, ingresos, cuentas, tarjetas de crédito, CDTs, presupuestos, deudas y
lista de deseos), tanto vía REST para el frontend como vía MCP para agentes
de IA. Estado actual: MVP en desarrollo activo.

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
| Tareas programadas | `@nestjs/schedule` (cron de recurrencia) |

**Puerto:** `3003`
**Prefijo global:** `/api/v1` (excepto `/mcp`)
**Swagger UI:** `http://localhost:3003/api/v1/docs`

### Comandos

```bash
npm install
npm run start:dev      # desarrollo con watch
npm run build           # build de producción
npm run test             # unit tests (Jest)
npm run test:e2e        # tests e2e (backend/test/)
npm run lint && npm run format
```

---

## Dependencias

Ver reglas de dependencias del `CLAUDE.md` raíz (npm, no mezclar managers,
confirmación explícita antes de instalar). No hay reglas adicionales
específicas de este repo.

---

## Variables de Entorno (`.env`)

```env
# Database
DB_HOST=localhost
DB_PORT=5433
DB_NAME=todo_db
DB_USER=todo_user
DB_PASSWORD=todo_password

# Environment
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
PORT=3003

# Authentication (spec-021)
AUTH_EMAIL=user@example.com
AUTH_PASSWORD=<contraseña en texto plano — solo para tu propia referencia/recuperación>
AUTH_PASSWORD_HASH=<bcrypt_hash_generated_via_backend/scripts/generate-bcrypt-hash.js>
JWT_SECRET=<your_jwt_secret_key_min_32_chars>
JWT_EXPIRES_IN=30d
MCP_API_KEY=<your_mcp_static_api_key>
```

**Para generar el hash bcrypt de la contraseña:**
```bash
node backend/scripts/generate-bcrypt-hash.js "your-password"
```
El script imprime tanto `AUTH_PASSWORD` (texto plano) como `AUTH_PASSWORD_HASH` (bcrypt)
para copiar ambos a `.env` / `.env.docker`.

⚠️ **`AUTH_PASSWORD` es solo de referencia** (para que el usuario pueda recordar/recuperar
su contraseña, ya que el spec-021 no incluye flujo de recuperación). El login **nunca**
compara contra `AUTH_PASSWORD` — `auth.service.ts` siempre valida con
`bcrypt.compare(password, AUTH_PASSWORD_HASH)`. Si editas una, actualiza la otra
manualmente para que no queden desincronizadas.

**Nunca commitear valores reales** de `AUTH_PASSWORD`, `AUTH_PASSWORD_HASH`, `JWT_SECRET`
ni `MCP_API_KEY`.

---

## Base de datos

- **Motor:** PostgreSQL 16 en Docker (`docker-compose.yml`, puerto externo `5433`)
- **`synchronize: false` siempre** (dev y producción) — nunca se sincronizan
  esquemas automáticamente, ni siquiera en desarrollo. Toda modificación de
  esquema requiere una migración explícita.
- **Migraciones:** `npx typeorm migration:run -d src/data-source.ts`
- **Generar migración:** `npx typeorm migration:generate src/migrations/<Nombre> -d src/data-source.ts`
- Nunca ejecutar migraciones en entornos distintos al local sin confirmación explícita del usuario.

---

## Backend y/o APIs

Este archivo describe la API que este mismo servicio expone (no consume APIs
externas). Autenticación: no implementada — app de uso personal, un solo usuario.

- Base URL desarrollo: `http://localhost:3003/api/v1`
- Base URL producción: `{{url de producción — ver Despliegue en CLAUDE.md raíz}}`

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
| `GET` | `/activities/schedule` | Cronograma mensual — `?year=&month=`, ver lógica |
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

### Finanzas — `/api/v1/{expenses,incomes,purchases,accounts,credit-cards,cdts,budgets,debts}`

Todos siguen el mismo patrón CRUD base (`POST`, `GET` paginado, `GET /:id`, `PATCH /:id`, `DELETE /:id`), con estas particularidades:

| Recurso | Rutas extra | Notas |
|---------|-------------|-------|
| `purchases` | — | `GET` acepta `?status=` |
| `cdts` | `GET /cdts/active` | CDTs con `endDate >= hoy` |
| `budgets` | `GET /budgets/monthly-summary?year=&month=` | `plannedTotal` + `executedTotal` + `variance` + `pendingPlannedTotal` + `unplannedTotal` + `byType` + `cardTotals` (spec-035 — ya no `budgetTotal`/`expensesTotal`/`combinedTotal`) |
| `budgets` | `DELETE /:id` | Borra el presupuesto **en cascada con todos sus gastos**, incluidos los ya ejecutados (spec-035); devuelve `{ executedExpensesRemoved, executedTotalRemoved }` |
| `expenses` | `POST` / `PATCH /:id` | Aceptan `plannedAmount` y `budgetId` (spec-035); `amount`/`date` pasan a opcionales — ver "Expense" abajo |
| `debts` | `POST /:id/pay-off`, `POST /:id/sync-budget-items` | Pago total anticipado y sincronización del calendario de cuotas (ver lógica de negocio abajo) |

`debts` sí tiene `PATCH /:id` y `DELETE /:id` a nivel REST (usados por el frontend en `/finances/debts`), pero **no están expuestos como tools MCP** — el agente de finanzas no puede editar ni eliminar deudas. El antiguo `POST /:id/pay` (pago de cuota individual) ya no existe (spec-026).

---

## Arquitectura y patrones internos

```
src/
├── main.ts                        Bootstrap, CORS, pipes, filtros, Swagger
├── app.module.ts                  Módulo raíz — importa Projects, Activities, Mcp, Finances
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
│   ├── activities.service.ts             Lógica de negocio + queries especializadas
│   ├── activities.controller.ts          Endpoints REST
│   └── recurrence-scheduler.service.ts   Cron diario: genera instancias del día siguiente
│
├── finances/
│   ├── entities/                  expense, income, purchase, account, credit-card, cdt, budget, budget-item, debt
│   ├── dto/                       create-*.dto.ts / update-*.dto.ts por entidad + query DTOs
│   ├── expenses.service.ts / .controller.ts
│   ├── incomes.service.ts / .controller.ts
│   ├── purchases.service.ts / .controller.ts
│   ├── accounts.service.ts / .controller.ts
│   ├── credit-cards.service.ts / .controller.ts
│   ├── cdts.service.ts / .controller.ts
│   ├── budgets.service.ts / .controller.ts    incluye items y getMonthlySummary
│   ├── debts.service.ts / .controller.ts      calendario de cuotas en presupuestos, pago total (spec-026)
│   └── finances.module.ts
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
    ├── 1776800000000-AddAutomatizacionToActivities.ts
    ├── 1781021538497-CascadeDeleteActivitiesOnProjectDelete.ts
    ├── 1782000000000-AddScheduledForTodayToActivities.ts
    ├── 1782000000001-AddNotionUrlToActivities.ts
    ├── 1782000000002-AddRecurrenceToActivities.ts
    ├── 1782000000003-SimplifyActivityModel.ts        Elimina event/device/duration/durationUnit/location/actionDate
    ├── 1782200000000-CreateExpensesAndIncomes.ts
    ├── 1782200000001-CreatePurchasesAccountsCardsCdts.ts
    ├── 1782200000002-CreateBudgets.ts
    ├── 1782743385300-AddTypeToBudgetItems.ts
    ├── 1782749715235-CreateDebts.ts
    ├── 1782908224127-AddCreditCardToExpenses.ts
    ├── 1786714977098-AddDebtScheduleAndBudgetItemLink.ts   spec-026: startMonth/startYear/paidOffAt, budget_items.debtId
    ├── 1786715738000-DropPaidInstallmentsFromDebts.ts      spec-026: columna reemplazada por cálculo derivado
    └── 1787100000000-UnifyBudgetItemsIntoExpenses.ts       spec-035: fusiona budget_items en expenses, elimina la tabla
```

### Entidades

#### Project (`projects`)

| Campo | Tipo DB | Notas |
|-------|---------|-------|
| `id` | `uuid` PK | generado |
| `name` | `varchar(255)` | requerido |
| `status` | `enum` | default `active` |
| `startDate` | `date` | requerido |
| `endDate` | `date` | nullable |
| `activities` | relación | `OneToMany → Activity` |
| `createdAt` / `updatedAt` | `timestamptz` | auto |

#### Activity (`activities`)

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

#### Expense (`expenses`)

> spec-035 fusionó `BudgetItem` en `Expense`: un gasto planeado y uno
> ejecutado son ahora la misma fila. Ver "Lógica de Negocio Importante →
> Presupuestos" para la semántica derivada (`planned | executed | settled`).

| Campo | Tipo DB | Notas |
|-------|---------|-------|
| `id` | `uuid` PK | generado |
| `description` | `varchar(255)` | requerido |
| `amount` | `decimal(12,2)` | COP, **nullable** — monto real ejecutado |
| `date` | `date` | **nullable** — fecha real de ejecución; siempre junto con `amount` |
| `plannedAmount` | `decimal(12,2)` | nullable — monto planeado del presupuesto |
| `type` | `enum` | `basico \| lujo \| ahorro \| pago_deuda` |
| `budget` | FK → `budgets` | nullable, `onDelete: CASCADE` — presupuesto al que pertenece (spec-035) |
| `creditCard` | FK → `credit_cards` | nullable, `onDelete: SET NULL` |
| `debt` | FK → `debts` | nullable, `onDelete: CASCADE` — cuota de deuda materializada (heredado de `BudgetItem`, spec-026) |
| `installmentNumber` | `int` | nullable — heredado de `BudgetItem` |
| `createdAt` / `updatedAt` | `timestamptz` | auto |

Invariantes en DB (`CHK_expenses_has_amount`, `CHK_expenses_amount_date_together`):
no puede haber una fila sin `plannedAmount` ni `amount`, y `amount`/`date`
siempre van juntos. Índices: `UQ_expenses_debt_installment` (parcial, portado
de `BudgetItem`) e `IDX_expenses_budgetId`.

`executionStatus` (`'planned' | 'executed' | 'settled'`) **no es columna** —
se calcula en `expenses.service.ts` (`withExecutionStatus()`,
`expense-execution-status.util.ts`) al serializar cada respuesta.

#### Income (`incomes`)

| Campo | Tipo DB | Notas |
|-------|---------|-------|
| `id` | `uuid` PK | generado |
| `description` | `varchar(255)` | requerido |
| `amount` | `decimal(12,2)` | COP |
| `date` | `date` | requerido |
| `type` | `enum` | `sueldo \| freelance \| intereses \| dividendos \| otro` |
| `createdAt` / `updatedAt` | `timestamptz` | auto |

#### Purchase (`purchases`)

| Campo | Tipo DB | Notas |
|-------|---------|-------|
| `id` | `uuid` PK | generado |
| `description` | `varchar(255)` | requerido |
| `estimatedPrice` | `decimal(12,2)` | nullable |
| `priority` | `enum` | default `media` |
| `store` | `enum` | default `otra` |
| `status` | `enum` | default `pendiente` |
| `url` | `varchar` | nullable |
| `notes` | `text` | nullable |
| `createdAt` / `updatedAt` | `timestamptz` | auto |

#### Account (`accounts`)

| Campo | Tipo DB | Notas |
|-------|---------|-------|
| `id` | `uuid` PK | generado |
| `name` | `varchar(255)` | requerido |
| `type` | `enum` | `corriente \| ahorros \| digital` |
| `bank` | `varchar(255)` | requerido |
| `currentBalance` | `decimal(15,2)` | COP |
| `interestRate` | `decimal(5,4)` | nullable, decimal (0.045 = 4.5%) |
| `createdAt` / `updatedAt` | `timestamptz` | auto |

#### CreditCard (`credit_cards`)

| Campo | Tipo DB | Notas |
|-------|---------|-------|
| `id` | `uuid` PK | generado |
| `name` | `varchar(255)` | requerido |
| `bank` | `varchar(255)` | requerido |
| `interestRate` | `decimal(5,4)` | anual, decimal |
| `monthlyFee` | `decimal(10,2)` | COP |
| `totalLimit` | `decimal(15,2)` | COP |
| `availableLimit` | `decimal(15,2)` | COP |
| `createdAt` / `updatedAt` | `timestamptz` | auto |

#### Cdt (`cdts`)

| Campo | Tipo DB | Notas |
|-------|---------|-------|
| `id` | `uuid` PK | generado |
| `bank` | `varchar(255)` | requerido |
| `investedAmount` | `decimal(15,2)` | COP |
| `interestRate` | `decimal(5,4)` | anual, decimal |
| `startDate` | `date` | requerido |
| `endDate` | `date` | requerido, debe ser posterior a `startDate` |
| `createdAt` / `updatedAt` | `timestamptz` | auto |

Activo si `endDate >= hoy` (calculado en `findActive()`, no persistido).

#### Budget (`budgets`)

> spec-035: `BudgetItem` **fue eliminada** (entidad y tabla `budget_items`).
> `Budget` ya no tiene ítems propios: su contenido son los `Expense` que lo
> referencian por `budgetId`.

| Campo | Tipo DB | Notas |
|-------|---------|-------|
| `id` | `uuid` PK | generado |
| `name` | `varchar(255)` | requerido |
| `month` | `integer` | 1–12 |
| `year` | `integer` | requerido, índice único `(month, year)` |
| `expenses` | relación | `OneToMany → Expense`, **sin `cascade`** — el borrado en cascada de sus gastos es una decisión de negocio explícita en `BudgetsService.remove()`, no un efecto de TypeORM |
| `createdAt` / `updatedAt` | `timestamptz` | auto |

`totalIncome`, `plannedTotal`, `executedTotal`, `variance` y `byType` no son
columnas — se calculan en `budgets.service.ts` al leer.

#### Debt (`debts`)

> spec-026 reemplazó el pago manual de cuotas por un calendario materializado
> en presupuestos — ver "Lógica de Negocio Importante → Deudas" más abajo.

| Campo | Tipo DB | Notas |
|-------|---------|-------|
| `id` | `uuid` PK | generado |
| `description` | `varchar(255)` | requerido |
| `productValue` | `decimal(12,2)` | COP |
| `installmentValue` | `decimal(12,2)` | COP |
| `totalInstallments` | `int` | requerido |
| `initialPayment` | `decimal(12,2)` | nullable |
| `startMonth` | `int` | 1–12, mes de la primera cuota |
| `startYear` | `int` | año de la primera cuota |
| `paidOffAt` | `timestamptz` | nullable, fecha del pago total anticipado (`pay-off`) |
| `status` | `enum` | default `activa`; se persiste `pagada` solo por pago total o normalización perezosa (ver abajo) |
| `createdAt` / `updatedAt` | `timestamptz` | auto |

`paidInstallments` **no es columna** (se eliminó en spec-026, Fase 7) — se
deriva en cada lectura a partir de `startMonth`/`startYear`, `totalInstallments`
y la fecha actual (`computePaidInstallments()` en `debts.service.ts`).
`remainingValue` tampoco es columna: `(totalInstallments − paidInstallments) ×
installmentValue`. `nextInstallment` (`{number, month, year} | null`) también se
deriva, para uso de la UI.

Las cuotas de deuda se materializan como `Expense` (`debt` + `installmentNumber`,
heredados de `BudgetItem` en spec-035) — ver `Expense` arriba.

### Enums

```
ProjectStatus:        active | inactive | paused | completed
ActivityStatus:       pending | in_progress | completed | cancelled | on_hold
ActivityType:         task | reminder
Priority:             high | medium | low
Energy:               high | medium | low
RecurrenceFrequency:  daily | weekly | biweekly | monthly | yearly
ExpenseType:          basico | lujo | ahorro | pago_deuda
IncomeType:           sueldo | freelance | intereses | dividendos | otro
PurchasePriority:     alta | media | baja
PurchaseStore:        amazon | temu | mercadolibre | otra
PurchaseStatus:       pendiente | comprado | descartado
AccountType:          corriente | ahorros | digital
DebtStatus:           activa | pagada
```

Ubicación: `src/common/enums/`

### Lógica de Negocio Importante

#### Sanitización por tipo (`sanitizeByType`)

Al crear o actualizar, el servicio limpia campos que no aplican según el tipo:

| Tipo | Comportamiento |
|------|----------------|
| `task` | `dueDate` se trunca a medianoche (sin componente horario) |
| `reminder` | `dueDate` se usa tal cual como fecha+hora del recordatorio |

Si se envía `parentId` en una actividad de tipo `reminder`, `sanitizeByType` lo descarta silenciosamente (los reminders no admiten subtareas).

#### Lógica de vencimiento (`findOverdue`)

- `task`: vencida si `dueDate < hoy 00:00` y `status != 'completed'`
- `reminder`: vencida si `dueDate < ahora` y `status != 'completed'`

#### Cronograma mensual (`findByMonth`, spec-025)

- `GET /activities/schedule?year=&month=` devuelve actividades de nivel
  superior (`parent IS NULL`) y no-plantilla (`isTemplate = false`) dentro
  del **rango visible de la grilla mensual**: el mes objetivo más los días de
  relleno Lunes–Domingo del mes anterior/siguiente (mismo criterio de semana
  que `findThisWeek`).
- La ubicación en el calendario usa `dueDate` o, si es `NULL`, `instanceDate`
  — así las instancias de tareas recurrentes (que solo reciben
  `instanceDate`, ver `buildInstanceFromTemplate`) también aparecen.
  **No usar `COALESCE(dueDate, instanceDate)`**: `instanceDate` es una
  columna `date` pura, y un `COALESCE` contra `dueDate` (`timestamptz`)
  fuerza a Postgres a promoverla usando la timezone de **sesión** de la
  base de datos (UTC), no la del servidor — desalinea el resultado con el
  rango de grilla (calculado en hora local) y corre las instancias un día en
  los bordes. La condición correcta compara `instanceDate` contra strings
  `YYYY-MM-DD` construidos con campos locales (`toDateOnlyString()`), nunca
  contra un `Date`/`timestamptz`. Bug real detectado en revisión de código,
  corregido antes de `[DONE]` — ver `spec-025`, Fase 9.
- **No** filtra por `status`: a diferencia de `findToday`/`findThisWeek`/
  `findOverdue`, las actividades completadas se incluyen (la UI las muestra
  atenuadas en vez de ocultarlas).
- Sin paginación; aplica un `take(500)` de seguridad.

#### Recurrencia (`recurrence-scheduler.service.ts`)

- Cron `EVERY_DAY_AT_MIDNIGHT`: por cada plantilla activa (`isTemplate: true`, `isRecurring: true`) evalúa si corresponde generar una instancia para el día siguiente y la crea.
- Al editar una plantilla, `name` / `description` / `priority` / `energy` se propagan automáticamente a las instancias futuras que sigan `pending` (no afecta instancias ya completadas o pasadas).

#### Completar subtareas en cascada (spec-024)

- Al hacer `update()` sobre una actividad y su `status` **transiciona** hacia
  `completed` (el status anterior no era `completed`), `ActivitiesService`
  completa automáticamente **todo el árbol de subtareas** de esa actividad:
  hijas directas y sus propias subtareas, recursivamente, sin límite de
  profundidad.
- Se completan **todas** las subtareas sin excepción, incluidas las que
  estuvieran en `cancelled`.
- La propagación es de **un solo sentido**: si luego el padre se desmarca (pasa
  de `completed` a otro status), las subtareas ya completadas **no revierten**.
- No se dispara si la actividad ya estaba en `completed` (evita re-propagar
  sobre subtareas que el usuario haya reabierto manualmente después), ni si el
  `update()` no toca el campo `status`.
- Al vivir en el servicio, aplica igual desde REST (`PATCH /activities/:id`),
  MCP (`update_activity`) y la UI — sin lógica duplicada en el frontend.

#### Deudas (`debts.service.ts`, spec-026, portado a `Expense` en spec-035)

- `create(dto)`: transacción atómica que guarda la deuda y materializa un
  `Expense` (`type: pago_deuda`, `description: "Cuota k/N — <descripción>"`,
  `plannedAmount = installmentValue`, `amount`/`date` en `null` — es plan
  hasta que se paga) por cada cuota, uno en cada mes consecutivo desde
  `startMonth`/`startYear`. Reutiliza el `Budget` del mes si existe; si no,
  lo crea con nombre autogenerado `"Presupuesto <Mes> <Año>"`.
- **Derivación de progreso** (sin pago manual): `paidInstallments` = cuotas
  vencidas según el calendario, comparado contra la fecha del servidor — la
  cuota del **mes en curso cuenta como vencida**. `findAll()`/`findOne()`
  normalizan de forma perezosa: si el calendario ya completó todas las cuotas
  pero `status` seguía en `activa`, lo persisten como `pagada` antes de
  devolver la deuda.
- `payOff(debtId)` (`POST /:id/pay-off`): pago total anticipado — elimina las
  cuotas de la deuda en meses **estrictamente futuros**, crea un `Expense`
  real (`description: "Pago total: <descripción>"`, `amount = remainingValue`,
  `date` de hoy, `plannedAmount: null`) por el saldo restante, pasando por el
  mismo **auto-vínculo** de mes que `ExpensesService.create()`, y marca
  `status: pagada` + `paidOffAt`. Rechaza si la deuda ya está pagada o no
  tiene saldo pendiente.
- `syncBudgetItems(debtId)` (`POST /:id/sync-budget-items` — la ruta conserva
  el nombre por decisión de spec-035; internamente ya no habla de "budget
  items"): idempotente, recrea únicamente las cuotas futuras que falten (p.
  ej. tras borrar una manualmente, o para materializar las cuotas de una
  deuda creada antes de spec-026). No toca cuotas vencidas ni deudas pagadas.
- `update(id, dto)`: si el cambio toca `installmentValue`, `totalInstallments`,
  `startMonth` o `startYear`, se **regeneran solo las cuotas futuras** (se
  borran y se recrean); las vencidas, incluida la del mes en curso, no se
  tocan. Rechaza editar el calendario de una deuda ya `pagada`. Si cambia
  `description`, se propaga a todas las cuotas (vencidas y futuras).
- `remove(id)`: las cuotas **vencidas** quedan en el presupuesto histórico
  desasociadas (`debtId`/`installmentNumber` a `null` — siguen siendo gastos
  planeados válidos); las **futuras** se eliminan. Luego se borra la deuda.
- `budgets.service.ts → duplicate()` excluye los gastos con `debt != null` al
  clonar un mes — las cuotas de deuda no se duplican, ya están (o estarán)
  puestas por la propia deuda en el mes destino.
- No existe pago de cuota individual — el antiguo `payInstallment()` /
  `POST /:id/pay` se eliminó por completo en spec-026.

#### Presupuestos (`budgets.service.ts`, rediseñado en spec-035)

> spec-035 fusionó `BudgetItem` en `Expense`. Un ítem de presupuesto es un
> gasto con `plannedAmount` + `budgetId`; puede o no tener ejecución
> (`amount`/`date`) en la misma fila.

- Un gasto pertenece al mes de su `budget` (FK), **no** de su `date` — un
  gasto planeado en junio y pagado el 2 de julio sigue contando en junio. Un
  gasto sin presupuesto se ubica por su `date`. `ExpensesService.applyMonthScope()`
  encapsula esta regla; la usan tanto `ExpensesService.findAll()` como los
  agregados de `BudgetsService`.
- **Auto-vínculo**: al crear un gasto con `date` en un mes que ya tiene
  presupuesto, se le asigna ese `budgetId` automáticamente
  (`ExpensesService.create()`). Nunca se auto-crea un presupuesto desde un
  gasto (a diferencia de las cuotas de deuda, que sí lo hacen).
- `getMonthlySummary(year, month)` ya **no** suma planeado + ejecutado en un
  solo total (esa suma causaba doble conteo cuando el mismo gasto tenía
  ambos). Devuelve `plannedTotal`, `executedTotal`, `variance` (planeado −
  ejecutado), `pendingPlannedTotal` (planeados sin ejecutar),
  `unplannedTotal` (ejecutados sin plan previo), `byType` (desglose planeado/
  ejecutado por `ExpenseType`) y `cardTotals` (ídem, por tarjeta).
- `BudgetsService.remove(id)` **borra en cascada todos los gastos del
  presupuesto**, incluidos los ya ejecutados (`ON DELETE CASCADE` en
  `expenses.budgetId`) — decisión consciente del spec, con advertencia
  explícita en la UI antes de confirmar. Devuelve
  `{ executedExpensesRemoved, executedTotalRemoved }`.
- `duplicate()` copia **solo el plan**: los gastos del mes destino nacen con
  `plannedAmount` pero `amount`/`date` en `null`, aunque el origen los
  tuviera. Los ingresos sí se recrean con fecha desplazada, sin cambios.
  `duplicate_expense` (gasto individual, no mes completo) sigue copiando todo
  tal cual — asimetría deliberada.
- Ya no existen `POST /:id/items`, `PATCH /:budgetId/items/:itemId` ni
  `DELETE /:budgetId/items/:itemId` — un ítem de presupuesto se crea/edita/
  borra como cualquier `Expense` (`POST/PATCH/DELETE /finances/expenses...`),
  con `budgetId` para el vínculo.

### Infraestructura Global (`main.ts`)

| Mecanismo | Comportamiento |
|-----------|---------------|
| `ValidationPipe` | `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true` |
| `TransformInterceptor` | Envuelve todas las respuestas en `{ statusCode, message, data }` |
| `HttpExceptionFilter` | Normaliza errores en `{ statusCode, message, data: null, path, timestamp }` |
| CORS | Origen: `FRONTEND_URL` env var (default `http://localhost:5173`) |
| Swagger | Disponible en `/api/v1/docs` |

---

## MCPs del proyecto

El endpoint `/mcp` expone `todo-api`: las mismas capacidades del REST API como
tools MCP para agentes de IA. Cada request crea un `McpServer` nuevo
(stateless). Ver también `docs/mcps/README.md` y los system prompts
`asistente-personal.system-prompt.md` / `finanzas-personales.system-prompt.md`.

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
| `get_activities_by_month` | Actividades del cronograma mensual (mes + relleno Lun–Dom), por `dueDate`/`instanceDate`; incluye completadas (spec-025) |
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
| `list_expenses` / `get_expense` / `create_expense` / `update_expense` / `delete_expense` | CRUD de gastos. `create_expense`/`update_expense` aceptan `plannedAmount`, `budgetId` y `creditCardId` (spec-035); `amount`/`date` opcionales, con `.refine()` de consistencia — ver "Presupuestos" arriba |
| `duplicate_expense` | Duplica un gasto individual a otro mes/año tal cual (amount/date incluidos si el origen los tenía) — asimetría deliberada con `duplicate_budget` |
| `list_incomes` / `get_income` / `create_income` / `update_income` / `delete_income` | CRUD de ingresos |
| `list_purchases` / `get_purchase` / `create_purchase` / `update_purchase` / `delete_purchase` | CRUD de lista de deseos |
| `list_accounts` / `get_account` / `create_account` / `update_account` / `delete_account` | CRUD de cuentas |
| `list_credit_cards` / `get_credit_card` / `create_credit_card` / `update_credit_card` / `delete_credit_card` | CRUD de tarjetas de crédito |
| `list_cdts` / `get_cdt` / `get_active_cdts` / `create_cdt` / `update_cdt` / `delete_cdt` | CRUD de CDTs + consulta de activos |
| `list_budgets` / `get_budget` / `create_budget` / `update_budget` / `delete_budget` | CRUD de presupuestos. `create_budget` ya no acepta `items` anidados (nace vacío, spec-035); `get_budget` devuelve `expenses`/`byType` en vez de `items`/`typeSummary`; `delete_budget` borra en cascada todos los gastos, incluidos ejecutados |
| `get_monthly_expense_summary` | Contrato rediseñado en spec-035: `plannedTotal`/`executedTotal`/`variance`/`pendingPlannedTotal`/`unplannedTotal`/`byType`/`cardTotals` — ya no `budgetTotal`/`expensesTotal`/`combinedTotal` |
| `duplicate_budget` | Duplica un presupuesto: copia **solo el plan** de sus gastos (spec-035) + todos los ingresos, con desplazamiento y clamp de fechas, a otro mes/año; 409 si el destino ya tiene presupuesto |
| `list_debts` / `create_debt` / `pay_debt_full` | Deudas — `create_debt` materializa automáticamente las cuotas en presupuestos; `pay_debt_full` reemplaza al antiguo pago de cuota individual (eliminado en spec-026). **Sin** `update_debt` ni `delete_debt` (solo disponibles vía REST) |

Reglas de gestión de MCPs, criterios para agregar tools nuevas y estructura de
los system prompts: ver sección "MCPs del proyecto" en el `CLAUDE.md` raíz.

---

## Convenciones de código

- Los servicios lanzan `NotFoundException` cuando no encuentran una entidad por ID
- Nunca usar `synchronize: true` — siempre migraciones explícitas
- Los enums viven en `src/common/enums/` — uno por archivo
- Los DTOs usan `@IsOptional()` + decoradores de validación estrictos
- `UpdateActivityDto` y `UpdateProjectDto` son `PartialType` de sus Create
- El `baseQuery()` siempre hace `leftJoinAndSelect` de `project`, `parent` y `subtasks` para devolver entidades completas
- La lógica de negocio va en el servicio, nunca en el controlador
- Cualquier tool nueva en `mcp.service.ts` debe declarar en su schema Zod
  exactamente los mismos campos que el DTO real — nunca inventar parámetros

---

## Testing

- Framework: Jest (`*.spec.ts`), junto al módulo (`src/**/*.spec.ts`).
- Tests e2e: `backend/test/` con configuración `jest-e2e.json`.
- Antes de cerrar una tarea con lógica crítica, verificar que existe al menos
  un test que cubra el caso feliz.
- No borrar ni modificar tests existentes sin instrucción explícita.
- Los tests e2e son responsabilidad de `@tester` y se ejecutan como última
  fase de cada spec antes del merge a `development`.

---

## Specs de funcionalidades

Ubicación, nomenclatura, estados y estructura mínima: ver `CLAUDE.md` raíz.
Los specs que impactan el backend se diseñan con `@architect` y se revisan
con `@reviewer` (`/.claude/agents/`) antes de marcarlos `[DONE]`.

---

## Despliegue

Ver sección "Despliegue" del `CLAUDE.md` raíz — infraestructura (Railway),
checklist y proceso paso a paso son los mismos para todo el ecosistema.
Healthcheck de este servicio: `/api/v1/docs` (definido en `railway.toml`).

---

## Acciones prohibidas

Ver "Acciones prohibidas" del `CLAUDE.md` raíz — aplican sin cambios aquí.

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
| `src/activities/recurrence-scheduler.service.ts` | Cron de generación de instancias recurrentes |
| `src/projects/projects.service.ts` | CRUD de proyectos |
| `src/finances/finances.module.ts` | Módulo de finanzas (8 subdominios) |
| `src/finances/debts.service.ts` | Calendario de cuotas materializado en presupuestos, pago total y sincronización (spec-026) |
| `src/finances/budgets.service.ts` | Presupuestos, ítems y resumen mensual combinado |
| `src/mcp/mcp.service.ts` | Definición de tools MCP |
| `src/common/interceptors/transform.interceptor.ts` | Wrapper de respuestas |
| `src/common/filters/http-exception.filter.ts` | Formato de errores |
