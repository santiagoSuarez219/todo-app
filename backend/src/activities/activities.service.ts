import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Not, Repository, SelectQueryBuilder } from 'typeorm';
import { Activity } from './entities/activity.entity';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { ProjectsService } from '../projects/projects.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ActivityStatus } from '../common/enums/activity-status.enum';
import { ActivityType } from '../common/enums/activity-type.enum';
import { Priority } from '../common/enums/priority.enum';

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
      .orderBy('activity.createdAt', 'DESC');
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

  // ─── CRUD ───────────────────────────────────────────────────────────────────

  async create(dto: CreateActivityDto): Promise<Activity> {
    const { projectId, parentId, ...rest } = dto;

    const activity = this.activitiesRepository.create(rest);

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
    const { projectId, parentId, ...rest } = dto;

    Object.assign(activity, rest);

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

    return this.activitiesRepository.save(activity);
  }

  async remove(id: string): Promise<void> {
    const activity = await this.findOne(id);
    await this.activitiesRepository.remove(activity);
  }

  // ─── Consultas especializadas ────────────────────────────────────────────────

  findByProject(projectId: string, pagination: PaginationDto): Promise<Activity[]> {
    return this.paginate(
      this.baseQuery().where('project.id = :projectId', { projectId }),
      pagination,
    ).getMany();
  }

  findToday(pagination: PaginationDto): Promise<Activity[]> {
    const { start, end } = this.todayRange();
    return this.paginate(
      this.baseQuery().where(
        'activity.actionDate BETWEEN :start AND :end',
        { start, end },
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
      this.baseQuery().where(
        'activity.actionDate BETWEEN :start AND :end',
        { start, end },
      ),
      pagination,
    ).getMany();
  }

  findThisWeek(pagination: PaginationDto): Promise<Activity[]> {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return this.paginate(
      this.baseQuery().where(
        'activity.actionDate BETWEEN :monday AND :sunday',
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
        .where('activity.dueDate < :now', { now })
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
    await this.findOne(id); // valida que existe
    return this.paginate(
      this.baseQuery().where('parent.id = :id', { id }),
      pagination,
    ).getMany();
  }
}
