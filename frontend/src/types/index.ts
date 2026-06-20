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
