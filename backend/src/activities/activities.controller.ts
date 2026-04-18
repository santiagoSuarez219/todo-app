import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { Activity } from './entities/activity.entity';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ActivityStatus } from '../common/enums/activity-status.enum';
import { ActivityType } from '../common/enums/activity-type.enum';
import { Priority } from '../common/enums/priority.enum';

@ApiTags('activities')
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  // ─── CRUD ───────────────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create a new activity' })
  @ApiCreatedResponse({ type: Activity })
  create(@Body() dto: CreateActivityDto): Promise<Activity> {
    return this.activitiesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all activities (paginated)' })
  @ApiOkResponse({ type: [Activity] })
  findAll(@Query() pagination: PaginationDto): Promise<Activity[]> {
    return this.activitiesService.findAll(pagination);
  }

  // ─── Consultas especializadas (deben ir ANTES de /:id) ──────────────────────

  @Get('today')
  @ApiOperation({ summary: "Get today's activities (by actionDate)" })
  @ApiOkResponse({ type: [Activity] })
  findToday(@Query() pagination: PaginationDto): Promise<Activity[]> {
    return this.activitiesService.findToday(pagination);
  }

  @Get('tomorrow')
  @ApiOperation({ summary: "Get tomorrow's activities (by actionDate)" })
  @ApiOkResponse({ type: [Activity] })
  findTomorrow(@Query() pagination: PaginationDto): Promise<Activity[]> {
    return this.activitiesService.findTomorrow(pagination);
  }

  @Get('this-week')
  @ApiOperation({ summary: 'Get activities for the current week (Mon–Sun, by actionDate)' })
  @ApiOkResponse({ type: [Activity] })
  findThisWeek(@Query() pagination: PaginationDto): Promise<Activity[]> {
    return this.activitiesService.findThisWeek(pagination);
  }

  @Get('overdue')
  @ApiOperation({ summary: 'Get overdue activities (dueDate < today, status != completed)' })
  @ApiOkResponse({ type: [Activity] })
  findOverdue(@Query() pagination: PaginationDto): Promise<Activity[]> {
    return this.activitiesService.findOverdue(pagination);
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Get activities by project' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiOkResponse({ type: [Activity] })
  findByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() pagination: PaginationDto,
  ): Promise<Activity[]> {
    return this.activitiesService.findByProject(projectId, pagination);
  }

  @Get('type/:type')
  @ApiOperation({ summary: 'Get activities by type' })
  @ApiParam({ name: 'type', enum: ActivityType })
  @ApiOkResponse({ type: [Activity] })
  findByType(
    @Param('type', new ParseEnumPipe(ActivityType)) type: ActivityType,
    @Query() pagination: PaginationDto,
  ): Promise<Activity[]> {
    return this.activitiesService.findByType(type, pagination);
  }

  @Get('priority/:priority')
  @ApiOperation({ summary: 'Get activities by priority' })
  @ApiParam({ name: 'priority', enum: Priority })
  @ApiOkResponse({ type: [Activity] })
  findByPriority(
    @Param('priority', new ParseEnumPipe(Priority)) priority: Priority,
    @Query() pagination: PaginationDto,
  ): Promise<Activity[]> {
    return this.activitiesService.findByPriority(priority, pagination);
  }

  @Get('status/:status')
  @ApiOperation({ summary: 'Get activities by status' })
  @ApiParam({ name: 'status', enum: ActivityStatus })
  @ApiOkResponse({ type: [Activity] })
  findByStatus(
    @Param('status', new ParseEnumPipe(ActivityStatus)) status: ActivityStatus,
    @Query() pagination: PaginationDto,
  ): Promise<Activity[]> {
    return this.activitiesService.findByStatus(status, pagination);
  }

  @Get('search/:query')
  @ApiOperation({ summary: 'Buscar actividades por nombre, descripcion o proyecto' })
  @ApiParam({ name: 'query', type: String })
  @ApiOkResponse({ type: [Activity] })
  search(
    @Param('query') query: string,
    @Query() pagination: PaginationDto,
  ): Promise<Activity[]> {
    return this.activitiesService.search(query, pagination);
  }

  @Get(':id/subtasks')
  @ApiOperation({ summary: 'Get subtasks of an activity' })
  @ApiOkResponse({ type: [Activity] })
  @ApiNotFoundResponse()
  findSubtasks(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() pagination: PaginationDto,
  ): Promise<Activity[]> {
    return this.activitiesService.findSubtasks(id, pagination);
  }

  // ─── Rutas dinámicas (siempre al final) ─────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: 'Get an activity by id (includes project, parent, subtasks)' })
  @ApiOkResponse({ type: Activity })
  @ApiNotFoundResponse()
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Activity> {
    return this.activitiesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an activity' })
  @ApiOkResponse({ type: Activity })
  @ApiNotFoundResponse()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateActivityDto,
  ): Promise<Activity> {
    return this.activitiesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an activity' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.activitiesService.remove(id);
  }
}
