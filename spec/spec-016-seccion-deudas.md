# spec-016 — [IN PROGRESS] Sección de deudas

## Contexto

El módulo de finanzas carece de un tracker de deudas a cuotas. El usuario necesita registrar préstamos o compras financiadas (créditos de consumo, cuotas de ropa, electrodomésticos, etc.), ver cuánto le falta por pagar y marcar cuotas como pagadas desde la misma vista. Cada pago de cuota debe quedar registrado como un gasto de tipo `pago_deuda` para que el consolidado mensual lo refleje.

## Alcance

- CRUD completo de deudas (crear, listar, editar descripción/valores, eliminar).
- Campos por deuda: descripción, valor producto, valor cuota, número de cuotas, cuota inicial (opcional), cuotas pagadas, valor restante (calculado), estado (`activa` / `pagada`).
- Acción **"Pagar cuota"**: crea un gasto de tipo `pago_deuda` por el valor de la cuota, incrementa `cuotasPagadas` y, si se llega al total, cambia el estado a `pagada`.
- Herramienta MCP para listar deudas, crear deuda y pagar cuota.
- Entrada en `FinancesDashboard` y ruta `/finances/debts`.

### Lo que NO incluye

- Historial de pagos de cada cuota (solo el contador total).
- Amortización con intereses (las cuotas son valores fijos ingresados por el usuario).
- Notificaciones o recordatorios de vencimiento.
- Edición de cuotas pagadas manualmente (solo se incrementa via botón).

## Impacto en el sistema

- **Backend:**
  - Nueva entidad `Debt` en `backend/src/finances/entities/debt.entity.ts`.
  - DTOs: `CreateDebtDto`, `UpdateDebtDto`, `PayInstallmentDto` (vacío, la acción no requiere body).
  - Nuevo `DebtsService` en `backend/src/finances/debts.service.ts`.
  - Nuevo `DebtsController` en `backend/src/finances/debts.controller.ts`.
  - Registro del módulo en `finances.module.ts`.
  - Migración TypeORM para la tabla `debts`.
- **MCP:**
  - Inyección de `DebtsService` en `McpService`.
  - Tres nuevas tools: `list_debts`, `create_debt`, `pay_debt_installment`.
- **Frontend:**
  - Nuevos tipos `Debt`, `CreateDebtDto`, `UpdateDebtDto`, `DebtStatus` en `src/types/index.ts`.
  - Nuevo servicio `src/services/finances/debts.service.ts`.
  - Nuevo hook `src/hooks/finances/useDebts.ts`.
  - Nueva página `src/pages/finances/DebtsView.tsx`.
  - Ruta `/finances/debts` en `App.tsx`.
  - Tarjeta de sección "Deudas" en `FinancesDashboard.tsx`.

## Fases de implementación

### Fase 1 — Entidad y migración (backend)

- [x] Crear `backend/src/finances/entities/debt.entity.ts`:
  ```ts
  @Entity('debts')
  export class Debt {
    @PrimaryGeneratedColumn('uuid') id: string;
    @Column({ type: 'varchar', length: 255 }) description: string;
    @Column({ type: 'decimal', precision: 12, scale: 2 }) productValue: number;
    @Column({ type: 'decimal', precision: 12, scale: 2 }) installmentValue: number;
    @Column({ type: 'int' }) totalInstallments: number;
    @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true }) initialPayment: number | null;
    @Column({ type: 'int', default: 0 }) paidInstallments: number;
    @Column({ type: 'enum', enum: DebtStatus, default: DebtStatus.ACTIVE }) status: DebtStatus;
    @CreateDateColumn() createdAt: Date;
    @UpdateDateColumn() updatedAt: Date;
  }
  ```
- [x] Crear enum `DebtStatus` (`ACTIVE = 'activa'`, `PAID = 'pagada'`) en `backend/src/common/enums/debt-status.enum.ts`.
- [x] Generar migración TypeORM para la tabla `debts` y ejecutarla en local.

### Fase 2 — DTOs, servicio y controlador (backend)

- [x] Crear `backend/src/finances/dto/create-debt.dto.ts` con validaciones (`IsString`, `IsNumber`, `IsPositive`, `IsOptional`):
  - `description: string` (max 255)
  - `productValue: number`
  - `installmentValue: number`
  - `totalInstallments: number` (int, min 1)
  - `initialPayment?: number`
- [x] Crear `backend/src/finances/dto/update-debt.dto.ts` — `PartialType(CreateDebtDto)`.
- [x] Crear `backend/src/finances/debts.service.ts` con los métodos:
  - `findAll(status?: DebtStatus): Promise<Debt[]>` — lista todas; si se pasa `status`, filtra.
  - `findOne(id: string): Promise<Debt>` — lanza `NotFoundException` si no existe.
  - `create(dto: CreateDebtDto): Promise<Debt>`.
  - `update(id: string, dto: UpdateDebtDto): Promise<Debt>`.
  - `remove(id: string): Promise<void>`.
  - `payInstallment(id: string): Promise<{ debt: Debt; expenseId: string }>`:
    1. Busca la deuda; lanza `BadRequestException` si `status === 'pagada'`.
    2. Crea un `Expense` con `description: \`Cuota: ${debt.description}\``, `amount: debt.installmentValue`, `date: today`, `type: ExpenseType.PAGO_DEUDA`.
    3. Incrementa `paidInstallments`.
    4. Si `paidInstallments >= totalInstallments`, cambia `status` a `PAID`.
    5. Guarda la deuda y retorna `{ debt, expenseId: expense.id }`.
  - `getRemainingValue(debt: Debt): number` — `(debt.totalInstallments - debt.paidInstallments) * debt.installmentValue` (helper interno, se usa en serialización o en el servicio al devolver deudas).
- [x] Crear `backend/src/finances/debts.controller.ts`:
  - `GET /finances/debts` — `findAll` (query param `?status=activa|pagada`).
  - `GET /finances/debts/:id` — `findOne`.
  - `POST /finances/debts` — `create`.
  - `PATCH /finances/debts/:id` — `update`.
  - `DELETE /finances/debts/:id` — `remove` (204).
  - `POST /finances/debts/:id/pay` — `payInstallment`.
- [x] Registrar `DebtsController`, `DebtsService` y la entidad `Debt` en `finances.module.ts`.

### Fase 3 — MCP tools (backend)

- [x] Inyectar `DebtsService` en el constructor de `McpService` y registrar en `mcp.module.ts`.
- [x] Agregar método `registerDebtTools(server: McpServer)` en `mcp.service.ts` y llamarlo en `createServer()`:
  - **`list_debts`**: parámetro opcional `status: 'activa' | 'pagada'`. Devuelve lista de deudas con `remainingValue` calculado. Descripción: `"Lista las deudas registradas. Usa status para filtrar por activa o pagada."`.
  - **`create_debt`**: parámetros `description`, `productValue`, `installmentValue`, `totalInstallments`, `initialPayment?`. Descripción: `"Crea una nueva deuda a cuotas."`.
  - **`pay_debt_installment`**: parámetro `debtId: string`. Llama a `payInstallment`. Devuelve la deuda actualizada y el id del gasto creado. Descripción: `"Registra el pago de una cuota de una deuda: crea el gasto en finanzas e incrementa las cuotas pagadas."`.
  - ✅ Implementado.

### Fase 4 — Frontend: tipos, servicio y hooks

- [x] Agregar en `frontend/src/types/index.ts`:
  ```ts
  export type DebtStatus = 'activa' | 'pagada';

  export interface Debt {
    id: string;
    description: string;
    productValue: number;
    installmentValue: number;
    totalInstallments: number;
    initialPayment: number | null;
    paidInstallments: number;
    status: DebtStatus;
    remainingValue: number;   // calculado por el backend en la respuesta
    createdAt: string;
    updatedAt: string;
  }

  export interface CreateDebtDto {
    description: string;
    productValue: number;
    installmentValue: number;
    totalInstallments: number;
    initialPayment?: number;
  }

  export type UpdateDebtDto = Partial<CreateDebtDto>;

  export interface PayInstallmentResult {
    debt: Debt;
    expenseId: string;
  }
  ```
- [x] Crear `frontend/src/services/finances/debts.service.ts`:
  - `getDebts(status?: DebtStatus): Promise<Debt[]>`
  - `getDebt(id: string): Promise<Debt>`
  - `createDebt(dto: CreateDebtDto): Promise<Debt>`
  - `updateDebt(id: string, dto: UpdateDebtDto): Promise<Debt>`
  - `deleteDebt(id: string): Promise<void>`
  - `payInstallment(id: string): Promise<PayInstallmentResult>`
- [x] Crear `frontend/src/hooks/finances/useDebts.ts`:
  - `useDebts(status?: DebtStatus)` — query key `['debts', status ?? 'all']`, `staleTime: 1min`.
  - `useDebt(id: string)` — query key `['debts', id]`.
  - `useCreateDebt()` — invalida `['debts']` en `onSuccess`.
  - `useUpdateDebt()` — invalida `['debts']` en `onSuccess`.
  - `useDeleteDebt()` — invalida `['debts']` en `onSuccess`.
  - `usePayInstallment()` — invalida `['debts']` y `['expenses']` en `onSuccess`.

### Fase 5 — Frontend: vista y rutas

- [x] Crear `frontend/src/pages/finances/DebtsView.tsx`:
  - Header con título "Deudas" y botón "Nueva deuda" que abre un modal con formulario.
  - Tabs o selector de filtro: "Todas" / "Activas" / "Pagadas".
  - Lista de deudas en tarjetas o tabla con las columnas/campos:
    - Descripción (prominente).
    - Valor producto (`productValue`) en COP.
    - Valor cuota (`installmentValue`) en COP.
    - Progreso: `paidInstallments / totalInstallments` cuotas + barra de progreso.
    - Valor restante (`remainingValue`) en COP.
    - Estado: badge `activa` (amarillo) o `pagada` (verde).
    - Botón **"Pagar cuota"** — visible solo si `status === 'activa'`. Al hacer clic:
      1. Llama a `usePayInstallment`.
      2. Muestra confirmación inline o toast de éxito.
    - Menú de acciones: editar (abre modal), eliminar (con `ConfirmDialog`).
  - Modal de creación/edición usando `React Hook Form + Zod`:
    - Campos: `description` (texto), `productValue` (número), `installmentValue` (número), `totalInstallments` (entero ≥ 1), `initialPayment` (número, opcional).
  - Estado vacío con `EmptyState` cuando no hay deudas.
- [x] Agregar importación y ruta en `App.tsx`:
  - `import DebtsView from './pages/finances/DebtsView';`
  - `<Route path="finances/debts" element={<DebtsView />} />`
- [x] Agregar entrada "Deudas" en el array `SECTIONS` de `FinancesDashboard.tsx`:
  - `label: 'Deudas'`, `description: 'Seguimiento de deudas y cuotas'`, `path: '/finances/debts'`.
  - Ícono SVG de billete con flecha o cadena (HeroIcons — `BanknotesIcon` o similar).

### Nota sobre `remainingValue`

El backend calcula `remainingValue` en cada respuesta como campo virtual (getter en la entidad TypeORM o mapeado en el servicio antes de retornar) para no almacenarlo en la base de datos. El frontend lo consume directamente sin necesidad de calcularlo.

## Criterios de aceptación

- El usuario puede crear una deuda con todos sus campos requeridos y con cuota inicial opcional.
- La lista de deudas muestra el progreso de cuotas y el valor restante actualizados.
- Al pulsar "Pagar cuota", se registra automáticamente un gasto de tipo `pago_deuda` con el valor de la cuota y la fecha de hoy.
- Tras pagar la última cuota, el estado de la deuda cambia a `pagada` y el botón "Pagar cuota" desaparece.
- El usuario puede filtrar deudas por estado (activas / pagadas).
- El usuario puede editar los datos de una deuda (descripción, valores) sin modificar las cuotas pagadas.
- El usuario puede eliminar una deuda (con confirmación).
- La herramienta MCP `pay_debt_installment` ejecuta la misma lógica que el botón de la UI.
- La herramienta MCP `list_debts` devuelve las deudas con el campo `remainingValue` calculado.

## Pruebas e2e (si aplica)

No aplican pruebas e2e automatizadas para este spec. Los criterios de aceptación se verificarán manualmente.
