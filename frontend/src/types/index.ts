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
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  ON_HOLD: 'on_hold',
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
  scheduledForToday: boolean;
  isTemplate: boolean;
  templateId: string | null;
  recurrenceFrequency: RecurrenceFrequency | null;
  recurrenceDays: WeekDay[] | null;
  recurrenceDayOfMonth: number | null;
  recurrenceEndDate: string | null;
  instanceDate: string | null;
  /** Derivado en el backend (spec-028) — nunca se envía en un DTO. */
  completedAt: string | null;
  /** Derivado en el backend (spec-028) — nunca se envía en un DTO. */
  postponementCount: number;
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
  scheduledForToday?: boolean;
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

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: ExpenseType;
  creditCard: CreditCard | null;
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

export interface CreateExpenseDto {
  description: string;
  amount: number;
  date: string;
  type: ExpenseType;
  creditCardId?: string | null;
}

export type UpdateExpenseDto = Partial<CreateExpenseDto>;

export interface CreateIncomeDto {
  description: string;
  amount: number;
  date: string;
  type: IncomeType;
}

export type UpdateIncomeDto = Partial<CreateIncomeDto>;

export interface BudgetItem {
  id: string;
  description: string;
  plannedAmount: number;
  type: ExpenseType;
  /**
   * Presente cuando el ítem es una cuota generada automáticamente por una
   * deuda (spec-026) — el backend devuelve la relación completa vía
   * `leftJoinAndSelect`, no un `debtId` plano.
   */
  debt?: { id: string } | null;
  installmentNumber?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetTypeSummary {
  type: ExpenseType;
  total: number;
  percentage: number;
}

export interface Budget {
  id: string;
  name: string;
  month: number;
  year: number;
  items: BudgetItem[];
  typeSummary?: BudgetTypeSummary[];
  totalIncome?: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Finances — Budget DTOs ──────────────────────────────────────────────────

export interface CreateBudgetItemDto {
  description: string;
  plannedAmount: number;
  type: ExpenseType;
}

export interface CreateBudgetDto {
  name: string;
  month: number;
  year: number;
  items?: CreateBudgetItemDto[];
}

export interface UpdateBudgetDto {
  name?: string;
  month?: number;
  year?: number;
}

export type UpdateBudgetItemDto = Partial<Pick<BudgetItem, 'description' | 'plannedAmount' | 'type'>>;

export interface DuplicateBudgetDto {
  month: number;
  year: number;
  name?: string;
}

export interface DuplicateBudgetResult {
  budget: Budget;
  itemsCopied: number;
  incomesCopied: number;
  expensesCopied: number;
}

export interface CardTotal {
  creditCardId: string;
  name: string;
  total: number;
}

export interface MonthlySummary {
  year: number;
  month: number;
  budgetTotal: number;
  expensesTotal: number;
  combinedTotal: number;
  budgetId: string | null;
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
