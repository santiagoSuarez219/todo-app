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
  EVENT: 'event',
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

export const Device = {
  PHONE: 'phone',
  COMPUTER: 'computer',
  TABLET: 'tablet',
} as const;
export type Device = (typeof Device)[keyof typeof Device];

export const DurationUnit = {
  HOURS: 'hours',
  DAYS: 'days',
} as const;
export type DurationUnit = (typeof DurationUnit)[keyof typeof DurationUnit];

export const Automatizacion = {
  FULLY_AUTOMATABLE: 'fully_automatable',
  PARTIALLY_AUTOMATABLE: 'partially_automatable',
  NOT_AUTOMATABLE: 'not_automatable',
} as const;
export type Automatizacion = (typeof Automatizacion)[keyof typeof Automatizacion];

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
  actionDate: string | null;
  dueDate: string | null;
  priority: Priority;
  status: ActivityStatus;
  energy: Energy;
  duration: number | null;
  durationUnit: DurationUnit | null;
  device: Device | null;
  type: ActivityType;
  location: string | null;
  parent: Activity | null;
  subtasks: Activity[];
  automatizacion: Automatizacion | null;
  scheduledForToday: boolean;
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
  actionDate?: string | null;
  dueDate?: string | null;
  priority?: Priority;
  status?: ActivityStatus;
  energy?: Energy;
  duration?: number | null;
  durationUnit?: DurationUnit | null;
  device?: Device | null;
  type?: ActivityType;
  location?: string | null;
  automatizacion?: Automatizacion | null;
  scheduledForToday?: boolean;
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
