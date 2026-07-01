# spec-018 — [IN PROGRESS] Asociar tarjeta a gastos y desglose por tarjeta en el resumen de presupuesto

## Contexto

El usuario quiere poder identificar qué gastos (`Expense`) fueron pagados con tarjeta de crédito, para diferenciarlos de los pagos en efectivo o transferencia, y luego ver en el resumen mensual del presupuesto el total gastado por cada tarjeta.

El módulo de finanzas ya tiene una entidad `CreditCard` con CRUD completo (`backend/src/finances/entities/credit-card.entity.ts`, `credit-cards.service.ts`, `credit-cards.controller.ts`, y en frontend `CreditCardsView.tsx` / `useCreditCards.ts` / `credit-cards.service.ts`), gestionada desde `/finances/credit-cards`. Esta entidad ya resuelve el problema de "varias tarjetas nombradas" (ej. "Visa Bancolombia", "Mastercard Davivienda") — el usuario ya puede crear, editar y eliminar sus tarjetas ahí. **No hace falta una entidad nueva**: este spec solo agrega una relación opcional `Expense → CreditCard` y expone el desglose de gasto por tarjeta en el resumen mensual.

Este patrón (agregar una relación opcional a `Expense` y proyectarla en el resumen) es del mismo tamaño que specs anteriores del módulo de finanzas (ver spec-015, que agregó `monthly-summary`, y spec-016, que agregó la entidad `Debt` con su propio flujo). Aquí el alcance es más chico porque la entidad `CreditCard` ya existe.

## Alcance

**Incluye:**
- Campo opcional `creditCard` (relación `ManyToOne` a `CreditCard`, nullable) en la entidad `Expense`.
- El formulario de creación/edición de gasto (`ExpenseForm`) permite seleccionar opcionalmente una tarjeta de las ya registradas en `/finances/credit-cards`.
- La tarjeta del gasto se muestra en `ExpenseCard` cuando existe.
- Nuevo desglose "Total por tarjeta" dentro del resumen de presupuesto (`BudgetDetailView`), mostrando, para el mes correspondiente, la suma de gastos con tarjeta agrupada por cada tarjeta usada. Solo se listan tarjetas con al menos un gasto en el mes.
- Extensión del endpoint `GET /finances/budgets/monthly-summary` (o de la respuesta de `GET /finances/budgets/:id`, ver Fase 2 para la decisión) para incluir este desglose.
- Filtro opcional `creditCardId` en `GET /finances/expenses` para poder listar/filtrar gastos por tarjeta si se necesita en el futuro (paridad con el filtro `year`/`month` ya existente).

**No incluye:**
- Gestión de cupo/disponible de la tarjeta a partir de los gastos (la tarjeta ya tiene `availableLimit` propio, pero este spec no lo descuenta automáticamente al crear un gasto — eso es una feature aparte, fuera de este scope).
- Pagos en cuotas o financiación de un gasto con tarjeta (eso ya lo cubre el módulo de `Debt`/`Purchase` con otro flujo).
- Eliminar o migrar el módulo `CreditCard` existente; se reutiliza tal cual.
- Vista o filtro dedicado de "gastos por tarjeta" fuera del resumen de presupuesto (ej. no se pide una página `CreditCardDetailView` con su propio listado de gastos — si se quiere después, es un spec aparte).
- Herramientas MCP nuevas (no se pide integración con el asistente de IA en este spec).

## Impacto en el sistema

- **Backend:**
  - `backend/src/finances/entities/expense.entity.ts` — nueva relación `ManyToOne` opcional a `CreditCard`.
  - `backend/src/finances/dto/create-expense.dto.ts` / `update-expense.dto.ts` — nuevo campo opcional `creditCardId`.
  - `backend/src/finances/dto/expenses-query.dto.ts` — nuevo query param opcional `creditCardId`.
  - `backend/src/finances/expenses.service.ts` — resolver la relación al crear/actualizar, incluir `creditCard` en `findAll`/`findOne`, filtrar por `creditCardId`.
  - `backend/src/finances/budgets.service.ts` — nuevo método/lógica para calcular el desglose por tarjeta y agregarlo a `MonthlySummary`.
  - `backend/src/finances/budgets.controller.ts` — sin cambios de rutas (el campo nuevo viaja en la respuesta ya existente de `monthly-summary`).
  - `backend/src/finances/finances.module.ts` — inyectar `CreditCard` repository en `ExpensesService`/`BudgetsService` si no está ya disponible (ya está registrado en `TypeOrmModule.forFeature`, pero hay que inyectarlo en los servicios que lo necesiten).
  - Nueva migración TypeORM para la columna `creditCardId` (FK nullable) en `expenses`.

- **Frontend:**
  - `frontend/src/types/index.ts` — agregar `creditCard: CreditCard | null` a `Expense`, `creditCardId?: string | null` a `CreateExpenseDto`/`UpdateExpenseDto`, y `cardTotals: { creditCardId, name, total }[]` (o similar) a `MonthlySummary`.
  - `frontend/src/components/finances/ExpenseForm.tsx` — nuevo `<select>` opcional de tarjeta, poblado con `useCreditCards()`.
  - `frontend/src/components/finances/ExpenseCard.tsx` — mostrar badge/etiqueta con el nombre de la tarjeta cuando `expense.creditCard` no es null.
  - `frontend/src/services/finances/expenses.service.ts` — pasar `creditCardId` en el DTO de creación/edición (ya pasa el DTO completo, no requiere cambios de firma).
  - `frontend/src/pages/finances/BudgetDetailView.tsx` — nueva sección "Total por tarjeta" debajo o junto a "Gastos del mes", usando el campo nuevo de `monthlySummary`.
  - `frontend/src/hooks/finances/useExpenses.ts` y `useBudgets.ts` — sin cambios de firma si el desglose viaja dentro de `MonthlySummary` (opción recomendada, ver Fase 2).

## Fases de implementación

### Fase 1 — Entidad, migración y DTOs (backend)

- [ ] Editar `backend/src/finances/entities/expense.entity.ts`: agregar
  ```ts
  @ManyToOne(() => CreditCard, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'creditCardId' })
  creditCard: CreditCard | null;
  ```
  con el import de `CreditCard`, `ManyToOne` y `JoinColumn` desde `typeorm`.
- [ ] Editar `backend/src/finances/dto/create-expense.dto.ts`: agregar campo opcional `creditCardId?: string` con `@IsOptional()` + `@IsUUID()`.
- [ ] Confirmar que `backend/src/finances/dto/update-expense.dto.ts` (que ya es `PartialType(CreateExpenseDto)`) hereda el campo sin cambios adicionales.
- [ ] Editar `backend/src/finances/dto/expenses-query.dto.ts`: agregar filtro opcional `creditCardId?: string` con `@IsOptional()` + `@IsUUID()`.
- [ ] Generar migración TypeORM (`npx typeorm migration:generate src/migrations/AddCreditCardToExpenses -d src/data-source.ts`) para la columna `creditCardId` (uuid, nullable) y su FK hacia `credit_cards` con `ON DELETE SET NULL`. Ejecutarla en local.

### Fase 2 — Servicios y controlador (backend)

- [ ] Editar `backend/src/finances/expenses.service.ts`:
  - Inyectar `Repository<CreditCard>` (o resolver vía `relations`) para poder cargar la tarjeta.
  - `create`: si viene `creditCardId`, resolver la `CreditCard` (lanzar `NotFoundException` si no existe) y asignarla a `expense.creditCard` antes de guardar; usar `creditCardId: null` para "sin tarjeta".
  - `findAll`: incluir `leftJoinAndSelect('expense.creditCard', 'creditCard')` en el query builder existente; si llega `creditCardId` en el query, agregar `andWhere('expense.creditCardId = :creditCardId', ...)`.
  - `findOne`: usar `relations: ['creditCard']` o el join equivalente.
  - `update`: mismo manejo de resolución de `creditCardId` que en `create` (incluyendo el caso de quitar la tarjeta con `creditCardId: null`).
- [ ] Editar `backend/src/finances/budgets.service.ts`:
  - Definir el nuevo tipo `CardTotal { creditCardId: string; name: string; total: number }` y agregarlo a la interfaz `MonthlySummary` como `cardTotals: CardTotal[]`.
  - En `getMonthlySummary(year, month)`: además del query de `expensesTotal`, agregar un query que agrupe los gastos del mes que tienen `creditCardId IS NOT NULL` por tarjeta (`GROUP BY creditCardId, creditCard.name`, `SUM(expense.amount)`), ordenado por total descendente. Poblar `cardTotals` con el resultado (lista vacía si no hay gastos con tarjeta ese mes).
- [ ] Confirmar que `backend/src/finances/finances.module.ts` no requiere cambios (todas las entidades ya están en `TypeOrmModule.forFeature`); solo verificar que `ExpensesService` reciba el repositorio de `CreditCard` que necesite vía constructor.

### Fase 3 — Formulario y tarjeta de gasto (frontend)

- [ ] Editar `frontend/src/types/index.ts`:
  - `Expense`: agregar `creditCard: CreditCard | null`.
  - `CreateExpenseDto` / no existe explícito hoy (se infiere de Zod) — agregar `creditCardId?: string | null` al tipo `CreateExpenseDto` usado por el service (revisar si ya existe una interfaz explícita o si se infiere del schema de `ExpenseForm`; si no existe, crearla junto a `UpdateExpenseDto`).
  - `MonthlySummary`: agregar `cardTotals: { creditCardId: string; name: string; total: number }[]`.
- [ ] Editar `frontend/src/components/finances/ExpenseForm.tsx`:
  - Agregar `creditCardId: z.string().uuid().optional().or(z.literal(''))` (o similar) al schema de Zod.
  - Agregar `useCreditCards()` para poblar un `<select>` opcional "Tarjeta (opcional)" con las tarjetas existentes, con opción "Ninguna" por defecto.
  - Al enviar, mapear `''` → `undefined`/`null` para `creditCardId`.
  - `defaultValues`: inicializar con `initial?.creditCard?.id ?? ''`.
- [ ] Editar `frontend/src/components/finances/ExpenseCard.tsx`: si `expense.creditCard` no es null, mostrar un badge adicional con el nombre de la tarjeta (mismo patrón visual que el badge de tipo, con color neutro, ej. `bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300` según la tabla de badges de `frontend/DESIGN.md`).

### Fase 4 — Desglose por tarjeta en el resumen de presupuesto (frontend)

- [ ] Editar `frontend/src/pages/finances/BudgetDetailView.tsx`: agregar una nueva sección "Total por tarjeta" (mismo patrón visual que "Gastos del mes": bloque `bg-white dark:bg-gray-800 rounded-lg border` con filas `divide-y`), que:
  - Solo se muestra si `monthlySummary.cardTotals.length > 0`.
  - Lista cada tarjeta con su nombre y el total formateado con `COP.format(...)`.
  - No requiere nuevo hook: reutiliza `useMonthlyExpenseSummary(budget.year, budget.month)` ya existente en `frontend/src/hooks/finances/useBudgets.ts`, que ahora traerá `cardTotals` dentro de la misma respuesta.

## Criterios de aceptación

- Al crear o editar un gasto, el usuario puede opcionalmente seleccionar una tarjeta de las que ya tiene registradas en `/finances/credit-cards`.
- Un gasto sin tarjeta seleccionada se guarda con `creditCardId = null` y sigue funcionando exactamente igual que hoy.
- En la lista de gastos, un gasto con tarjeta asociada muestra visualmente el nombre de la tarjeta.
- En `BudgetDetailView`, para un mes con gastos pagados con tarjeta, aparece la sección "Total por tarjeta" con el total correcto por cada tarjeta usada ese mes (solo gastos `type` cualquiera, agrupados por `creditCardId`, sin importar el `ExpenseType`).
- Si un mes no tiene ningún gasto con tarjeta, la sección "Total por tarjeta" no se muestra (o muestra un estado vacío, a definir en Fase 4).
- Eliminar una tarjeta desde `/finances/credit-cards` no elimina los gastos asociados; estos quedan con `creditCard = null` (por el `onDelete: SET NULL` de la FK).

## Pruebas e2e (si aplica)

A definir por `@tester` una vez completadas las fases de implementación, cubriendo al menos:
- Crear gasto con tarjeta y verificar que `GET /finances/expenses/:id` devuelve `creditCard` poblado.
- Crear gasto sin tarjeta y verificar que `creditCard` es `null`.
- `GET /finances/budgets/monthly-summary?year=&month=` devuelve `cardTotals` correcto con dos gastos en la misma tarjeta y uno en otra.
- Eliminar una tarjeta con gastos asociados y verificar que los gastos no se eliminan y quedan con `creditCard = null`.

## Decisiones confirmadas por el usuario

1. Se incluye el filtro `creditCardId` en `GET /finances/expenses` (paridad con `year`/`month`).
2. El desglose por tarjeta vive dentro de `MonthlySummary` (`GET /finances/budgets/monthly-summary`).
3. El desglose incluye gastos de cualquier `ExpenseType`, sin restricción.
4. Si el mes no tiene gastos con tarjeta, la sección "Total por tarjeta" se oculta (mismo patrón que "Resumen por tipo").
