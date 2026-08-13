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
