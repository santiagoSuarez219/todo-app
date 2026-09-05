// ─── Enums (as const — compatible con erasableSyntaxOnly) ────────────────────

export const ProjectStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PAUSED: 'paused',
  COMPLETED: 'completed',
} as const;
export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];

export const ProjectHorizon = {
  NOW: 'now',
  NEXT: 'next',
  LATER: 'later',
  SOMEDAY: 'someday',
} as const;
export type ProjectHorizon = (typeof ProjectHorizon)[keyof typeof ProjectHorizon];

export const ActivityStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  // spec-033: trabajo hecho, pendiente de verificar. Entre IN_PROGRESS y
  // COMPLETED — sin campos asociados.
  TESTING: 'testing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  ON_HOLD: 'on_hold',
  // spec-032: coexiste con ON_HOLD, no lo reemplaza.
  WAITING: 'waiting',
} as const;
export type ActivityStatus = (typeof ActivityStatus)[keyof typeof ActivityStatus];

export const Priority = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;
export type Priority = (typeof Priority)[keyof typeof Priority];

export const Energy = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;
export type Energy = (typeof Energy)[keyof typeof Energy];

export const RecurrenceFrequency = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  BIWEEKLY: 'biweekly',
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
} as const;
export type RecurrenceFrequency = (typeof RecurrenceFrequency)[keyof typeof RecurrenceFrequency];

export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// ─── Entities ───────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  horizon: ProjectHorizon;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  name: string;
  description: string | null;
  project: Project | null;
  dueDate: string | null;
  priority: Priority;
  status: ActivityStatus;
  energy: Energy;
  parent: Activity | null;
  subtasks: Activity[];
  /** spec-031: reemplaza al booleano `scheduledForToday` — caduca sola. */
  scheduledFor: string | null;
  isTemplate: boolean;
  templateId: string | null;
  recurrenceFrequency: RecurrenceFrequency | null;
  recurrenceDays: WeekDay[] | null;
  recurrenceDayOfMonth: number | null;
  recurrenceEndDate: string | null;
  instanceDate: string | null;
  /** spec-030: oculta la actividad de las vistas activas mientras sea futura. */
  deferUntil: string | null;
  /** Derivado en el backend (spec-028) — nunca se envía en un DTO. */
  completedAt: string | null;
  /** Derivado en el backend (spec-028) — nunca se envía en un DTO. */
  postponementCount: number;
  /** spec-032: solo tienen sentido con status === 'waiting'; el backend los
   * limpia a null en cualquier otro estado. */
  waitingFor: string | null;
  waitingSince: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface CreateProjectDto {
  name: string;
  status?: ProjectStatus;
  horizon?: ProjectHorizon;
  startDate: string;
  endDate?: string | null;
}

export type UpdateProjectDto = Partial<CreateProjectDto>;

export interface CreateActivityDto {
  name: string;
  description?: string | null;
  projectId?: string | null;
  parentId?: string | null;
  dueDate?: string | null;
  priority?: Priority;
  status?: ActivityStatus;
  energy?: Energy;
  scheduledFor?: string | null;
  deferUntil?: string | null;
  waitingFor?: string | null;
  waitingSince?: string | null;
  recurrenceFrequency?: RecurrenceFrequency | null;
  recurrenceDays?: WeekDay[];
  recurrenceDayOfMonth?: number;
  recurrenceEndDate?: string | null;
}

export type UpdateActivityDto = Partial<CreateActivityDto>;

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface ActivitySearchParams extends PaginationParams {
  projectId?: string;
}

export interface ScheduleParams {
  year: number;
  month: number;
}

// ─── Finances — Enums ────────────────────────────────────────────────────────

export const ExpenseType = {
  BASICO: 'basico',
  LUJO: 'lujo',
  AHORRO: 'ahorro',
  PAGO_DEUDA: 'pago_deuda',
} as const;
export type ExpenseType = (typeof ExpenseType)[keyof typeof ExpenseType];

export const IncomeType = {
  SUELDO: 'sueldo',
  FREELANCE: 'freelance',
  INTERESES: 'intereses',
  DIVIDENDOS: 'dividendos',
  OTRO: 'otro',
} as const;
export type IncomeType = (typeof IncomeType)[keyof typeof IncomeType];

export const AccountType = {
  CORRIENTE: 'corriente',
  AHORROS: 'ahorros',
  DIGITAL: 'digital',
} as const;
export type AccountType = (typeof AccountType)[keyof typeof AccountType];

export const PurchasePriority = {
  ALTA: 'alta',
  MEDIA: 'media',
  BAJA: 'baja',
} as const;
export type PurchasePriority = (typeof PurchasePriority)[keyof typeof PurchasePriority];

export const PurchaseStore = {
  AMAZON: 'amazon',
  TEMU: 'temu',
  MERCADOLIBRE: 'mercadolibre',
  OTRA: 'otra',
} as const;
export type PurchaseStore = (typeof PurchaseStore)[keyof typeof PurchaseStore];

export const PurchaseStatus = {
  PENDIENTE: 'pendiente',
  COMPRADO: 'comprado',
  DESCARTADO: 'descartado',
} as const;
export type PurchaseStatus = (typeof PurchaseStatus)[keyof typeof PurchaseStatus];

// ─── Finances — Entities ─────────────────────────────────────────────────────

// spec-035: Expense absorbe a BudgetItem — un gasto puede ser solo planeado
// (plannedAmount, sin amount/date), solo ejecutado (amount+date, sin
// plannedAmount) o ambos ("settled"). `executionStatus` es calculado por el
// backend, no se envía en los DTOs de escritura.
export type ExpenseExecutionStatus = 'planned' | 'executed' | 'settled';

export interface Expense {
  id: string;
  description: string;
  amount: number | null;
  date: string | null;
  plannedAmount: number | null;
  type: ExpenseType;
  budget: { id: string; name: string; month: number; year: number } | null;
  creditCard: CreditCard | null;
  /**
   * Presente cuando el gasto es una cuota generada automáticamente por una
   * deuda (spec-026, portado a Expense en spec-035).
   */
  debt?: { id: string } | null;
  installmentNumber?: number | null;
  executionStatus?: ExpenseExecutionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DuplicateExpenseDto {
  month: number;
  year: number;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  bank: string;
  currentBalance: number;
  interestRate: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreditCard {
  id: string;
  name: string;
  bank: string;
  interestRate: number;
  monthlyFee: number;
  totalLimit: number;
  availableLimit: number;
  createdAt: string;
  updatedAt: string;
}

export interface Cdt {
  id: string;
  bank: string;
  investedAmount: number;
  interestRate: number;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Purchase {
  id: string;
  description: string;
  estimatedPrice: number | null;
  priority: PurchasePriority;
  store: PurchaseStore;
  status: PurchaseStatus;
  url: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Income {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: IncomeType;
  createdAt: string;
  updatedAt: string;
}

// ─── Finances — DTOs ─────────────────────────────────────────────────────────

export interface CreateAccountDto {
  name: string;
  type: AccountType;
  bank: string;
  currentBalance: number;
  interestRate?: number | null;
}

export type UpdateAccountDto = Partial<CreateAccountDto>;

export interface CreateCreditCardDto {
  name: string;
  bank: string;
  interestRate: number;
  monthlyFee: number;
  totalLimit: number;
  availableLimit: number;
}

export type UpdateCreditCardDto = Partial<CreateCreditCardDto>;

export interface CreateCdtDto {
  bank: string;
  investedAmount: number;
  interestRate: number;
  startDate: string;
  endDate: string;
}

export type UpdateCdtDto = Partial<CreateCdtDto>;

export interface CreatePurchaseDto {
  description: string;
  estimatedPrice?: number | null;
  priority?: PurchasePriority;
  store?: PurchaseStore;
  status?: PurchaseStatus;
  url?: string | null;
  notes?: string | null;
}

export type UpdatePurchaseDto = Partial<CreatePurchaseDto>;

// spec-035: amount/date dejan de ser obligatorios — un gasto puede nacer
// solo planeado (plannedAmount, sin amount/date). El backend valida que al
// menos uno de los dos esté presente, y que amount/date vayan juntos.
export interface CreateExpenseDto {
  description: string;
  amount?: number;
  date?: string;
  plannedAmount?: number;
  type: ExpenseType;
  budgetId?: string;
  creditCardId?: string | null;
}

export type UpdateExpenseDto = Partial<Omit<CreateExpenseDto, 'budgetId'>> & {
  /** `null` explícito desvincula el gasto de su presupuesto. */
  budgetId?: string | null;
};

export interface CreateIncomeDto {
  description: string;
  amount: number;
  date: string;
  type: IncomeType;
}

export type UpdateIncomeDto = Partial<CreateIncomeDto>;

// spec-035: BudgetItem se elimina — un ítem de presupuesto es ahora un
// Expense con plannedAmount y budgetId. TypeBreakdown reemplaza a
// BudgetTypeSummary: planeado y ejecutado ya no se suman en el mismo
// acumulador (esa suma era la causa del doble conteo pre-spec-035).
export interface TypeBreakdown {
  type: ExpenseType;
  planned: number;
  executed: number;
  variance: number;
  plannedPct: number;
  executedPct: number;
}

export interface Budget {
  id: string;
  name: string;
  month: number;
  year: number;
  expenses: Expense[];
  byType?: TypeBreakdown[];
  totalIncome?: number;
  plannedTotal?: number;
  executedTotal?: number;
  variance?: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Finances — Budget DTOs ──────────────────────────────────────────────────

// spec-035, decisión 11: el presupuesto nace vacío. Los gastos se agregan
// después vía POST /finances/expenses con `budgetId`.
export interface CreateBudgetDto {
  name: string;
  month: number;
  year: number;
}

export interface UpdateBudgetDto {
  name?: string;
  month?: number;
  year?: number;
}

export interface DuplicateBudgetDto {
  month: number;
  year: number;
  name?: string;
}

export interface DuplicateBudgetResult {
  budget: Budget;
  plannedExpensesCopied: number;
  incomesCopied: number;
}

/** spec-035, decisión 12: borrar un presupuesto borra sus gastos en cascada. */
export interface RemoveBudgetResult {
  executedExpensesRemoved: number;
  executedTotalRemoved: number;
}

export interface CardTotal {
  creditCardId: string;
  name: string;
  planned: number;
  executed: number;
}

export interface MonthlySummary {
  year: number;
  month: number;
  budgetId: string | null;
  totalIncome: number;
  plannedTotal: number;
  executedTotal: number;
  variance: number;
  pendingPlannedTotal: number;
  unplannedTotal: number;
  byType: TypeBreakdown[];
  cardTotals: CardTotal[];
}

// ─── Finances — Debts ────────────────────────────────────────────────────────

export const DebtStatus = {
  ACTIVE: 'activa',
  PAID: 'pagada',
} as const;
export type DebtStatus = (typeof DebtStatus)[keyof typeof DebtStatus];

export interface NextInstallment {
  number: number;
  month: number;
  year: number;
}

export interface Debt {
  id: string;
  description: string;
  productValue: number;
  installmentValue: number;
  totalInstallments: number;
  initialPayment: number | null;
  /** Derivado del calendario de cuotas por el backend (spec-026) — no se marca a mano. */
  paidInstallments: number;
  status: DebtStatus;
  remainingValue: number;
  startMonth: number;
  startYear: number;
  paidOffAt: string | null;
  nextInstallment: NextInstallment | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDebtDto {
  description: string;
  productValue: number;
  installmentValue: number;
  totalInstallments: number;
  initialPayment?: number;
  startMonth: number;
  startYear: number;
}

export type UpdateDebtDto = Partial<CreateDebtDto>;

export interface PayOffDebtResult {
  debt: Debt;
  expenseId: string;
  itemsRemoved: number;
}

export interface SyncBudgetItemsResult {
  itemsCreated: number;
  budgetsCreated: number;
}

// ─── Pagination ──────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

// ─── Auth (spec-021) ──────────────────────────────────────────────────────

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthUser {
  email: string;
}
