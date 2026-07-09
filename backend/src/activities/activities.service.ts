import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Activity } from './entities/activity.entity';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { ProjectsService } from '../projects/projects.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ActivityStatus } from '../common/enums/activity-status.enum';
import { ActivityType } from '../common/enums/activity-type.enum';
import { Priority } from '../common/enums/priority.enum';
import { RecurrenceFrequency } from '../common/enums/recurrence-frequency.enum';

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

  // ─── Type sanitization ───────────────────────────────────────────────────────

  private sanitizeByType(dto: CreateActivityDto): CreateActivityDto {
    const type = dto.type ?? ActivityType.TASK;
    const sanitized = { ...dto };

    if (type === ActivityType.REMINDER) {
      sanitized.parentId = undefined;
    }

    // For TASK: strip time from dueDate (keep date only)
    if (type === ActivityType.TASK && sanitized.dueDate) {
      const d = new Date(sanitized.dueDate);
      d.setHours(0, 0, 0, 0);
      sanitized.dueDate = d.toISOString();
    }

    return sanitized;
  }

  // ─── Recurrence helpers ──────────────────────────────────────────────────────

  buildInstanceFromTemplate(template: Activity, date: Date): Activity {
    const instance = this.activitiesRepository.create({
      name: template.name,
      description: template.description,
      type: template.type,
      priority: template.priority,
      energy: template.energy,
      project: template.project,
      status: ActivityStatus.PENDING,
      isTemplate: false,
      isRecurring: false,
      templateId: template.id,
      instanceDate: date.toISOString().split('T')[0],
      // For reminders: set dueDate to instance date at 9am
      dueDate:
        template.type === ActivityType.REMINDER
          ? new Date(date.setHours(9, 0, 0, 0))
          : null,
      scheduledForToday: this.isToday(date),
    });
    return instance;
  }

  private isToday(date: Date): boolean {
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
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
    const { projectId, parentId, isRecurring, recurrenceEndDate, ...rest } =
      this.sanitizeByType(dto);

    const activity = this.activitiesRepository.create({
      ...rest,
      isRecurring: isRecurring ?? false,
      isTemplate: isRecurring ?? false,
      recurrenceEndDate: recurrenceEndDate
        ? new Date(recurrenceEndDate)
        : null,
    });

    if (projectId) {
      activity.project = await this.projectsService.findOne(projectId);
    }

    if (parentId) {
      const parent = await this.activitiesRepository.findOneBy({ id: parentId });
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
    const effectiveDto = { ...dto, type: dto.type ?? activity.type } as CreateActivityDto;
    const {
      projectId,
      parentId,
      isRecurring,
      recurrenceEndDate,
      ...rest
    } = this.sanitizeByType(effectiveDto);

    Object.assign(activity, {
      ...rest,
      ...(isRecurring !== undefined && {
        isRecurring,
        isTemplate: isRecurring,
      }),
      ...(recurrenceEndDate !== undefined && {
        recurrenceEndDate: recurrenceEndDate ? new Date(recurrenceEndDate) : null,
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
        const parent = await this.activitiesRepository.findOneBy({ id: parentId });
        if (!parent) {
          throw new NotFoundException(`Activity with id "${parentId}" not found`);
        }
        activity.parent = parent;
      }
    }

    const saved = await this.activitiesRepository.save(activity);

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
      where: { isTemplate: true, isRecurring: true },
      relations: { project: true },
    });
  }

  // ─── Consultas especializadas ────────────────────────────────────────────────

  findByProject(projectId: string, pagination: PaginationDto): Promise<Activity[]> {
    return this.paginate(
      this.baseQuery().where('project.id = :projectId', { projectId }),
      pagination,
    ).getMany();
  }

  findWithoutProject(pagination: PaginationDto): Promise<Activity[]> {
    return this.paginate(
      this.baseQuery().where('activity.project IS NULL'),
      pagination,
    ).getMany();
  }

  findToday(pagination: PaginationDto): Promise<Activity[]> {
    const { start, end } = this.todayRange();
    return this.paginate(
      this.baseQuery()
        .where('activity.isTemplate = false')
        .andWhere(
          `(
            (activity.dueDate BETWEEN :start AND :end)
            OR
            (activity.scheduledForToday = true AND activity.status != :completedStatus)
          )`,
          { start, end, completedStatus: ActivityStatus.COMPLETED },
        ),
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
        .andWhere(
          'activity.dueDate BETWEEN :start AND :end',
          { start, end },
        ),
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
        .andWhere(
          'activity.dueDate BETWEEN :monday AND :sunday',
          { monday, sunday },
        ),
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
        .andWhere('activity.status != :status', { status: ActivityStatus.COMPLETED }),
      pagination,
    ).getMany();
  }

  findByType(type: ActivityType, pagination: PaginationDto): Promise<Activity[]> {
    return this.paginate(
      this.baseQuery().where('activity.type = :type', { type }),
      pagination,
    ).getMany();
  }

  findByPriority(priority: Priority, pagination: PaginationDto): Promise<Activity[]> {
    return this.paginate(
      this.baseQuery().where('activity.priority = :priority', { priority }),
      pagination,
    ).getMany();
  }

  findByStatus(status: ActivityStatus, pagination: PaginationDto): Promise<Activity[]> {
    return this.paginate(
      this.baseQuery().where('activity.status = :status', { status }),
      pagination,
    ).getMany();
  }

  async findSubtasks(id: string, pagination: PaginationDto): Promise<Activity[]> {
    await this.findOne(id);
    return this.paginate(
      this.baseQuery().where('parent.id = :id', { id }),
      pagination,
    ).getMany();
  }

  async search(query: string, pagination: PaginationDto, projectId?: string): Promise<Activity[]> {
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
