import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ActivitiesService } from './activities.service';
import { Activity } from './entities/activity.entity';
import { ProjectsService } from '../projects/projects.service';
import { ActivityStatus } from '../common/enums/activity-status.enum';

describe('ActivitiesService - Search', () => {
  let service: ActivitiesService;
  let mockRepository: any;
  let mockProjectsService: any;

  beforeEach(async () => {
    mockRepository = {
      createQueryBuilder: jest.fn(),
    };

    mockProjectsService = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivitiesService,
        {
          provide: getRepositoryToken(Activity),
          useValue: mockRepository,
        },
        {
          provide: ProjectsService,
          useValue: mockProjectsService,
        },
      ],
    }).compile();

    service = module.get<ActivitiesService>(ActivitiesService);
  });

  describe('search()', () => {
    const mockActivities = [
      {
        id: '1',
        name: 'Backend API design',
        description: 'Design REST endpoints',
        project: { id: 'p1', name: 'Project A' },
      },
      {
        id: '2',
        name: 'Frontend components',
        description: null,
        project: { id: 'p2', name: 'Project B' },
      },
    ];

    it('should search activities globally by name', async () => {
      const mockQb = {
        where: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockActivities[0]]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.search('backend', { page: 1, limit: 20 });

      expect(mockQb.where).toHaveBeenCalled();
      expect(mockQb.getMany).toHaveBeenCalled();
      expect(result).toEqual([mockActivities[0]]);
    });

    it('should search activities scoped to a project', async () => {
      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockActivities[0]]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQb);

      const projectId = 'p1';
      const result = await service.search('backend', { page: 1, limit: 20 }, projectId);

      expect(mockQb.where).toHaveBeenCalled();
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'activity.projectId = :projectId',
        { projectId },
      );
      expect(mockQb.getMany).toHaveBeenCalled();
      expect(result).toEqual([mockActivities[0]]);
    });

    it('should return empty array for empty query', async () => {
      const result = await service.search('', { page: 1, limit: 20 });
      expect(result).toEqual([]);
    });

    it('should return empty array for whitespace-only query', async () => {
      const result = await service.search('   ', { page: 1, limit: 20 });
      expect(result).toEqual([]);
    });

    it('should respect pagination parameters', async () => {
      const mockQb = {
        where: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.search('test', { page: 2, limit: 10 });

      expect(mockQb.skip).toHaveBeenCalledWith(10); // (2-1) * 10
      expect(mockQb.take).toHaveBeenCalledWith(10);
    });
  });
});

// spec-024 — Completar subtareas automáticamente al completar la tarea padre
describe('ActivitiesService - update() cascade to subtasks (spec-024)', () => {
  let service: ActivitiesService;
  let mockRepository: any;
  let mockProjectsService: any;

  beforeEach(async () => {
    mockRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    mockProjectsService = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivitiesService,
        {
          provide: getRepositoryToken(Activity),
          useValue: mockRepository,
        },
        {
          provide: ProjectsService,
          useValue: mockProjectsService,
        },
      ],
    }).compile();

    service = module.get<ActivitiesService>(ActivitiesService);
  });

  function baseActivity(overrides: Record<string, unknown> = {}) {
    return {
      id: 'parent-1',
      name: 'Padre',
      description: null,
      type: 'task',
      status: ActivityStatus.PENDING,
      priority: 'medium',
      energy: 'medium',
      isTemplate: false,
      isRecurring: false,
      project: null,
      parent: null,
      subtasks: [],
      ...overrides,
    };
  }

  describe('transition detection', () => {
    it('triggers the subtask completion cascade only on the transition into "completed"', async () => {
      const activity = baseActivity({ status: ActivityStatus.PENDING });
      mockRepository.findOne.mockResolvedValue(activity);
      mockRepository.save.mockImplementation((a: any) =>
        Promise.resolve({ ...a, status: ActivityStatus.COMPLETED }),
      );

      const cascadeSpy = jest
        .spyOn(service as any, 'completeSubtaskTree')
        .mockResolvedValue(undefined);

      await service.update('parent-1', {
        status: ActivityStatus.COMPLETED,
      } as any);

      expect(cascadeSpy).toHaveBeenCalledTimes(1);
      expect(cascadeSpy).toHaveBeenCalledWith('parent-1');
    });

    it('does NOT trigger the cascade if the parent was already "completed"', async () => {
      const activity = baseActivity({ status: ActivityStatus.COMPLETED });
      mockRepository.findOne.mockResolvedValue(activity);
      mockRepository.save.mockImplementation((a: any) =>
        Promise.resolve({ ...a, status: ActivityStatus.COMPLETED }),
      );

      const cascadeSpy = jest
        .spyOn(service as any, 'completeSubtaskTree')
        .mockResolvedValue(undefined);

      await service.update('parent-1', {
        status: ActivityStatus.COMPLETED,
      } as any);

      expect(cascadeSpy).not.toHaveBeenCalled();
    });

    it('does NOT trigger the cascade when the update does not touch the status field', async () => {
      const activity = baseActivity({
        status: ActivityStatus.PENDING,
        name: 'Padre original',
      });
      mockRepository.findOne.mockResolvedValue(activity);
      mockRepository.save.mockImplementation((a: any) =>
        Promise.resolve({ ...a }),
      );

      const cascadeSpy = jest
        .spyOn(service as any, 'completeSubtaskTree')
        .mockResolvedValue(undefined);

      await service.update('parent-1', { name: 'Padre renombrado' } as any);

      expect(cascadeSpy).not.toHaveBeenCalled();
    });
  });

  describe('completeSubtaskTree() recursive traversal', () => {
    it('walks the descendant tree level by level and completes every descendant found', async () => {
      const rootId = 'root-1';
      const level1 = [
        { id: 'child-1' },
        { id: 'child-2' },
      ];
      const level2 = [{ id: 'grandchild-1' }];

      mockRepository.find
        .mockResolvedValueOnce(level1) // children of root
        .mockResolvedValueOnce(level2) // children of level1
        .mockResolvedValueOnce([]); // no more descendants

      const updateExecute = jest.fn().mockResolvedValue(undefined);
      const mockQb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: updateExecute,
      };
      mockRepository.createQueryBuilder.mockReturnValue(mockQb);

      await (service as any).completeSubtaskTree(rootId);

      // Traverses at least two levels: root's direct children, and their
      // children, stopping only once a level comes back empty.
      expect(mockRepository.find).toHaveBeenCalledTimes(3);
      // Every descendant collected across all levels must be persisted as
      // completed — not just the first level.
      expect(updateExecute).toHaveBeenCalled();
      expect(mockQb.set).toHaveBeenCalledWith(
        expect.objectContaining({ status: ActivityStatus.COMPLETED }),
      );
    });
  });
});

// spec-025 — Cronograma: vista de calendario mensual
describe('ActivitiesService - findByMonth() (spec-025)', () => {
  let service: ActivitiesService;
  let mockRepository: any;
  let mockProjectsService: any;
  let mockQb: any;

  beforeEach(async () => {
    mockQb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    mockRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQb),
    };

    mockProjectsService = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivitiesService,
        {
          provide: getRepositoryToken(Activity),
          useValue: mockRepository,
        },
        {
          provide: ProjectsService,
          useValue: mockProjectsService,
        },
      ],
    }).compile();

    service = module.get<ActivitiesService>(ActivitiesService);
  });

  it('exists as a method on the service', () => {
    // Fails in red until Fase 1 implements `findByMonth` on the service.
    expect(typeof (service as any).findByMonth).toBe('function');
  });

  it('computes the visible grid range (Monday of the week containing day 1 → Sunday of the week containing the last day) and queries within it', async () => {
    // March 2031: day 1 is a Saturday, last day (31) is a Monday.
    // Visible grid: Monday 2031-02-24 → Sunday 2031-04-06.
    await (service as any).findByMonth({ year: 2031, month: 3 });

    expect(mockRepository.createQueryBuilder).toHaveBeenCalled();
    const andWhereCalls = mockQb.andWhere.mock.calls;
    const rangeCall = andWhereCalls.find(([, params]: [string, any]) =>
      params && 'start' in params && 'end' in params,
    );
    expect(rangeCall).toBeDefined();

    const [, params] = rangeCall;
    const start = new Date(params.start);
    const end = new Date(params.end);

    expect(start.getFullYear()).toBe(2031);
    expect(start.getMonth()).toBe(1); // February (0-indexed)
    expect(start.getDate()).toBe(24);

    expect(end.getFullYear()).toBe(2031);
    expect(end.getMonth()).toBe(3); // April (0-indexed)
    expect(end.getDate()).toBe(6);
  });

  it('filters isTemplate = false and parent IS NULL (top-level activities only)', async () => {
    await (service as any).findByMonth({ year: 2031, month: 3 });

    const allWhereCalls = [
      ...mockQb.where.mock.calls,
      ...mockQb.andWhere.mock.calls,
    ];
    const conditions = allWhereCalls.map((call: any[]) => call[0]).join(' ');

    expect(conditions).toMatch(/isTemplate\s*=\s*false/);
    expect(conditions).toMatch(/parent/i);
    expect(conditions).toMatch(/IS NULL/i);
  });

  it('locates activities by COALESCE(dueDate, instanceDate) — not by dueDate alone', async () => {
    await (service as any).findByMonth({ year: 2031, month: 3 });

    const allWhereCalls = [
      ...mockQb.where.mock.calls,
      ...mockQb.andWhere.mock.calls,
    ];
    const conditions = allWhereCalls.map((call: any[]) => call[0]).join(' ');

    expect(conditions).toMatch(/COALESCE/i);
    expect(conditions).toMatch(/dueDate/);
    expect(conditions).toMatch(/instanceDate/);
  });

  it('does NOT filter by status — unlike findToday/findThisWeek/findOverdue, completed activities must remain in the result set', async () => {
    await (service as any).findByMonth({ year: 2031, month: 3 });

    const allWhereCalls = [
      ...mockQb.where.mock.calls,
      ...mockQb.andWhere.mock.calls,
    ];
    const conditions = allWhereCalls.map((call: any[]) => call[0]).join(' ');

    expect(conditions).not.toMatch(/activity\.status/);
  });

  it('does not paginate — applies only a safety `take` cap, and returns getMany() directly', async () => {
    mockQb.getMany.mockResolvedValue([{ id: 'a1' }, { id: 'a2' }]);

    const result = await (service as any).findByMonth({ year: 2031, month: 3 });

    expect(mockQb.take).toHaveBeenCalledWith(500);
    expect(mockQb.getMany).toHaveBeenCalled();
    expect(result).toEqual([{ id: 'a1' }, { id: 'a2' }]);
  });
});
