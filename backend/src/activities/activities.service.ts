import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository, SelectQueryBuilder } from 'typeorm';
import { Activity } from './entities/activity.entity';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { ProjectsService } from '../projects/projects.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ActivityStatus } from '../common/enums/activity-status.enum';
import { Priority } from '../common/enums/priority.enum';
import { RecurrenceFrequency } from '../common/enums/recurrence-frequency.enum';
import { ScheduleQueryDto } from './dto/schedule-query.dto';

@Injectable()
export class ActivitiesService {
  constructor(
    @InjectRepository(Activity)
    private readonly activitiesRepository: Repository<Activity>,
    private readonly projectsService: ProjectsService,
  ) {}

  // ─── helpers ────────────────────────────────────────────────────────────────

  private baseQuery(): SelectQueryBuilder<Activity> {
    return this.activitiesRepository
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.project', 'project')
      .leftJoinAndSelect('activity.parent', 'parent')
      .leftJoinAndSelect('activity.subtasks', 'subtasks')
      .addSelect(
        `CASE activity.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END`,
        'priority_order',
      )
      .orderBy('activity.dueDate', 'ASC', 'NULLS LAST')
      .addOrderBy('priority_order', 'ASC');
  }

  private paginate(
    qb: SelectQueryBuilder<Activity>,
    { page = 1, limit = 20 }: PaginationDto,
  ): SelectQueryBuilder<Activity> {
    return qb.skip((page - 1) * limit).take(limit);
  }

  private todayRange(): { start: Date; end: Date } {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  /**
   * spec-030: `deferUntil` is a plain `date` column, compared as a calendar
   * date string (never a `Date`/`timestamptz`) to avoid the same timezone
   * promotion bug documented on `findByMonth()` — see `toDateOnlyString()`.
   * Always compared against **today**, never a view's date window.
   */
  private notDeferredCondition(): string {
    return '(activity.deferUntil IS NULL OR activity.deferUntil <= :today)';
  }

  // ─── Recurrence helpers ──────────────────────────────────────────────────────

  buildInstanceFromTemplate(template: Activity, date: Date): Activity {
    const instanceDate = date.toISOString().split('T')[0];
    const instance = this.activitiesRepository.create({
      name: template.name,
      description: template.description,
      priority: template.priority,
      energy: template.energy,
      project: template.project,
      status: ActivityStatus.PENDING,
      isTemplate: false,
      templateId: template.id,
      instanceDate,
      dueDate: null,
      // spec-031 (opción A): cada instancia queda programada para su propio
      // día — preserva y mejora el comportamiento anterior (las instancias
      // futuras también quedaban "para hoy" antes, cosa incoherente).
      scheduledFor: instanceDate,
      // spec-030: instances never inherit deferUntil from the template —
      // deferring a recurring template affects the template, not instances
      // already materialized.
      deferUntil: null,
    });
    return instance;
  }

  shouldGenerateForDate(template: Activity, date: Date): boolean {
    const freq = template.recurrenceFrequency;
    if (!freq) return false;

    if (
      template.recurrenceEndDate &&
      date > new Date(template.recurrenceEndDate)
    ) {
      return false;
    }

    const dayOfWeek = date.getDay();

    switch (freq) {
      case RecurrenceFrequency.DAILY:
        return true;

      case RecurrenceFrequency.WEEKLY:
        return !!(
          template.recurrenceDays && template.recurrenceDays.includes(dayOfWeek)
        );

      case RecurrenceFrequency.BIWEEKLY: {
        if (
          !template.recurrenceDays ||
          !template.recurrenceDays.includes(dayOfWeek)
        ) {
          return false;
        }
        // Use dueDate as origin for biweekly cycle calculation
        if (!template.dueDate) return false;
        const origin = new Date(template.dueDate);
        const diffMs = date.getTime() - origin.getTime();
        const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
        return diffWeeks % 2 === 0;
      }

      case RecurrenceFrequency.MONTHLY:
        return date.getDate() === template.recurrenceDayOfMonth;

      case RecurrenceFrequency.YEARLY: {
        if (!template.dueDate) return false;
        const origin = new Date(template.dueDate);
        return (
          date.getMonth() === origin.getMonth() &&
          date.getDate() === origin.getDate()
        );
      }

      default:
        return false;
    }
  }

  async generateInstanceForDate(
    template: Activity,
    date: Date,
  ): Promise<Activity | null> {
    const dateStr = date.toISOString().split('T')[0];
    const existing = await this.activitiesRepository.findOne({
      where: { templateId: template.id, instanceDate: dateStr },
    });
    if (existing) return null;

    const instance = this.buildInstanceFromTemplate(template, date);
    return this.activitiesRepository.save(instance);
  }

  // ─── CRUD ───────────────────────────────────────────────────────────────────

  async create(dto: CreateActivityDto): Promise<Activity> {
    // Whitelisted field-by-field (no `...rest` spread) so a caller that
    // bypasses the HTTP ValidationPipe (direct service call, MCP) can never
    // smuggle a stale/removed field (e.g. `type`) into the persisted entity.
    const {
      projectId,
      parentId,
      recurrenceEndDate,
      name,
      description,
      dueDate,
      priority,
      status,
      energy,
      scheduledFor,
      deferUntil,
      waitingFor,
      waitingSince,
      recurrenceFrequency,
      recurrenceDays,
      recurrenceDayOfMonth,
    } = dto;

    // spec-032: waitingFor/waitingSince only make sense with status ===
    // 'waiting' — forced to null otherwise, even if the caller sent them
    // (silent cleanup, not a 400 — same criterion as the removed
    // sanitizeByType from spec-027). waitingSince defaults to today if the
    // activity is born already waiting and none was given.
    const isWaiting = status === ActivityStatus.WAITING;

    const activity = this.activitiesRepository.create({
      name,
      description,
      dueDate,
      priority,
      status,
      energy,
      scheduledFor,
      deferUntil,
      waitingFor: isWaiting ? (waitingFor ?? null) : null,
      waitingSince: isWaiting
        ? (waitingSince ?? this.toDateOnlyString(new Date()))
        : null,
      recurrenceFrequency,
      recurrenceDays,
      recurrenceDayOfMonth,
      isTemplate: recurrenceFrequency != null,
      recurrenceEndDate: recurrenceEndDate ? new Date(recurrenceEndDate) : null,
      // spec-028: a rare path (imports, MCP) but an activity born `completed`
      // should never carry `completedAt: null` — keeps the invariant that
      // `completed` always has a real close instant. postponementCount is
      // set explicitly (not left to the DB default) so it's always present
      // on the object returned from create(), not just after a round-trip.
      completedAt: status === ActivityStatus.COMPLETED ? new Date() : null,
      postponementCount: 0,
    });

    if (projectId) {
      activity.project = await this.projectsService.findOne(projectId);
    }

    if (parentId) {
      const parent = await this.activitiesRepository.findOneBy({
        id: parentId,
      });
      if (!parent) {
        throw new NotFoundException(`Activity with id "${parentId}" not found`);
      }
      activity.parent = parent;
    }

    return this.activitiesRepository.save(activity);
  }

  findAll(pagination: PaginationDto): Promise<Activity[]> {
    return this.paginate(this.baseQuery(), pagination).getMany();
  }

  async findOne(id: string): Promise<Activity> {
    const activity = await this.activitiesRepository.findOne({
      where: { id },
      relations: { project: true, parent: true, subtasks: true },
    });
    if (!activity) {
      throw new NotFoundException(`Activity with id "${id}" not found`);
    }
    return activity;
  }

  async update(id: string, dto: UpdateActivityDto): Promise<Activity> {
    const activity = await this.findOne(id);
    const previousStatus = activity.status;
    // spec-028: captured before Object.assign, same as previousStatus above —
    // needed to detect "posponer" (dueDate moving strictly later than a
    // dueDate it already had), which only makes sense against the pre-update
    // value.
    const previousDueDate = activity.dueDate;
    // Whitelisted field-by-field — see the same note in create().
    const {
      projectId,
      parentId,
      recurrenceEndDate,
      name,
      description,
      dueDate,
      priority,
      status,
      energy,
      scheduledFor,
      deferUntil,
      waitingFor,
      waitingSince,
      recurrenceFrequency,
      recurrenceDays,
      recurrenceDayOfMonth,
    } = dto;

    Object.assign(activity, {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(dueDate !== undefined && { dueDate }),
      ...(priority !== undefined && { priority }),
      ...(status !== undefined && { status }),
      ...(energy !== undefined && { energy }),
      // spec-031: programar no es posponer, tampoco toca postponementCount
      // (mismo criterio ya establecido para deferUntil).
      ...(scheduledFor !== undefined && { scheduledFor }),
      // spec-030: deferring is never "posponer" — it's excluded from the
      // postponementCount trigger below (which only looks at `dueDate`).
      ...(deferUntil !== undefined && { deferUntil }),
      ...(recurrenceFrequency !== undefined && {
        recurrenceFrequency,
        isTemplate: recurrenceFrequency != null,
      }),
      ...(recurrenceDays !== undefined && { recurrenceDays }),
      ...(recurrenceDayOfMonth !== undefined && { recurrenceDayOfMonth }),
      ...(recurrenceEndDate !== undefined && {
        recurrenceEndDate: recurrenceEndDate
          ? new Date(recurrenceEndDate)
          : null,
      }),
    });

    if (projectId !== undefined) {
      activity.project = projectId
        ? await this.projectsService.findOne(projectId)
        : null;
    }

    if (parentId !== undefined) {
      if (parentId === null) {
        activity.parent = null;
      } else {
        if (parentId === id) {
          throw new BadRequestException('An activity cannot be its own parent');
        }
        const parent = await this.activitiesRepository.findOneBy({
          id: parentId,
        });
        if (!parent) {
          throw new NotFoundException(
            `Activity with id "${parentId}" not found`,
          );
        }
        activity.parent = parent;
      }
    }

    // spec-028: completedAt follows the same transition trigger as the
    // spec-024 cascade below — set on the way IN to completed, cleared on
    // the way OUT. An activity that stays completed (or never touches
    // status) keeps its original completedAt untouched.
    if (
      previousStatus !== ActivityStatus.COMPLETED &&
      activity.status === ActivityStatus.COMPLETED
    ) {
      activity.completedAt = new Date();
    } else if (
      previousStatus === ActivityStatus.COMPLETED &&
      activity.status !== ActivityStatus.COMPLETED
    ) {
      activity.completedAt = null;
    }

    // spec-032: waitingFor/waitingSince only make sense while status ===
    // 'waiting'. Entering waiting (previousStatus wasn't already waiting)
    // autocompletes waitingSince to today unless one was sent explicitly.
    // Staying in waiting without touching status doesn't re-autocomplete —
    // it only applies whatever the caller explicitly sent. Leaving waiting
    // (or never being in it) forces both to null, silently discarding
    // incoherent values instead of rejecting the call — same criterion as
    // the removed sanitizeByType from spec-027.
    if (activity.status === ActivityStatus.WAITING) {
      const enteringWaiting = previousStatus !== ActivityStatus.WAITING;
      if (waitingFor !== undefined) {
        activity.waitingFor = waitingFor;
      }
      if (enteringWaiting) {
        activity.waitingSince =
          waitingSince !== undefined
            ? waitingSince
            : this.toDateOnlyString(new Date());
      } else if (waitingSince !== undefined) {
        activity.waitingSince = waitingSince;
      }
    } else {
      activity.waitingFor = null;
      activity.waitingSince = null;
    }

    // spec-028: "posponer" = had a dueDate already, and the new one is
    // strictly later. First assignment, equal/earlier dates, clearing to
    // null, or touching unrelated fields (including deferUntil/scheduledFor
    // from later specs) never increment this. At most one increment per
    // update(), regardless of how many fields the call touches.
    if (
      dueDate !== undefined &&
      dueDate != null &&
      previousDueDate != null &&
      new Date(dueDate).getTime() > previousDueDate.getTime()
    ) {
      activity.postponementCount = (activity.postponementCount ?? 0) + 1;
    }

    let saved = await this.activitiesRepository.save(activity);

    // spec-024: completing the parent completes its whole subtask tree.
    // Only fires on the transition into "completed" — resaving an already
    // completed activity (or updating without touching status) must not
    // re-run the cascade over subtasks the user may have reopened since.
    if (
      previousStatus !== ActivityStatus.COMPLETED &&
      saved.status === ActivityStatus.COMPLETED
    ) {
      await this.completeSubtaskTree(saved.id);
      // `saved.subtasks` was loaded before the cascade ran, so it still
      // holds the pre-cascade statuses. Re-fetch so the response — read
      // directly by REST/MCP callers, not just the UI — reflects reality.
      saved = await this.findOne(saved.id);
    }

    // Propagate inheritable fields to future pending instances
    if (saved.isTemplate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      await this.activitiesRepository
        .createQueryBuilder()
        .update(Activity)
        .set({
          name: saved.name,
          description: saved.description,
          priority: saved.priority,
          energy: saved.energy,
        })
        .where('templateId = :id', { id })
        .andWhere('status = :status', { status: ActivityStatus.PENDING })
        .andWhere('instanceDate > :today', { today: todayStr })
        .execute();
    }

    return saved;
  }

  /**
   * spec-024: recursively completes every descendant of `rootId`, level by
   * level, regardless of their current status (including `cancelled`).
   * Guards against cycles by never revisiting an id already completed.
   */
  private async completeSubtaskTree(rootId: string): Promise<void> {
    const visited = new Set<string>();
    let parentIds = [rootId];
    // spec-028: a subtask completed by the cascade must not end up
    // `completed` with `completedAt: null` — same instant reused for every
    // level, since the whole cascade is one logical completion event.
    const completedAt = new Date();

    while (parentIds.length > 0) {
      const children = await this.activitiesRepository.find({
        where: { parent: { id: In(parentIds) } },
        select: ['id'],
      });

      const childIds = children
        .map((child) => child.id)
        .filter((childId) => !visited.has(childId));

      if (childIds.length === 0) {
        break;
      }

      childIds.forEach((childId) => visited.add(childId));

      await this.activitiesRepository
        .createQueryBuilder()
        .update(Activity)
        .set({ status: ActivityStatus.COMPLETED, completedAt })
        .where('id IN (:...ids)', { ids: childIds })
        .execute();

      parentIds = childIds;
    }
  }

  async remove(id: string): Promise<void> {
    const activity = await this.findOne(id);
    await this.activitiesRepository.remove(activity);
  }

  // ─── Recurrence queries ───────────────────────────────────────────────────────

  getInstancesByTemplate(templateId: string): Promise<Activity[]> {
    return this.baseQuery()
      .where('activity.templateId = :templateId', { templateId })
      .orderBy('activity.instanceDate', 'ASC')
      .getMany();
  }

  async cancelFutureInstances(templateId: string): Promise<void> {
    await this.findOne(templateId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    await this.activitiesRepository
      .createQueryBuilder()
      .update(Activity)
      .set({ status: ActivityStatus.CANCELLED })
      .where('templateId = :templateId', { templateId })
      .andWhere('status = :status', { status: ActivityStatus.PENDING })
      .andWhere('instanceDate > :today', { today: todayStr })
      .execute();
  }

  findActiveTemplates(): Promise<Activity[]> {
    return this.activitiesRepository.find({
      where: { isTemplate: true, recurrenceFrequency: Not(IsNull()) },
      relations: { project: true },
    });
  }

  // ─── Consultas especializadas ────────────────────────────────────────────────

  findByProject(
    projectId: string,
    pagination: PaginationDto,
  ): Promise<Activity[]> {
    return this.paginate(
      this.baseQuery().where('project.id = :projectId', { projectId }),
      pagination,
    ).getMany();
  }

  findWithoutProject(pagination: PaginationDto): Promise<Activity[]> {
    return this.paginate(
      this.baseQuery()
        .where('activity.project IS NULL')
        .andWhere(this.notDeferredCondition(), {
          today: this.toDateOnlyString(new Date()),
        }),
      pagination,
    ).getMany();
  }

  findToday(pagination: PaginationDto): Promise<Activity[]> {
    const { start, end } = this.todayRange();
    const today = this.toDateOnlyString(new Date());
    return this.paginate(
      this.baseQuery()
        .where('activity.isTemplate = false')
        .andWhere(
          `(
            (activity.dueDate BETWEEN :start AND :end)
            OR
            (activity.scheduledFor = :today AND activity.status != :completedStatus)
          )`,
          { start, end, today, completedStatus: ActivityStatus.COMPLETED },
        )
        .andWhere(this.notDeferredCondition(), { today }),
      pagination,
    ).getMany();
  }

  findTomorrow(pagination: PaginationDto): Promise<Activity[]> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const start = new Date(tomorrow);
    start.setHours(0, 0, 0, 0);
    const end = new Date(tomorrow);
    end.setHours(23, 59, 59, 999);
    return this.paginate(
      this.baseQuery()
        .where('activity.isTemplate = false')
        .andWhere('activity.dueDate BETWEEN :start AND :end', { start, end })
        // spec-030: compared against TODAY, not tomorrow — same rule as
        // every other active view.
        .andWhere(this.notDeferredCondition(), {
          today: this.toDateOnlyString(new Date()),
        }),
      pagination,
    ).getMany();
  }

  findThisWeek(pagination: PaginationDto): Promise<Activity[]> {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return this.paginate(
      this.baseQuery()
        .where('activity.isTemplate = false')
        .andWhere('activity.dueDate BETWEEN :monday AND :sunday', {
          monday,
          sunday,
        })
        // spec-030: compared against TODAY, not the window's Monday/Sunday —
        // a task deferred to Thursday does not show up today even though
        // Thursday falls inside this week's range.
        .andWhere(this.notDeferredCondition(), {
          today: this.toDateOnlyString(new Date()),
        }),
      pagination,
    ).getMany();
  }

  findOverdue(pagination: PaginationDto): Promise<Activity[]> {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return this.paginate(
      this.baseQuery()
        .where('activity.isTemplate = false')
        .andWhere('activity.dueDate < :now', { now })
        .andWhere('activity.status != :status', {
          status: ActivityStatus.COMPLETED,
        })
        // spec-030: intentional consequence — a deferred-but-overdue task
        // does not appear in Overdue, which is exactly the point of
        // deferring it.
        .andWhere(this.notDeferredCondition(), {
          today: this.toDateOnlyString(new Date()),
        }),
      pagination,
    ).getMany();
  }

  /**
   * spec-025: visible grid range of a monthly calendar — the Monday of the
   * week containing the 1st of `month` through the Sunday of the week
   * containing its last day. Mirrors the Mon–Sun convention already used by
   * `findThisWeek()`.
   */
  private getVisibleGridRange(
    year: number,
    month: number,
  ): { start: Date; end: Date } {
    const firstDay = new Date(year, month - 1, 1);
    const firstDayOfWeek = firstDay.getDay();
    const diffToMonday = firstDayOfWeek === 0 ? -6 : 1 - firstDayOfWeek;
    const start = new Date(year, month - 1, 1 + diffToMonday);
    start.setHours(0, 0, 0, 0);

    const lastDay = new Date(year, month, 0);
    const lastDayOfWeek = lastDay.getDay();
    const diffToSunday = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek;
    const end = new Date(year, month, 0 + diffToSunday);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  /**
   * Formats a Date as a plain `YYYY-MM-DD` calendar-date string using its
   * LOCAL fields (never `toISOString()`, which is UTC and would shift the
   * day near a timezone boundary). Used to compare against `instanceDate`
   * (a `date` column) without going through timestamptz — see `findByMonth`.
   */
  private toDateOnlyString(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  /**
   * spec-025: activities for the "Cronograma" monthly calendar view. Only
   * top-level, non-template activities within the visible grid range,
   * located by dueDate or, if absent, instanceDate — so recurring task
   * instances (which only get `instanceDate`, not `dueDate`) show up too.
   * Unlike findToday/findThisWeek/findOverdue, completed activities are NOT
   * filtered out — the calendar shows them attenuated instead of hiding them.
   *
   * Bug fixed after code review: originally this used
   * `COALESCE(activity.dueDate, activity.instanceDate) BETWEEN :start AND :end`.
   * `instanceDate` is a plain `date` column; COALESCE-ing it with a
   * `timestamptz` forces Postgres to promote it to timestamptz using the
   * **session timezone** (UTC here), while `:start`/`:end` are JS Dates
   * built from local wall-clock midnight (server TZ, UTC-5). That mismatch
   * silently excluded instances landing on the grid's first visible day and
   * included ones a day past its last visible day. Comparing `instanceDate`
   * against plain `YYYY-MM-DD` strings (`toDateOnlyString`, local fields)
   * instead keeps the comparison a pure calendar-date comparison, immune to
   * timezone promotion.
   */
  findByMonth(query: ScheduleQueryDto): Promise<Activity[]> {
    const { start, end } = this.getVisibleGridRange(query.year, query.month);
    const startDateOnly = this.toDateOnlyString(start);
    const endDateOnly = this.toDateOnlyString(end);
    return this.baseQuery()
      .where('activity.isTemplate = false')
      .andWhere('activity.parent IS NULL')
      .andWhere(
        `(
          (activity.dueDate BETWEEN :start AND :end)
          OR
          (activity.dueDate IS NULL AND activity.instanceDate BETWEEN :startDateOnly AND :endDateOnly)
        )`,
        { start, end, startDateOnly, endDateOnly },
      )
      .take(500)
      .getMany();
  }

  /**
   * spec-030: activities currently hidden by `deferUntil` — `deferUntil` is
   * set and still strictly in the future, ordered soonest-first. Backs both
   * `GET /activities/deferred` and the `get_deferred_activities` MCP tool.
   * No UI view consumes it yet (out of scope); it exists so an agent (or a
   * future "Diferidas" view) can see what's currently hidden.
   */
  findDeferred(
    pagination: PaginationDto,
    projectId?: string,
  ): Promise<Activity[]> {
    let qb = this.baseQuery()
      .where('activity.deferUntil IS NOT NULL')
      .andWhere('activity.deferUntil > :today', {
        today: this.toDateOnlyString(new Date()),
      })
      .orderBy('activity.deferUntil', 'ASC');

    if (projectId) {
      qb = qb.andWhere('activity.projectId = :projectId', { projectId });
    }

    return this.paginate(qb, pagination).getMany();
  }

  findByPriority(
    priority: Priority,
    pagination: PaginationDto,
  ): Promise<Activity[]> {
    return this.paginate(
      this.baseQuery().where('activity.priority = :priority', { priority }),
      pagination,
    ).getMany();
  }

  findByStatus(
    status: ActivityStatus,
    pagination: PaginationDto,
  ): Promise<Activity[]> {
    return this.paginate(
      this.baseQuery().where('activity.status = :status', { status }),
      pagination,
    ).getMany();
  }

  async findSubtasks(
    id: string,
    pagination: PaginationDto,
  ): Promise<Activity[]> {
    await this.findOne(id);
    return this.paginate(
      this.baseQuery().where('parent.id = :id', { id }),
      pagination,
    ).getMany();
  }

  async search(
    query: string,
    pagination: PaginationDto,
    projectId?: string,
  ): Promise<Activity[]> {
    const term = query.trim();
    if (!term) return [];

    let qb = this.baseQuery().where(
      '(activity.name ILIKE :q OR activity.description ILIKE :q OR project.name ILIKE :q)',
      { q: `%${term}%` },
    );

    if (projectId) {
      qb = qb.andWhere('activity.projectId = :projectId', { projectId });
    }

    return this.paginate(qb, pagination).getMany();
  }
}
