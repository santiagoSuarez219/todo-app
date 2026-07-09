import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ActivitiesService } from './activities.service';
import { Activity } from './entities/activity.entity';
import { ProjectsService } from '../projects/projects.service';

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
