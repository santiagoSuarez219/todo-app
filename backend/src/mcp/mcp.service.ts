import { Injectable } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ActivitiesService } from '../activities/activities.service';
import { ActivityStatus } from '../common/enums/activity-status.enum';
import { ActivityType } from '../common/enums/activity-type.enum';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Priority } from '../common/enums/priority.enum';
import { ProjectsService } from '../projects/projects.service';
import { ProjectStatus } from '../common/enums/project-status.enum';
import { ExpensesService } from '../finances/expenses.service';
import { IncomesService } from '../finances/incomes.service';
import { PurchasesService } from '../finances/purchases.service';
import { AccountsService } from '../finances/accounts.service';
import { CreditCardsService } from '../finances/credit-cards.service';
import { CdtsService } from '../finances/cdts.service';
import { BudgetsService } from '../finances/budgets.service';
import { PurchaseStatus } from '../common/enums/purchase-status.enum';

// ─── Shared schemas ──────────────────────────────────────────────────────────

const paginationSchema = {
  page: z.number().int().positive().optional().describe('Page number (default: 1)'),
  limit: z
    .number()
    .int()
    .positive()
    .max(100)
    .optional()
    .describe('Items per page, max 100 (default: 20)'),
};

// ─── Response helpers ────────────────────────────────────────────────────────

type ToolResult = { content: [{ type: 'text'; text: string }] };

function ok(data: unknown): ToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

function err(error: unknown): ToolResult {
  const message = error instanceof Error ? error.message : String(error);
  return { content: [{ type: 'text', text: `Error: ${message}` }] };
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class McpService {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly activitiesService: ActivitiesService,
    private readonly expensesService: ExpensesService,
    private readonly incomesService: IncomesService,
    private readonly purchasesService: PurchasesService,
    private readonly accountsService: AccountsService,
    private readonly creditCardsService: CreditCardsService,
    private readonly cdtsService: CdtsService,
    private readonly budgetsService: BudgetsService,
  ) {}

  /**
   * Creates and returns a fully configured McpServer instance.
   * A new instance is created per request (stateless HTTP transport).
   */
  createServer(): McpServer {
    const server = new McpServer({ name: 'todo-api', version: '1.0.0' });
    this.registerProjectTools(server);
    this.registerActivityTools(server);
    this.registerExpenseTools(server);
    this.registerIncomeTools(server);
    this.registerPurchaseTools(server);
    this.registerAccountTools(server);
    this.registerCreditCardTools(server);
    this.registerCdtTools(server);
    this.registerBudgetTools(server);
    return server;
  }

  // ─── Projects ─────────────────────────────────────────────────────────────

  private registerProjectTools(server: McpServer): void {
    server.tool(
      'list_projects',
      'List all projects, optionally filtered by status',
      {
        status: z
          .enum(['active', 'inactive', 'paused', 'completed'])
          .optional()
          .describe('Filter by project status'),
      },
      async ({ status }) => {
        try {
          const projects = await this.projectsService.findAll(status as ProjectStatus);
          return ok(projects);
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'get_project',
      'Get a single project by its UUID',
      {
        id: z.string().uuid().describe('Project UUID'),
      },
      async ({ id }) => {
        try {
          return ok(await this.projectsService.findOne(id));
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'create_project',
      'Create a new project',
      {
        name: z.string().min(1).max(255).describe('Project name'),
        status: z
          .enum(['active', 'inactive', 'paused', 'completed'])
          .optional()
          .describe('Initial status (default: active)'),
        startDate: z.string().describe('Start date in ISO 8601 format (e.g. 2026-04-13)'),
        endDate: z
          .string()
          .optional()
          .describe('End date in ISO 8601 format (optional)'),
      },
      async (dto) => {
        try {
          return ok(await this.projectsService.create(dto as any));
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'update_project',
      'Update an existing project',
      {
        id: z.string().uuid().describe('Project UUID'),
        name: z.string().min(1).max(255).optional().describe('New project name'),
        status: z
          .enum(['active', 'inactive', 'paused', 'completed'])
          .optional()
          .describe('New status'),
        startDate: z.string().optional().describe('New start date (ISO 8601)'),
        endDate: z.string().nullable().optional().describe('New end date (ISO 8601), null to clear'),
      },
      async ({ id, ...dto }) => {
        try {
          return ok(await this.projectsService.update(id, dto as any));
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'delete_project',
      'Delete a project by its UUID',
      {
        id: z.string().uuid().describe('Project UUID'),
      },
      async ({ id }) => {
        try {
          await this.projectsService.remove(id);
          return ok({ message: `Project ${id} deleted successfully` });
        } catch (e) {
          return err(e);
        }
      },
    );
  }

  // ─── Activities ───────────────────────────────────────────────────────────

  private registerActivityTools(server: McpServer): void {
    // ── CRUD ──────────────────────────────────────────────────────────────────

    server.tool(
      'list_activities',
      'List all activities with optional pagination',
      paginationSchema,
      async (pagination) => {
        try {
          return ok(await this.activitiesService.findAll(pagination as PaginationDto));
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'get_activity',
      'Get a single activity by UUID, including project, parent and subtasks',
      {
        id: z.string().uuid().describe('Activity UUID'),
      },
      async ({ id }) => {
        try {
          return ok(await this.activitiesService.findOne(id));
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'create_activity',
      'Create a new activity or subtask. Types: task (with deadline) or reminder (with date+time)',
      {
        name: z.string().min(1).max(255).describe('Activity name'),
        projectId: z
          .string()
          .uuid()
          .optional()
          .describe('UUID of the associated project'),
        dueDate: z
          .string()
          .optional()
          .describe(
            'For task: deadline date (ISO 8601, e.g. 2026-04-13). For reminder: exact date+time (e.g. 2026-04-13T09:00:00Z)',
          ),
        priority: z
          .enum(['high', 'medium', 'low'])
          .optional()
          .describe('Priority level (default: medium)'),
        status: z
          .enum(['pending', 'in_progress', 'completed', 'cancelled', 'on_hold'])
          .optional()
          .describe('Initial status (default: pending)'),
        energy: z
          .enum(['high', 'medium', 'low'])
          .optional()
          .describe('Energy level required (default: medium)'),
        type: z
          .enum(['reminder', 'task'])
          .optional()
          .describe('Activity type (default: task)'),
        parentId: z
          .string()
          .uuid()
          .optional()
          .describe('UUID of the parent activity (creates a subtask)'),
        scheduledForToday: z
          .boolean()
          .optional()
          .describe('Schedule this activity to appear in the Today view'),
        notionUrl: z
          .string()
          .url()
          .optional()
          .describe('URL of an associated Notion page'),
        description: z.string().optional(),
      },
      async (dto) => {
        try {
          return ok(await this.activitiesService.create(dto as any));
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'update_activity',
      'Update an existing activity',
      {
        id: z.string().uuid().describe('Activity UUID'),
        name: z.string().min(1).max(255).optional(),
        projectId: z.string().uuid().nullable().optional().describe('Set null to detach from project'),
        dueDate: z.string().nullable().optional(),
        priority: z.enum(['high', 'medium', 'low']).optional(),
        status: z.enum(['pending', 'in_progress', 'completed', 'cancelled', 'on_hold']).optional(),
        energy: z.enum(['high', 'medium', 'low']).optional(),
        type: z.enum(['reminder', 'task']).optional(),
        parentId: z.string().uuid().nullable().optional().describe('Set null to remove from parent'),
        scheduledForToday: z
          .boolean()
          .optional()
          .describe('Set or unset scheduling for Today view'),
        notionUrl: z
          .string()
          .url()
          .nullable()
          .optional()
          .describe('URL of an associated Notion page, null to clear'),
        isRecurring: z.boolean().optional().describe('Enable or disable recurrence'),
        recurrenceFrequency: z
          .enum(['daily', 'weekly', 'biweekly', 'monthly', 'yearly'])
          .optional(),
        recurrenceDays: z
          .array(z.number().int().min(0).max(6))
          .optional()
          .describe('Days of week (0=Sun … 6=Sat)'),
        recurrenceDayOfMonth: z.number().int().min(1).max(31).optional(),
        recurrenceEndDate: z.string().nullable().optional(),
        description: z.string().optional(),
      },
      async ({ id, ...dto }) => {
        try {
          return ok(await this.activitiesService.update(id, dto as any));
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'delete_activity',
      'Delete an activity by its UUID',
      {
        id: z.string().uuid().describe('Activity UUID'),
      },
      async ({ id }) => {
        try {
          await this.activitiesService.remove(id);
          return ok({ message: `Activity ${id} deleted successfully` });
        } catch (e) {
          return err(e);
        }
      },
    );

    // ── Specialized queries ───────────────────────────────────────────────────

    server.tool(
      'get_today_activities',
      'Get activities scheduled for today (by dueDate or scheduledForToday flag)',
      paginationSchema,
      async (pagination) => {
        try {
          return ok(await this.activitiesService.findToday(pagination as PaginationDto));
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'get_tomorrow_activities',
      'Get activities scheduled for tomorrow (by dueDate)',
      paginationSchema,
      async (pagination) => {
        try {
          return ok(await this.activitiesService.findTomorrow(pagination as PaginationDto));
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'get_this_week_activities',
      'Get activities for the current week (Monday to Sunday, filtered by dueDate)',
      paginationSchema,
      async (pagination) => {
        try {
          return ok(await this.activitiesService.findThisWeek(pagination as PaginationDto));
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'get_overdue_activities',
      'Get overdue activities (dueDate is in the past and status is not completed)',
      paginationSchema,
      async (pagination) => {
        try {
          return ok(await this.activitiesService.findOverdue(pagination as PaginationDto));
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'get_activities_without_project',
      'Get all activities that are not associated with any project',
      paginationSchema,
      async (pagination) => {
        try {
          return ok(
            await this.activitiesService.findWithoutProject(pagination as PaginationDto),
          );
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'get_activities_by_project',
      'Get all activities belonging to a specific project',
      {
        projectId: z.string().uuid().describe('Project UUID'),
        ...paginationSchema,
      },
      async ({ projectId, ...pagination }) => {
        try {
          return ok(
            await this.activitiesService.findByProject(projectId, pagination as PaginationDto),
          );
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'get_activities_by_type',
      'Get activities filtered by type (task or reminder)',
      {
        type: z.enum(['reminder', 'task']).describe('Activity type'),
        ...paginationSchema,
      },
      async ({ type, ...pagination }) => {
        try {
          return ok(
            await this.activitiesService.findByType(type as ActivityType, pagination as PaginationDto),
          );
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'get_activities_by_priority',
      'Get activities filtered by priority level (high, medium or low)',
      {
        priority: z.enum(['high', 'medium', 'low']).describe('Priority level'),
        ...paginationSchema,
      },
      async ({ priority, ...pagination }) => {
        try {
          return ok(
            await this.activitiesService.findByPriority(
              priority as Priority,
              pagination as PaginationDto,
            ),
          );
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'get_activities_by_status',
      'Get activities filtered by status',
      {
        status: z
          .enum(['pending', 'in_progress', 'completed', 'cancelled', 'on_hold'])
          .describe('Activity status'),
        ...paginationSchema,
      },
      async ({ status, ...pagination }) => {
        try {
          return ok(
            await this.activitiesService.findByStatus(
              status as ActivityStatus,
              pagination as PaginationDto,
            ),
          );
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'search_activities',
      'Search activities by name, description or project name (case-insensitive)',
      {
        query: z.string().min(1).describe('Search term'),
        ...paginationSchema,
      },
      async ({ query, ...pagination }) => {
        try {
          return ok(
            await this.activitiesService.search(query, pagination as PaginationDto),
          );
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'get_activity_subtasks',
      'Get all subtasks of a given activity',
      {
        id: z.string().uuid().describe('Parent activity UUID'),
        ...paginationSchema,
      },
      async ({ id, ...pagination }) => {
        try {
          return ok(
            await this.activitiesService.findSubtasks(id, pagination as PaginationDto),
          );
        } catch (e) {
          return err(e);
        }
      },
    );

    // ── Recurrence tools ───────────────────────────────────────────────────────

    server.tool(
      'create_recurring_activity',
      'Create a recurring activity template that generates instances automatically (daily, weekly, biweekly, monthly or yearly)',
      {
        name: z.string().min(1).max(255).describe('Activity name'),
        type: z
          .enum(['reminder', 'task'])
          .optional()
          .describe('Activity type (default: task)'),
        recurrenceFrequency: z
          .enum(['daily', 'weekly', 'biweekly', 'monthly', 'yearly'])
          .describe('How often the activity repeats'),
        recurrenceDays: z
          .array(z.number().int().min(0).max(6))
          .optional()
          .describe('Days of week (0=Sun, 1=Mon … 6=Sat). Required for weekly/biweekly.'),
        recurrenceDayOfMonth: z
          .number()
          .int()
          .min(1)
          .max(31)
          .optional()
          .describe('Day of month (1-31). Required for monthly frequency.'),
        recurrenceEndDate: z
          .string()
          .optional()
          .describe('ISO 8601 date until which instances are generated (null = indefinite)'),
        projectId: z.string().uuid().optional().describe('UUID of the associated project'),
        dueDate: z
          .string()
          .optional()
          .describe('Reference date/time for biweekly/yearly cycle calculations (ISO 8601)'),
        priority: z.enum(['high', 'medium', 'low']).optional(),
        energy: z.enum(['high', 'medium', 'low']).optional(),
        description: z.string().optional(),
        notionUrl: z.string().url().optional(),
      },
      async (dto) => {
        try {
          return ok(
            await this.activitiesService.create({ ...dto, isRecurring: true } as any),
          );
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'get_activity_instances',
      'Get all generated instances of a recurring activity template',
      {
        templateId: z.string().uuid().describe('UUID of the recurring template activity'),
      },
      async ({ templateId }) => {
        try {
          return ok(await this.activitiesService.getInstancesByTemplate(templateId));
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'cancel_future_instances',
      'Cancel all future pending instances of a recurring activity template',
      {
        templateId: z.string().uuid().describe('UUID of the recurring template activity'),
      },
      async ({ templateId }) => {
        try {
          await this.activitiesService.cancelFutureInstances(templateId);
          return ok({ message: `Future instances of template ${templateId} cancelled` });
        } catch (e) {
          return err(e);
        }
      },
    );
  }

  // ─── Expenses ─────────────────────────────────────────────────────────────

  private registerExpenseTools(server: McpServer): void {
    server.tool(
      'list_expenses',
      'List all expenses with optional pagination',
      paginationSchema,
      async (pagination) => {
        try {
          return ok(await this.expensesService.findAll(pagination as PaginationDto));
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'get_expense',
      'Get a single expense by its UUID',
      { id: z.string().uuid().describe('Expense UUID') },
      async ({ id }) => {
        try {
          return ok(await this.expensesService.findOne(id));
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'create_expense',
      'Create a new expense record',
      {
        description: z.string().min(1).max(255).describe('Expense description'),
        amount: z.number().positive().describe('Amount in COP'),
        date: z.string().describe('Date in ISO 8601 format (YYYY-MM-DD)'),
        type: z
          .enum(['basico', 'lujo', 'ahorro', 'pago_deuda'])
          .describe('Expense type: basico, lujo, ahorro or pago_deuda'),
      },
      async (dto) => {
        try {
          return ok(await this.expensesService.create(dto as any));
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'update_expense',
      'Update an existing expense',
      {
        id: z.string().uuid().describe('Expense UUID'),
        description: z.string().min(1).max(255).optional(),
        amount: z.number().positive().optional(),
        date: z.string().optional(),
        type: z.enum(['basico', 'lujo', 'ahorro', 'pago_deuda']).optional(),
      },
      async ({ id, ...dto }) => {
        try {
          return ok(await this.expensesService.update(id, dto as any));
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'delete_expense',
      'Delete an expense by its UUID',
      { id: z.string().uuid().describe('Expense UUID') },
      async ({ id }) => {
        try {
          await this.expensesService.remove(id);
          return ok({ message: `Expense ${id} deleted successfully` });
        } catch (e) {
          return err(e);
        }
      },
    );
  }

  // ─── Incomes ──────────────────────────────────────────────────────────────

  private registerIncomeTools(server: McpServer): void {
    server.tool(
      'list_incomes',
      'List all income records with optional pagination',
      paginationSchema,
      async (pagination) => {
        try {
          return ok(await this.incomesService.findAll(pagination as PaginationDto));
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'get_income',
      'Get a single income record by its UUID',
      { id: z.string().uuid().describe('Income UUID') },
      async ({ id }) => {
        try {
          return ok(await this.incomesService.findOne(id));
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'create_income',
      'Create a new income record',
      {
        description: z.string().min(1).max(255).describe('Income description'),
        amount: z.number().positive().describe('Amount in COP'),
        date: z.string().describe('Date in ISO 8601 format (YYYY-MM-DD)'),
        type: z
          .enum(['sueldo', 'freelance', 'intereses', 'dividendos', 'otro'])
          .describe('Income type: sueldo, freelance, intereses, dividendos or otro'),
      },
      async (dto) => {
        try {
          return ok(await this.incomesService.create(dto as any));
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'update_income',
      'Update an existing income record',
      {
        id: z.string().uuid().describe('Income UUID'),
        description: z.string().min(1).max(255).optional(),
        amount: z.number().positive().optional(),
        date: z.string().optional(),
        type: z.enum(['sueldo', 'freelance', 'intereses', 'dividendos', 'otro']).optional(),
      },
      async ({ id, ...dto }) => {
        try {
          return ok(await this.incomesService.update(id, dto as any));
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'delete_income',
      'Delete an income record by its UUID',
      { id: z.string().uuid().describe('Income UUID') },
      async ({ id }) => {
        try {
          await this.incomesService.remove(id);
          return ok({ message: `Income ${id} deleted successfully` });
        } catch (e) {
          return err(e);
        }
      },
    );
  }

  // ─── Purchases ────────────────────────────────────────────────────────────

  private registerPurchaseTools(server: McpServer): void {
    server.tool(
      'list_purchases',
      'List wishlist purchases, optionally filtered by status',
      {
        status: z
          .enum(['pendiente', 'comprado', 'descartado'])
          .optional()
          .describe('Filter by purchase status'),
        ...paginationSchema,
      },
      async ({ status, ...pagination }) => {
        try {
          return ok(
            await this.purchasesService.findAll(
              pagination as PaginationDto,
              status as PurchaseStatus,
            ),
          );
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'get_purchase',
      'Get a single wishlist purchase by its UUID',
      { id: z.string().uuid().describe('Purchase UUID') },
      async ({ id }) => {
        try {
          return ok(await this.purchasesService.findOne(id));
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'create_purchase',
      'Add an item to the wishlist',
      {
        description: z.string().min(1).max(255).describe('Item description'),
        estimatedPrice: z.number().positive().optional().describe('Estimated price in COP'),
        priority: z
          .enum(['alta', 'media', 'baja'])
          .optional()
          .describe('Priority (default: media)'),
        store: z
          .enum(['amazon', 'temu', 'mercadolibre', 'otra'])
          .optional()
          .describe('Store (default: otra)'),
        status: z
          .enum(['pendiente', 'comprado', 'descartado'])
          .optional()
          .describe('Status (default: pendiente)'),
        url: z.string().url().optional().describe('Product URL'),
        notes: z.string().optional().describe('Additional notes'),
      },
      async (dto) => {
        try {
          return ok(await this.purchasesService.create(dto as any));
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'update_purchase',
      'Update a wishlist purchase',
      {
        id: z.string().uuid().describe('Purchase UUID'),
        description: z.string().min(1).max(255).optional(),
        estimatedPrice: z.number().positive().nullable().optional(),
        priority: z.enum(['alta', 'media', 'baja']).optional(),
        store: z.enum(['amazon', 'temu', 'mercadolibre', 'otra']).optional(),
        status: z.enum(['pendiente', 'comprado', 'descartado']).optional(),
        url: z.string().url().nullable().optional(),
        notes: z.string().nullable().optional(),
      },
      async ({ id, ...dto }) => {
        try {
          return ok(await this.purchasesService.update(id, dto as any));
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'delete_purchase',
      'Delete a wishlist purchase by its UUID',
      { id: z.string().uuid().describe('Purchase UUID') },
      async ({ id }) => {
        try {
          await this.purchasesService.remove(id);
          return ok({ message: `Purchase ${id} deleted successfully` });
        } catch (e) {
          return err(e);
        }
      },
    );
  }

  // ─── Accounts ─────────────────────────────────────────────────────────────

  private registerAccountTools(server: McpServer): void {
    server.tool(
      'list_accounts',
      'List all bank/digital accounts with optional pagination',
      paginationSchema,
      async (pagination) => {
        try {
          return ok(await this.accountsService.findAll(pagination as PaginationDto));
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'get_account',
      'Get a single account by its UUID',
      { id: z.string().uuid().describe('Account UUID') },
      async ({ id }) => {
        try {
          return ok(await this.accountsService.findOne(id));
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'create_account',
      'Create a new bank or digital account',
      {
        name: z.string().min(1).max(255).describe('Account name'),
        type: z
          .enum(['corriente', 'ahorros', 'digital'])
          .describe('Account type: corriente, ahorros or digital'),
        bank: z.string().min(1).max(255).describe('Bank or institution name'),
        currentBalance: z.number().describe('Current balance in COP'),
        interestRate: z
          .number()
          .min(0)
          .max(1)
          .optional()
          .describe('Annual interest rate as decimal (e.g. 0.0450 = 4.50%)'),
      },
      async (dto) => {
        try {
          return ok(await this.accountsService.create(dto as any));
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'update_account',
      'Update an existing account',
      {
        id: z.string().uuid().describe('Account UUID'),
        name: z.string().min(1).max(255).optional(),
        type: z.enum(['corriente', 'ahorros', 'digital']).optional(),
        bank: z.string().min(1).max(255).optional(),
        currentBalance: z.number().optional(),
        interestRate: z.number().min(0).max(1).nullable().optional(),
      },
      async ({ id, ...dto }) => {
        try {
          return ok(await this.accountsService.update(id, dto as any));
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'delete_account',
      'Delete an account by its UUID',
      { id: z.string().uuid().describe('Account UUID') },
      async ({ id }) => {
        try {
          await this.accountsService.remove(id);
          return ok({ message: `Account ${id} deleted successfully` });
        } catch (e) {
          return err(e);
        }
      },
    );
  }

  // ─── Credit Cards ─────────────────────────────────────────────────────────

  private registerCreditCardTools(server: McpServer): void {
    server.tool(
      'list_credit_cards',
      'List all credit cards with optional pagination',
      paginationSchema,
      async (pagination) => {
        try {
          return ok(await this.creditCardsService.findAll(pagination as PaginationDto));
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'get_credit_card',
      'Get a single credit card by its UUID',
      { id: z.string().uuid().describe('Credit card UUID') },
      async ({ id }) => {
        try {
          return ok(await this.creditCardsService.findOne(id));
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'create_credit_card',
      'Add a new credit card',
      {
        name: z.string().min(1).max(255).describe('Card name or alias'),
        bank: z.string().min(1).max(255).describe('Issuing bank'),
        interestRate: z
          .number()
          .min(0)
          .max(1)
          .describe('Annual interest rate as decimal (e.g. 0.2800 = 28.00%)'),
        monthlyFee: z.number().min(0).describe('Monthly fee in COP'),
        totalLimit: z.number().positive().describe('Total credit limit in COP'),
        availableLimit: z.number().min(0).describe('Available credit limit in COP'),
      },
      async (dto) => {
        try {
          return ok(await this.creditCardsService.create(dto as any));
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'update_credit_card',
      'Update an existing credit card',
      {
        id: z.string().uuid().describe('Credit card UUID'),
        name: z.string().min(1).max(255).optional(),
        bank: z.string().min(1).max(255).optional(),
        interestRate: z.number().min(0).max(1).optional(),
        monthlyFee: z.number().min(0).optional(),
        totalLimit: z.number().positive().optional(),
        availableLimit: z.number().min(0).optional(),
      },
      async ({ id, ...dto }) => {
        try {
          return ok(await this.creditCardsService.update(id, dto as any));
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'delete_credit_card',
      'Delete a credit card by its UUID',
      { id: z.string().uuid().describe('Credit card UUID') },
      async ({ id }) => {
        try {
          await this.creditCardsService.remove(id);
          return ok({ message: `Credit card ${id} deleted successfully` });
        } catch (e) {
          return err(e);
        }
      },
    );
  }

  // ─── CDTs ─────────────────────────────────────────────────────────────────

  private registerCdtTools(server: McpServer): void {
    server.tool(
      'list_cdts',
      'List all CDTs (certificates of deposit) with optional pagination',
      paginationSchema,
      async (pagination) => {
        try {
          return ok(await this.cdtsService.findAll(pagination as PaginationDto));
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'get_cdt',
      'Get a single CDT by its UUID',
      { id: z.string().uuid().describe('CDT UUID') },
      async ({ id }) => {
        try {
          return ok(await this.cdtsService.findOne(id));
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'get_active_cdts',
      'List all CDTs that have not yet matured (endDate >= today)',
      {},
      async () => {
        try {
          return ok(await this.cdtsService.findActive());
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'create_cdt',
      'Register a new CDT (certificate of deposit)',
      {
        bank: z.string().min(1).max(255).describe('Issuing bank'),
        investedAmount: z.number().positive().describe('Invested amount in COP'),
        interestRate: z
          .number()
          .min(0)
          .max(1)
          .describe('Annual interest rate as decimal (e.g. 0.1250 = 12.50%)'),
        startDate: z.string().describe('Start date (YYYY-MM-DD)'),
        endDate: z.string().describe('Maturity date (YYYY-MM-DD)'),
      },
      async (dto) => {
        try {
          return ok(await this.cdtsService.create(dto as any));
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'update_cdt',
      'Update an existing CDT',
      {
        id: z.string().uuid().describe('CDT UUID'),
        bank: z.string().min(1).max(255).optional(),
        investedAmount: z.number().positive().optional(),
        interestRate: z.number().min(0).max(1).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      },
      async ({ id, ...dto }) => {
        try {
          return ok(await this.cdtsService.update(id, dto as any));
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'delete_cdt',
      'Delete a CDT by its UUID',
      { id: z.string().uuid().describe('CDT UUID') },
      async ({ id }) => {
        try {
          await this.cdtsService.remove(id);
          return ok({ message: `CDT ${id} deleted successfully` });
        } catch (e) {
          return err(e);
        }
      },
    );
  }

  // ─── Budgets ──────────────────────────────────────────────────────────────

  private registerBudgetTools(server: McpServer): void {
    server.tool(
      'list_budgets',
      'List budgets, optionally filtered by year and/or month',
      {
        year: z.number().int().positive().optional().describe('Filter by year (e.g. 2025)'),
        month: z
          .number()
          .int()
          .min(1)
          .max(12)
          .optional()
          .describe('Filter by month (1–12)'),
        ...paginationSchema,
      },
      async ({ year, month, ...pagination }) => {
        try {
          return ok(await this.budgetsService.findAll(pagination as PaginationDto, year, month));
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'get_budget',
      'Get a single budget by UUID, including all its items',
      { id: z.string().uuid().describe('Budget UUID') },
      async ({ id }) => {
        try {
          return ok(await this.budgetsService.findOne(id));
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'create_budget',
      'Create a new monthly budget, optionally with initial items',
      {
        name: z.string().min(1).max(255).describe('Budget name'),
        month: z.number().int().min(1).max(12).describe('Month (1–12)'),
        year: z.number().int().min(2020).describe('Year (>= 2020)'),
        items: z
          .array(
            z.object({
              description: z.string().min(1).max(255),
              plannedAmount: z.number().positive(),
            }),
          )
          .optional()
          .describe('Initial budget items'),
      },
      async (dto) => {
        try {
          return ok(await this.budgetsService.create(dto as any));
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'update_budget',
      'Update budget name, month or year',
      {
        id: z.string().uuid().describe('Budget UUID'),
        name: z.string().min(1).max(255).optional(),
        month: z.number().int().min(1).max(12).optional(),
        year: z.number().int().min(2020).optional(),
      },
      async ({ id, ...dto }) => {
        try {
          return ok(await this.budgetsService.update(id, dto as any));
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'delete_budget',
      'Delete a budget and all its items by UUID',
      { id: z.string().uuid().describe('Budget UUID') },
      async ({ id }) => {
        try {
          await this.budgetsService.remove(id);
          return ok({ message: `Budget ${id} deleted successfully` });
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'add_budget_item',
      'Add a new item to an existing budget',
      {
        budgetId: z.string().uuid().describe('Budget UUID'),
        description: z.string().min(1).max(255).describe('Item description'),
        plannedAmount: z.number().positive().describe('Planned amount in COP'),
        type: z
          .enum(['basico', 'lujo', 'ahorro', 'pago_deuda'])
          .describe('Expense type: basico, lujo, ahorro or pago_deuda'),
      },
      async ({ budgetId, ...dto }) => {
        try {
          return ok(await this.budgetsService.addItem(budgetId, dto as any));
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'update_budget_item',
      'Update description, amount or type of an existing budget item',
      {
        budgetId: z.string().uuid().describe('Budget UUID'),
        itemId: z.string().uuid().describe('Budget item UUID'),
        description: z.string().min(1).max(255).optional(),
        plannedAmount: z.number().positive().optional(),
        type: z.enum(['basico', 'lujo', 'ahorro', 'pago_deuda']).optional(),
      },
      async ({ budgetId, itemId, ...dto }) => {
        try {
          return ok(await this.budgetsService.updateItem(budgetId, itemId, dto as any));
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'delete_budget_item',
      'Remove a specific item from a budget',
      {
        budgetId: z.string().uuid().describe('Budget UUID'),
        itemId: z.string().uuid().describe('Budget item UUID'),
      },
      async ({ budgetId, itemId }) => {
        try {
          await this.budgetsService.removeItem(budgetId, itemId);
          return ok({ message: `Budget item ${itemId} deleted successfully` });
        } catch (e) {
          return err(e);
        }
      },
    );

    server.tool(
      'get_monthly_expense_summary',
      'Get consolidated monthly expense summary combining fixed budget items and variable expenses for a given month. Returns budgetTotal, expensesTotal, combinedTotal and the budgetId if a budget exists for that month.',
      {
        year: z.number().int().min(2000).max(2100).describe('Year (e.g. 2026)'),
        month: z.number().int().min(1).max(12).describe('Month (1–12)'),
      },
      async ({ year, month }) => {
        try {
          return ok(await this.budgetsService.getMonthlySummary(year, month));
        } catch (e) {
          return err(e);
        }
      },
    );
  }
}
