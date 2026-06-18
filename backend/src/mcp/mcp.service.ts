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
  ) {}

  /**
   * Creates and returns a fully configured McpServer instance.
   * A new instance is created per request (stateless HTTP transport).
   */
  createServer(): McpServer {
    const server = new McpServer({ name: 'todo-api', version: '1.0.0' });
    this.registerProjectTools(server);
    this.registerActivityTools(server);
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
      'Create a new activity or subtask',
      {
        name: z.string().min(1).max(255).describe('Activity name'),
        projectId: z
          .string()
          .uuid()
          .optional()
          .describe('UUID of the associated project'),
        actionDate: z
          .string()
          .optional()
          .describe('Scheduled date/time (ISO 8601, e.g. 2026-04-13T09:00:00Z)'),
        dueDate: z
          .string()
          .optional()
          .describe('Deadline date/time (ISO 8601)'),
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
        duration: z.number().min(0).optional().describe('Duration value'),
        durationUnit: z
          .enum(['hours', 'days'])
          .optional()
          .describe('Duration unit'),
        device: z
          .enum(['phone', 'computer', 'tablet'])
          .optional()
          .describe('Recommended device'),
        type: z
          .enum(['reminder', 'event', 'task'])
          .optional()
          .describe('Activity type (default: task)'),
        location: z.string().max(255).optional().describe('Location'),
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
        actionDate: z.string().nullable().optional(),
        dueDate: z.string().nullable().optional(),
        priority: z.enum(['high', 'medium', 'low']).optional(),
        status: z.enum(['pending', 'in_progress', 'completed', 'cancelled', 'on_hold']).optional(),
        energy: z.enum(['high', 'medium', 'low']).optional(),
        duration: z.number().min(0).nullable().optional(),
        durationUnit: z.enum(['hours', 'days']).nullable().optional(),
        device: z.enum(['phone', 'computer', 'tablet']).nullable().optional(),
        type: z.enum(['reminder', 'event', 'task']).optional(),
        location: z.string().max(255).nullable().optional(),
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
      "Get activities scheduled for today (filtered by actionDate)",
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
      "Get activities scheduled for tomorrow (filtered by actionDate)",
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
      'Get activities for the current week (Monday to Sunday, filtered by actionDate)',
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
      'Get activities filtered by type (task, reminder or event)',
      {
        type: z.enum(['reminder', 'event', 'task']).describe('Activity type'),
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
  }
}
