# spec-013 — [IN PROGRESS] Sección de finanzas

## Contexto

El proyecto ToDo es una app de gestión personal con módulos de actividades y proyectos. Este spec extiende el sistema con un módulo de finanzas personales que cubre seguimiento de gastos e ingresos, lista de deseos de compras, gestión de cuentas bancarias, tarjetas de crédito, CDTs y presupuestos mensuales.

El módulo sigue exactamente los mismos patrones arquitecturales del proyecto: NestJS en backend y React + React Query en frontend, enums centralizados en `common/enums/`, migraciones explícitas, respuestas envueltas por `TransformInterceptor`, y servicios/hooks desacoplados en frontend.

## Alcance

- 7 entidades de dominio: Gasto, Ingreso, Compra, Cuenta, TarjetaCredito, CDT, Presupuesto (con BudgetItem embebido)
- CRUD completo para cada entidad con endpoints REST bajo `/api/v1/finances/`
- Frontend con páginas dedicadas por entidad bajo `/finances/`
- Integración en navegación (sidebar) y router principal

## Lo que NO incluye este spec

- Cálculos automáticos de balance ni proyecciones de ahorro
- Relación entre Gasto/Ingreso y Cuenta (movimientos de cuenta)
- Gráficas o dashboards de análisis financiero
- Exportación a CSV/Excel
- Notificaciones de vencimiento de CDT o tarjeta
- Prompts o recursos MCP (solo tools)

## Impacto en el sistema

- **Backend:** nuevo módulo `finances/` con 7 entidades, sus DTOs, services, controllers y módulo NestJS. Nuevos enums en `common/enums/`. 3 migraciones (una por grupo lógico). Registro del módulo en `app.module.ts`.
- **Frontend:** nuevo directorio `pages/finances/` y `components/finances/`, nuevos servicios en `services/finances/`, nuevos hooks en `hooks/finances/`, interfaces y enums nuevos en `types/index.ts`.
- **Navegación:** sidebar y router actualizados con sección Finanzas.
- **Base de datos:** 8 tablas nuevas: `expenses`, `incomes`, `purchases`, `accounts`, `credit_cards`, `cdts`, `budgets`, `budget_items`.

---

## Fases de implementación

### Fase 1 — Enums compartidos de finanzas (backend)

- [x] Crear `backend/src/common/enums/expense-type.enum.ts` — valores: `basico | lujo | ahorro | pago_deuda`
- [x] Crear `backend/src/common/enums/income-type.enum.ts` — valores: `sueldo | freelance | intereses | dividendos | otro`
- [x] Crear `backend/src/common/enums/purchase-priority.enum.ts` — valores: `alta | media | baja`
- [x] Crear `backend/src/common/enums/purchase-store.enum.ts` — valores: `amazon | temu | mercadolibre | otra`
- [x] Crear `backend/src/common/enums/purchase-status.enum.ts` — valores: `pendiente | comprado | descartado`
- [x] Crear `backend/src/common/enums/account-type.enum.ts` — valores: `corriente | ahorros | digital`

### Fase 2 — Entidades Gasto e Ingreso (backend)

- [x] Crear `backend/src/finances/entities/expense.entity.ts` — campos: `id` (uuid PK), `description` (varchar 255), `amount` (decimal 12,2), `date` (date), `type` (enum ExpenseType), `createdAt`, `updatedAt`
- [x] Crear `backend/src/finances/entities/income.entity.ts` — campos: `id` (uuid PK), `description` (varchar 255), `amount` (decimal 12,2), `date` (date), `type` (enum IncomeType), `createdAt`, `updatedAt`
- [x] Crear `backend/src/finances/dto/create-expense.dto.ts`
- [x] Crear `backend/src/finances/dto/update-expense.dto.ts` — PartialType de CreateExpenseDto
- [x] Crear `backend/src/finances/dto/create-income.dto.ts`
- [x] Crear `backend/src/finances/dto/update-income.dto.ts` — PartialType de CreateIncomeDto
- [x] Crear `backend/src/finances/expenses.service.ts` — CRUD, `findAll` acepta `PaginationDto`, lanza `NotFoundException` en findOne/update/remove
- [x] Crear `backend/src/finances/expenses.controller.ts` — GET `/expenses`, GET `/expenses/:id`, POST `/expenses`, PATCH `/expenses/:id`, DELETE `/expenses/:id` (204)
- [x] Crear `backend/src/finances/incomes.service.ts` — mismo patrón que expenses
- [x] Crear `backend/src/finances/incomes.controller.ts` — GET `/incomes`, GET `/incomes/:id`, POST `/incomes`, PATCH `/incomes/:id`, DELETE `/incomes/:id` (204)

### Fase 3 — Entidad Compra / Wishlist (backend)

- [x] Crear `backend/src/finances/entities/purchase.entity.ts` — campos: `id` (uuid PK), `description` (varchar 255), `estimatedPrice` (decimal 12,2 nullable), `priority` (enum PurchasePriority, default `media`), `store` (enum PurchaseStore, default `otra`), `status` (enum PurchaseStatus, default `pendiente`), `url` (varchar nullable), `notes` (text nullable), `createdAt`, `updatedAt`
- [x] Crear `backend/src/finances/dto/create-purchase.dto.ts`
- [x] Crear `backend/src/finances/dto/update-purchase.dto.ts` — PartialType de CreatePurchaseDto
- [x] Crear `backend/src/finances/purchases.service.ts` — CRUD + `findAll` con filtro opcional por `status`, acepta `PaginationDto`
- [x] Crear `backend/src/finances/purchases.controller.ts` — GET `/purchases` (con `?status=`), GET `/purchases/:id`, POST `/purchases`, PATCH `/purchases/:id`, DELETE `/purchases/:id` (204)

### Fase 4 — Entidades Cuenta, Tarjeta de Crédito y CDT (backend)

- [x] Crear `backend/src/finances/entities/account.entity.ts` — campos: `id` (uuid PK), `name` (varchar 255), `type` (enum AccountType), `bank` (varchar 255), `currentBalance` (decimal 15,2), `interestRate` (decimal 5,4 nullable), `createdAt`, `updatedAt`
- [x] Crear `backend/src/finances/entities/credit-card.entity.ts` — campos: `id` (uuid PK), `name` (varchar 255), `bank` (varchar 255), `interestRate` (decimal 5,4), `monthlyFee` (decimal 10,2), `totalLimit` (decimal 15,2), `availableLimit` (decimal 15,2), `createdAt`, `updatedAt`
- [x] Crear `backend/src/finances/entities/cdt.entity.ts` — campos: `id` (uuid PK), `bank` (varchar 255), `investedAmount` (decimal 15,2), `interestRate` (decimal 5,4), `startDate` (date), `endDate` (date), `createdAt`, `updatedAt`
- [x] Crear `backend/src/finances/dto/create-account.dto.ts`
- [x] Crear `backend/src/finances/dto/update-account.dto.ts` — PartialType
- [x] Crear `backend/src/finances/dto/create-credit-card.dto.ts`
- [x] Crear `backend/src/finances/dto/update-credit-card.dto.ts` — PartialType
- [x] Crear `backend/src/finances/dto/create-cdt.dto.ts`
- [x] Crear `backend/src/finances/dto/update-cdt.dto.ts` — PartialType
- [x] Crear `backend/src/finances/accounts.service.ts` — CRUD completo con `PaginationDto`
- [x] Crear `backend/src/finances/accounts.controller.ts` — endpoints REST estándar bajo `/accounts`
- [x] Crear `backend/src/finances/credit-cards.service.ts` — CRUD completo
- [x] Crear `backend/src/finances/credit-cards.controller.ts` — endpoints REST bajo `/credit-cards`
- [x] Crear `backend/src/finances/cdts.service.ts` — CRUD + método `findActive` (endDate >= hoy)
- [x] Crear `backend/src/finances/cdts.controller.ts` — endpoints REST bajo `/cdts` + GET `/cdts/active`

### Fase 5 — Entidad Presupuesto (backend)

- [ ] Crear `backend/src/finances/entities/budget.entity.ts` — campos: `id` (uuid PK), `name` (varchar 255), `month` (integer 1–12), `year` (integer), `items` (OneToMany → BudgetItem), `createdAt`, `updatedAt`
- [ ] Crear `backend/src/finances/entities/budget-item.entity.ts` — campos: `id` (uuid PK), `budget` (ManyToOne → Budget, onDelete CASCADE), `description` (varchar 255), `plannedAmount` (decimal 12,2), `createdAt`, `updatedAt`
- [ ] Crear `backend/src/finances/dto/create-budget-item.dto.ts`
- [ ] Crear `backend/src/finances/dto/create-budget.dto.ts` — campos: `name`, `month` (1–12), `year` (>= 2020), `items` (array opcional de CreateBudgetItemDto)
- [ ] Crear `backend/src/finances/dto/update-budget.dto.ts` — PartialType sin items
- [ ] Crear `backend/src/finances/budgets.service.ts` — CRUD; `findOne` hace leftJoinAndSelect de `items`; `findAll` filtra por `year` y `month` opcionales; creación en transacción para Budget + BudgetItems
- [ ] Crear `backend/src/finances/budgets.controller.ts` — GET `/budgets` (con `?year=&month=`), GET `/budgets/:id`, POST `/budgets`, PATCH `/budgets/:id`, DELETE `/budgets/:id` (204); POST `/budgets/:id/items`, DELETE `/budgets/:budgetId/items/:itemId`

### Fase 6 — Módulo NestJS, migraciones y registro (backend)

- [ ] Crear `backend/src/finances/finances.module.ts` — importa `TypeOrmModule.forFeature` con las 8 entidades; declara y exporta todos los services y controllers
- [ ] Crear migración `backend/src/migrations/<timestamp>-CreateExpensesAndIncomes.ts` — tablas `expenses` e `incomes` con enums de PostgreSQL
- [ ] Crear migración `backend/src/migrations/<timestamp>-CreatePurchasesAccountsCardsCdts.ts` — tablas `purchases`, `accounts`, `credit_cards`, `cdts`
- [ ] Crear migración `backend/src/migrations/<timestamp>-CreateBudgets.ts` — tablas `budgets` y `budget_items` con FK y onDelete CASCADE
- [ ] Editar `backend/src/app.module.ts` — importar y registrar `FinancesModule`

### Fase 7 — Tipos, servicios y hooks: Gastos e Ingresos (frontend)

- [ ] Editar `frontend/src/types/index.ts` — agregar enums: `ExpenseType`, `IncomeType`; interfaces: `Expense`, `Income`; DTOs: `CreateExpenseDto`, `UpdateExpenseDto`, `CreateIncomeDto`, `UpdateIncomeDto`
- [ ] Crear `frontend/src/services/finances/expenses.service.ts` — `getExpenses(params)`, `getExpense(id)`, `createExpense(dto)`, `updateExpense(id, dto)`, `deleteExpense(id)`
- [ ] Crear `frontend/src/services/finances/incomes.service.ts` — funciones análogas
- [ ] Crear `frontend/src/hooks/finances/useExpenses.ts` — `useExpenses`, `useExpense`, `useCreateExpense`, `useUpdateExpense`, `useDeleteExpense`; mutations invalidan `['expenses']`
- [ ] Crear `frontend/src/hooks/finances/useIncomes.ts` — mismo patrón, query key `['incomes']`

### Fase 8 — Páginas de Gastos e Ingresos (frontend)

- [ ] Crear `frontend/src/components/finances/ExpenseForm.tsx` — React Hook Form + Zod; campos: description, amount, date, type
- [ ] Crear `frontend/src/components/finances/IncomeForm.tsx` — campos: description, amount, date, type
- [ ] Crear `frontend/src/components/finances/ExpenseCard.tsx` — muestra description, amount (COP), date, badge de type
- [ ] Crear `frontend/src/components/finances/IncomeCard.tsx` — misma estructura para ingresos
- [ ] Crear `frontend/src/pages/finances/ExpensesView.tsx` — lista paginada, botón crear, modal con `ExpenseForm`, `ConfirmDialog` para eliminar
- [ ] Crear `frontend/src/pages/finances/IncomesView.tsx` — mismo patrón

### Fase 9 — Tipos, servicios, hooks y página de Compras (frontend)

- [ ] Editar `frontend/src/types/index.ts` — agregar enums: `PurchasePriority`, `PurchaseStore`, `PurchaseStatus`; interfaz: `Purchase`; DTOs: `CreatePurchaseDto`, `UpdatePurchaseDto`
- [ ] Crear `frontend/src/services/finances/purchases.service.ts` — `getPurchases(params, status?)`, `getPurchase(id)`, `createPurchase(dto)`, `updatePurchase(id, dto)`, `deletePurchase(id)`
- [ ] Crear `frontend/src/hooks/finances/usePurchases.ts` — hooks análogos, filtro de status en query params, query key `['purchases']`
- [ ] Crear `frontend/src/components/finances/PurchaseForm.tsx` — campos: description, estimatedPrice (opcional), priority, store, status, url (opcional), notes (opcional)
- [ ] Crear `frontend/src/components/finances/PurchaseCard.tsx` — description, precio estimado, badges de priority/store/status, link si hay url
- [ ] Crear `frontend/src/pages/finances/PurchasesView.tsx` — lista tipo wishlist, tabs por status (Todos / Pendiente / Comprado / Descartado), modal con `PurchaseForm`, `ConfirmDialog`

### Fase 10 — Tipos, servicios, hooks y páginas de Cuentas, Tarjetas y CDTs (frontend)

- [ ] Editar `frontend/src/types/index.ts` — agregar enum: `AccountType`; interfaces: `Account`, `CreditCard`, `Cdt`; DTOs correspondientes
- [ ] Crear `frontend/src/services/finances/accounts.service.ts` — CRUD completo
- [ ] Crear `frontend/src/services/finances/credit-cards.service.ts` — CRUD completo
- [ ] Crear `frontend/src/services/finances/cdts.service.ts` — CRUD + `getActiveCdts()`
- [ ] Crear `frontend/src/hooks/finances/useAccounts.ts` — query key `['accounts']`
- [ ] Crear `frontend/src/hooks/finances/useCreditCards.ts` — query key `['credit-cards']`
- [ ] Crear `frontend/src/hooks/finances/useCdts.ts` — query key `['cdts']`; incluye `useActiveCdts()`
- [ ] Crear `frontend/src/components/finances/AccountForm.tsx` — campos: name, type, bank, currentBalance, interestRate (opcional)
- [ ] Crear `frontend/src/components/finances/CreditCardForm.tsx` — campos: name, bank, interestRate, monthlyFee, totalLimit, availableLimit
- [ ] Crear `frontend/src/components/finances/CdtForm.tsx` — campos: bank, investedAmount, interestRate, startDate, endDate
- [ ] Crear `frontend/src/components/finances/AccountCard.tsx` — name, badge de type, bank, saldo actual en COP, tasa si aplica
- [ ] Crear `frontend/src/components/finances/CreditCardCard.tsx` — name, bank, cupo disponible vs total, tasa, cuota de manejo
- [ ] Crear `frontend/src/components/finances/CdtCard.tsx` — bank, monto, tasa, fechas, badge si vence en < 30 días
- [ ] Crear `frontend/src/pages/finances/AccountsView.tsx` — grid de tarjetas, botón crear, modal, `ConfirmDialog`
- [ ] Crear `frontend/src/pages/finances/CreditCardsView.tsx` — mismo patrón
- [ ] Crear `frontend/src/pages/finances/CdtsView.tsx` — lista separada visualmente en CDTs activos vs vencidos

### Fase 11 — Tipos, servicios, hooks y páginas de Presupuesto (frontend)

- [ ] Editar `frontend/src/types/index.ts` — agregar interfaces: `BudgetItem`, `Budget`; DTOs: `CreateBudgetItemDto`, `CreateBudgetDto`, `UpdateBudgetDto`
- [ ] Crear `frontend/src/services/finances/budgets.service.ts` — `getBudgets(params, year?, month?)`, `getBudget(id)`, `createBudget(dto)`, `updateBudget(id, dto)`, `deleteBudget(id)`, `addBudgetItem(budgetId, dto)`, `deleteBudgetItem(budgetId, itemId)`
- [ ] Crear `frontend/src/hooks/finances/useBudgets.ts` — hooks: `useBudgets`, `useBudget`, `useCreateBudget`, `useUpdateBudget`, `useDeleteBudget`, `useAddBudgetItem`, `useDeleteBudgetItem`; mutations invalidan `['budgets']`
- [ ] Crear `frontend/src/components/finances/BudgetForm.tsx` — campos: name, month (selector 1–12), year
- [ ] Crear `frontend/src/components/finances/BudgetItemForm.tsx` — campos: description, plannedAmount; formulario inline
- [ ] Crear `frontend/src/pages/finances/BudgetsView.tsx` — lista con filtro por año, total planificado, botón crear, modal con `BudgetForm`, `ConfirmDialog`
- [ ] Crear `frontend/src/pages/finances/BudgetDetailView.tsx` — detalle con nombre, mes/año, tabla de ítems, total planificado, formulario inline para agregar ítem, eliminación de ítem con confirmación

### Fase 12 — Integración MCP (backend)

Exponer todas las entidades de finanzas como tools MCP siguiendo el patrón del `McpService` existente: un método `register<Entidad>Tools(server)` por entidad, invocado desde `createServer()`.

- [ ] Editar `backend/src/mcp/mcp.service.ts` — inyectar en el constructor: `ExpensesService`, `IncomesService`, `PurchasesService`, `AccountsService`, `CreditCardsService`, `CdtsService`, `BudgetsService`
- [ ] Editar `backend/src/mcp/mcp.service.ts` — agregar llamadas en `createServer()`: `this.registerExpenseTools(server)`, `this.registerIncomeTools(server)`, `this.registerPurchaseTools(server)`, `this.registerAccountTools(server)`, `this.registerCreditCardTools(server)`, `this.registerCdtTools(server)`, `this.registerBudgetTools(server)`
- [ ] Editar `backend/src/mcp/mcp.service.ts` — implementar `registerExpenseTools`: tools `list_expenses`, `get_expense`, `create_expense`, `update_expense`, `delete_expense`
- [ ] Editar `backend/src/mcp/mcp.service.ts` — implementar `registerIncomeTools`: tools `list_incomes`, `get_income`, `create_income`, `update_income`, `delete_income`
- [ ] Editar `backend/src/mcp/mcp.service.ts` — implementar `registerPurchaseTools`: tools `list_purchases` (con filtro opcional `status`), `get_purchase`, `create_purchase`, `update_purchase`, `delete_purchase`
- [ ] Editar `backend/src/mcp/mcp.service.ts` — implementar `registerAccountTools`: tools `list_accounts`, `get_account`, `create_account`, `update_account`, `delete_account`
- [ ] Editar `backend/src/mcp/mcp.service.ts` — implementar `registerCreditCardTools`: tools `list_credit_cards`, `get_credit_card`, `create_credit_card`, `update_credit_card`, `delete_credit_card`
- [ ] Editar `backend/src/mcp/mcp.service.ts` — implementar `registerCdtTools`: tools `list_cdts`, `get_cdt`, `get_active_cdts`, `create_cdt`, `update_cdt`, `delete_cdt`
- [ ] Editar `backend/src/mcp/mcp.service.ts` — implementar `registerBudgetTools`: tools `list_budgets` (con filtros `year` y `month`), `get_budget` (incluye items), `create_budget`, `update_budget`, `delete_budget`, `add_budget_item`, `delete_budget_item`
- [ ] Editar `backend/src/mcp/mcp.module.ts` — importar `FinancesModule` para tener acceso a los services de finanzas

### Fase 13 — Integración: rutas y navegación (frontend)

- [ ] Editar `frontend/src/App.tsx` — agregar rutas bajo `/finances/`: `expenses`, `incomes`, `purchases`, `accounts`, `credit-cards`, `cdts`, `budgets`, `budgets/:id`; todas dentro del `<Route element={<MainLayout />}>`; agregar ruta `/finances` → `FinancesDashboard`
- [ ] Editar `frontend/src/components/layout/Sidebar.tsx` — agregar sección "Finanzas" con enlaces a Gastos, Ingresos, Compras, Cuentas, Tarjetas, CDTs, Presupuestos
- [ ] Crear `frontend/src/pages/finances/FinancesDashboard.tsx` — página de bienvenida con cards de acceso rápido a cada subsección

---

## Criterios de aceptación

- Todos los endpoints de `/api/v1/finances/` responden con `{ statusCode, message, data }` del `TransformInterceptor`
- Los errores 404 por ID no existente devuelven el formato del `HttpExceptionFilter`
- Las 3 migraciones corren sin errores y crean las 8 tablas esperadas
- El `FinancesModule` está registrado en `app.module.ts` y sus entidades son reconocidas por TypeORM
- Cada página del frontend carga datos reales desde el backend (no mocks)
- Las mutations invalidan las query keys correctas y actualizan la UI sin refresh manual
- Los formularios validan con Zod antes de enviar y muestran errores de campo inline
- La navegación en sidebar muestra la sección Finanzas con todos sus sub-enlaces
- Las rutas `/finances/*` están dentro del `MainLayout`
- Los montos se muestran en COP (pesos colombianos) en todos los componentes de visualización
- Los campos de `interestRate` aceptan valores decimales (ej. `0.1250` para 12.50%)
- La vista de CDTs separa visualmente activos (endDate >= hoy) de vencidos
- La vista de Compras filtra por status sin perder la paginación
- El servidor MCP expone las 33 tools de finanzas (`list_*`, `get_*`, `create_*`, `update_*`, `delete_*` por entidad + `get_active_cdts`, `add_budget_item`, `delete_budget_item`)
- Las tools MCP de finanzas siguen el mismo patrón `ok()` / `err()` del `McpService` existente
