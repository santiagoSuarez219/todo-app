// ─── Enums (as const — compatible con erasableSyntaxOnly) ────────────────────

export const ProjectStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PAUSED: 'paused',
  COMPLETED: 'completed',
} as const;
export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];

export const ActivityStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  ON_HOLD: 'on_hold',
} as const;
export type ActivityStatus = (typeof ActivityStatus)[keyof typeof ActivityStatus];

export const ActivityType = {
  REMINDER: 'reminder',
  TASK: 'task',
} as const;
export type ActivityType = (typeof ActivityType)[keyof typeof ActivityType];

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

export interface RecurrenceConfig {
  isRecurring: boolean;
  recurrenceFrequency?: RecurrenceFrequency;
  recurrenceDays?: WeekDay[];
  recurrenceDayOfMonth?: number;
  recurrenceEndDate?: string | null;
}

// ─── Entities ───────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
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
  type: ActivityType;
  parent: Activity | null;
  subtasks: Activity[];
  scheduledForToday: boolean;
  notionUrl: string | null;
  isTemplate: boolean;
  isRecurring: boolean;
  templateId: string | null;
  recurrenceFrequency: RecurrenceFrequency | null;
  recurrenceDays: WeekDay[] | null;
  recurrenceDayOfMonth: number | null;
  recurrenceEndDate: string | null;
  instanceDate: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface CreateProjectDto {
  name: string;
  status?: ProjectStatus;
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
  type?: ActivityType;
  scheduledForToday?: boolean;
  notionUrl?: string | null;
  isRecurring?: boolean;
  recurrenceFrequency?: RecurrenceFrequency;
  recurrenceDays?: WeekDay[];
  recurrenceDayOfMonth?: number;
  recurrenceEndDate?: string | null;
}

export type UpdateActivityDto = Partial<CreateActivityDto>;

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
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  id: string;
  name: string;
  month: number;
  year: number;
  items: BudgetItem[];
  createdAt: string;
  updatedAt: string;
}

// ─── Finances — Budget DTOs ──────────────────────────────────────────────────

export interface CreateBudgetItemDto {
  description: string;
  plannedAmount: number;
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
