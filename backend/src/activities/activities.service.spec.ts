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
      const result = await service.search(
        'backend',
        { page: 1, limit: 20 },
        projectId,
      );

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

  // spec-027: `type` e `isRecurring` ya no forman parte del modelo — se
  // quitan del mock base en vez de arrastrarlos sin uso real (ningún caso de
  // este describe los verifica).
  function baseActivity(overrides: Record<string, unknown> = {}) {
    return {
      id: 'parent-1',
      name: 'Padre',
      description: null,
      status: ActivityStatus.PENDING,
      priority: 'medium',
      energy: 'medium',
      isTemplate: false,
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
      const level1 = [{ id: 'child-1' }, { id: 'child-2' }];
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
    expect(typeof service.findByMonth).toBe('function');
  });

  it('computes the visible grid range (Monday of the week containing day 1 → Sunday of the week containing the last day) and queries within it', async () => {
    // March 2031: day 1 is a Saturday, last day (31) is a Monday.
    // Visible grid: Monday 2031-02-24 → Sunday 2031-04-06.
    await service.findByMonth({ year: 2031, month: 3 });

    expect(mockRepository.createQueryBuilder).toHaveBeenCalled();
    const andWhereCalls = mockQb.andWhere.mock.calls;
    const rangeCall = andWhereCalls.find(
      ([, params]: [string, any]) =>
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
    await service.findByMonth({ year: 2031, month: 3 });

    const allWhereCalls = [
      ...mockQb.where.mock.calls,
      ...mockQb.andWhere.mock.calls,
    ];
    const conditions = allWhereCalls.map((call: any[]) => call[0]).join(' ');

    expect(conditions).toMatch(/isTemplate\s*=\s*false/);
    expect(conditions).toMatch(/parent/i);
    expect(conditions).toMatch(/IS NULL/i);
  });

  it('locates activities by dueDate, or by instanceDate when dueDate is absent — not by a COALESCE across timestamptz/date types', async () => {
    // Bug fixed after code review: COALESCE(dueDate, instanceDate) forced
    // Postgres to promote the `date` column to timestamptz using the DB
    // session timezone, silently shifting instanceDate-only activities by a
    // day near the grid's boundaries (see e2e-025 for the regression case
    // against a real DB). The query must instead branch explicitly: match
    // on dueDate when present, or on instanceDate only when dueDate is NULL
    // — each compared against params of its own matching type.
    await service.findByMonth({ year: 2031, month: 3 });

    const allWhereCalls = [
      ...mockQb.where.mock.calls,
      ...mockQb.andWhere.mock.calls,
    ];
    const conditions = allWhereCalls.map((call: any[]) => call[0]).join(' ');

    expect(conditions).not.toMatch(/COALESCE/i);
    expect(conditions).toMatch(
      /activity\.dueDate\s+BETWEEN\s+:start\s+AND\s+:end/,
    );
    expect(conditions).toMatch(/activity\.dueDate\s+IS\s+NULL/i);
    expect(conditions).toMatch(
      /activity\.instanceDate\s+BETWEEN\s+:startDateOnly\s+AND\s+:endDateOnly/,
    );

    // The instanceDate params must be plain YYYY-MM-DD strings (not Date
    // objects/timestamps), so the DB compares date-to-date, never promoting
    // through a timezone-aware type.
    const dateOnlyCall = allWhereCalls.find(
      ([, params]: [string, any]) => params && 'startDateOnly' in params,
    );
    expect(dateOnlyCall).toBeDefined();
    const [, dateOnlyParams] = dateOnlyCall;
    expect(dateOnlyParams.startDateOnly).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(dateOnlyParams.endDateOnly).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('does NOT filter by status — unlike findToday/findThisWeek/findOverdue, completed activities must remain in the result set', async () => {
    await service.findByMonth({ year: 2031, month: 3 });

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

// spec-030 — Diferir actividades: deferUntil
//
// Redactado en modo test-first (@tester): estos casos deben quedar en rojo
// hasta que `findToday`/`findTomorrow`/`findThisWeek`/`findOverdue`/
// `findWithoutProject` agreguen la condición
// `(activity.deferUntil IS NULL OR activity.deferUntil <= :today)` y
// `buildInstanceFromTemplate()` fije `deferUntil: null` en las instancias.
//
// El punto que estos casos verifican explícitamente (no solo "existe la
// condición", sino "compara contra QUÉ"): el parámetro `:today` de cada una
// de las cinco consultas debe ser la fecha de HOY, nunca el borde final de
// la ventana de esa vista (ni "mañana" en findTomorrow, ni el domingo de la
// semana en findThisWeek). Comparar contra el fin de ventana es exactamente
// el bug que el spec descarta explícitamente (spec-030 § "Semántica").
describe('ActivitiesService - deferUntil filtering (spec-030)', () => {
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
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    mockRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQb),
      // buildInstanceFromTemplate() calls repository.create() to build the
      // (unsaved) instance entity — the real TypeORM repository just merges
      // the given properties onto a new object, so a passthrough is enough.
      create: jest.fn((props: Record<string, unknown>) => ({ ...props })),
      findOne: jest.fn(),
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

  /** Extracts every `andWhere`/`where` condition string issued on the query
   * builder, joined into one searchable blob, plus the raw calls for
   * per-parameter inspection. */
  function allConditions(): { text: string; calls: any[][] } {
    const calls = [...mockQb.where.mock.calls, ...mockQb.andWhere.mock.calls];
    return { text: calls.map((c: any[]) => c[0]).join(' '), calls };
  }

  /** Finds the specific andWhere/where call that carries the deferUntil
   * condition and returns its bound params (expected to include a `today`
   * key holding a plain `YYYY-MM-DD` string, per `toDateOnlyString()`). */
  function deferUntilCallParams(): Record<string, unknown> {
    const { calls } = allConditions();
    const call = calls.find(
      ([text]: [string]) =>
        typeof text === 'string' && /deferUntil/i.test(text),
    );
    expect(call).toBeDefined();
    return call![1] as Record<string, unknown>;
  }

  describe('findToday()', () => {
    it('adds the deferUntil IS NULL OR deferUntil <= :today condition', async () => {
      await service.findToday({ page: 1, limit: 20 });
      const { text } = allConditions();
      expect(text).toMatch(/deferUntil\s+IS\s+NULL/i);
      expect(text).toMatch(/deferUntil\s*<=\s*:today/i);
    });

    it('applies the deferUntil condition OUTSIDE the dueDate/scheduledFor OR — it must gate both branches', async () => {
      await service.findToday({ page: 1, limit: 20 });
      const { calls } = allConditions();
      // The pre-existing OR of (dueDate BETWEEN…) / (scheduledFor…) is
      // its own single condition string; deferUntil must be a SEPARATE
      // andWhere, not folded inside that same parenthesized OR block.
      // scheduledForToday (boolean) was replaced by scheduledFor (date) in
      // spec-031 — the locator was updated along with it.
      const orBlockCall = calls.find(([text]: [string]) =>
        /activity\.scheduledFor\s*=\s*:today/i.test(text),
      );
      expect(orBlockCall).toBeDefined();
      expect(orBlockCall![0]).not.toMatch(/deferUntil/i);
    });

    it('compares deferUntil against a plain YYYY-MM-DD "today" string, not a Date/timestamptz', async () => {
      await service.findToday({ page: 1, limit: 20 });
      const params = deferUntilCallParams();
      expect(params.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('findTomorrow()', () => {
    it('adds the deferUntil condition compared against TODAY, not tomorrow', async () => {
      await service.findTomorrow({ page: 1, limit: 20 });
      const { text } = allConditions();
      expect(text).toMatch(/deferUntil\s+IS\s+NULL/i);
      expect(text).toMatch(/deferUntil\s*<=\s*:today/i);

      const params = deferUntilCallParams();
      const pad = (n: number) => String(n).padStart(2, '0');
      const now = new Date();
      const expectedToday = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      expect(params.today).toBe(expectedToday);
    });
  });

  describe('findThisWeek() — key regression: compares against TODAY, never the window end', () => {
    it('adds the deferUntil condition bound to today, not to the Sunday of the visible week', async () => {
      await service.findThisWeek({ page: 1, limit: 20 });
      const { text } = allConditions();
      expect(text).toMatch(/deferUntil\s+IS\s+NULL/i);
      expect(text).toMatch(/deferUntil\s*<=\s*:today/i);

      const params = deferUntilCallParams();
      const pad = (n: number) => String(n).padStart(2, '0');
      const now = new Date();
      const expectedToday = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      // The critical assertion: an activity deferred until, say, Thursday of
      // THIS week must be excluded today even though Thursday falls inside
      // the week's dueDate BETWEEN monday/sunday window — which only holds
      // if `:today` is really today, not the window's Sunday end. Comparing
      // the bound param directly against "today" (computed the same way,
      // independently) catches an implementation that mistakenly reused the
      // week's `sunday` variable as the deferUntil bound.
      expect(params.today).toBe(expectedToday);
    });
  });

  describe('findOverdue()', () => {
    it('adds the deferUntil condition — an overdue-but-deferred activity must not appear', async () => {
      await service.findOverdue({ page: 1, limit: 20 });
      const { text } = allConditions();
      expect(text).toMatch(/deferUntil\s+IS\s+NULL/i);
      expect(text).toMatch(/deferUntil\s*<=\s*:today/i);
    });
  });

  describe('findWithoutProject() — Backlog', () => {
    it('adds the deferUntil condition', async () => {
      await service.findWithoutProject({ page: 1, limit: 20 });
      const { text } = allConditions();
      expect(text).toMatch(/deferUntil\s+IS\s+NULL/i);
      expect(text).toMatch(/deferUntil\s*<=\s*:today/i);
    });
  });

  describe('Consultas que NO deben cambiar (contrato explícito del spec)', () => {
    it('findByMonth() does not filter by deferUntil — Cronograma is a planning view, not an execution view', async () => {
      await service.findByMonth({ year: 2031, month: 3 });
      const { text } = allConditions();
      expect(text).not.toMatch(/deferUntil/i);
    });

    it('findByProject() does not filter by deferUntil — explicit container view', async () => {
      await service.findByProject('project-1', { page: 1, limit: 20 });
      const { text } = allConditions();
      expect(text).not.toMatch(/deferUntil/i);
    });

    it('findSubtasks() does not filter by deferUntil', async () => {
      mockRepository.findOne = jest.fn().mockResolvedValue({ id: 'parent-1' });
      await service.findSubtasks('parent-1', { page: 1, limit: 20 });
      const { text } = allConditions();
      expect(text).not.toMatch(/deferUntil/i);
    });

    it('findAll() does not filter by deferUntil', async () => {
      await service.findAll({ page: 1, limit: 20 });
      const { text } = allConditions();
      expect(text).not.toMatch(/deferUntil/i);
    });

    it('search() does not filter by deferUntil', async () => {
      await service.search('backend', { page: 1, limit: 20 });
      const { text } = allConditions();
      expect(text).not.toMatch(/deferUntil/i);
    });
  });

  describe('buildInstanceFromTemplate() — instances are always born with deferUntil: null', () => {
    it('does not copy deferUntil from a deferred template onto the generated instance', () => {
      const template = {
        id: 'template-1',
        name: 'Plantilla diferida',
        description: null,
        type: 'task',
        priority: 'medium',
        energy: 'medium',
        project: null,
        isTemplate: true,
        isRecurring: true,
        recurrenceFrequency: 'daily',
        deferUntil: '2099-01-01',
      };

      const instance = service.buildInstanceFromTemplate(
        template as any,
        new Date(),
      );

      expect((instance as any).deferUntil).toBeNull();
    });

    it('produces deferUntil: null even when the template has no deferUntil at all (baseline)', () => {
      const template = {
        id: 'template-2',
        name: 'Plantilla sin diferir',
        description: null,
        type: 'task',
        priority: 'medium',
        energy: 'medium',
        project: null,
        isTemplate: true,
        isRecurring: true,
        recurrenceFrequency: 'daily',
        deferUntil: null,
      };

      const instance = service.buildInstanceFromTemplate(
        template as any,
        new Date(),
      );

      expect((instance as any).deferUntil).toBeNull();
    });
  });
});

// spec-028 — Trazabilidad de la actividad: `completedAt` y `postponementCount`
//
// Redactado en modo test-first (@tester), en rojo hasta que
// `activities.service.ts` implemente:
//   - captura de `previousDueDate` junto a `previousStatus`, antes del
//     `Object.assign`;
//   - seteo/limpieza de `completedAt` según la transición de `status`,
//     reflejado en el ÚNICO objeto pasado a `save()` (sin un segundo save);
//   - incremento de `postponementCount` solo cuando había `dueDate` previo y
//     el nuevo es estrictamente posterior;
//   - `completeSubtaskTree()` seteando también `completedAt` en su `UPDATE`
//     masivo;
//   - `create()` seteando `completedAt` si nace con `status: 'completed'`.
//
// Estos tests inspeccionan el objeto pasado a `mockRepository.save()` (no el
// valor final "post-refetch" de `update()`) porque, según el spec, el cálculo
// debe reflejarse en el guardado único previo al primer `save()` — igual que
// hacen los tests existentes de la cascada de spec-024 en este archivo.
describe('ActivitiesService - completedAt y postponementCount (spec-028)', () => {
  let service: ActivitiesService;
  let mockRepository: any;
  let mockProjectsService: any;

  beforeEach(async () => {
    mockRepository = {
      create: jest.fn((dto: any) => ({ ...dto })),
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
      id: 'activity-1',
      name: 'Actividad',
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
      dueDate: null,
      completedAt: null,
      postponementCount: 0,
      ...overrides,
    };
  }

  /** Returns the object handed to the (single) `save()` call made by
   * `update()` before any cascade/refetch logic runs. */
  function savedArg(): any {
    return mockRepository.save.mock.calls[0][0];
  }

  describe('completedAt — transiciones de status', () => {
    it('sets completedAt on the transition into "completed"', async () => {
      const activity = baseActivity({
        status: ActivityStatus.PENDING,
        completedAt: null,
      });
      mockRepository.findOne.mockResolvedValue(activity);
      mockRepository.save.mockImplementation((a: any) =>
        Promise.resolve({ ...a }),
      );
      jest
        .spyOn(service as any, 'completeSubtaskTree')
        .mockResolvedValue(undefined);

      const before = new Date();
      await service.update('activity-1', {
        status: ActivityStatus.COMPLETED,
      } as any);
      const after = new Date();

      const saved = savedArg();
      expect(saved.completedAt).toBeInstanceOf(Date);
      expect(saved.completedAt.getTime()).toBeGreaterThanOrEqual(
        before.getTime() - 1000,
      );
      expect(saved.completedAt.getTime()).toBeLessThanOrEqual(
        after.getTime() + 1000,
      );
    });

    it('clears completedAt to null on the transition OUT of "completed"', async () => {
      const originalCompletedAt = new Date('2026-01-01T00:00:00.000Z');
      const activity = baseActivity({
        status: ActivityStatus.COMPLETED,
        completedAt: originalCompletedAt,
      });
      mockRepository.findOne.mockResolvedValue(activity);
      mockRepository.save.mockImplementation((a: any) =>
        Promise.resolve({ ...a }),
      );

      await service.update('activity-1', {
        status: ActivityStatus.PENDING,
      } as any);

      const saved = savedArg();
      expect(saved.completedAt).toBeNull();
    });

    it('does NOT rewrite completedAt when saving an already-completed activity without touching status', async () => {
      const originalCompletedAt = new Date('2026-01-01T00:00:00.000Z');
      const activity = baseActivity({
        status: ActivityStatus.COMPLETED,
        completedAt: originalCompletedAt,
        name: 'Nombre original',
      });
      mockRepository.findOne.mockResolvedValue(activity);
      mockRepository.save.mockImplementation((a: any) =>
        Promise.resolve({ ...a }),
      );

      await service.update('activity-1', { name: 'Nombre renombrado' } as any);

      const saved = savedArg();
      expect(saved.completedAt).toEqual(originalCompletedAt);
    });

    it('does NOT set completedAt when the activity stays pending (no transition at all)', async () => {
      const activity = baseActivity({
        status: ActivityStatus.PENDING,
        completedAt: null,
      });
      mockRepository.findOne.mockResolvedValue(activity);
      mockRepository.save.mockImplementation((a: any) =>
        Promise.resolve({ ...a }),
      );

      await service.update('activity-1', {
        status: ActivityStatus.IN_PROGRESS,
      } as any);

      const saved = savedArg();
      expect(saved.completedAt).toBeNull();
    });
  });

  describe('completedAt — cascada de subtareas (spec-024) y su regresión explícita', () => {
    it('completeSubtaskTree() now also sets completedAt in the same mass UPDATE as status', async () => {
      const rootId = 'root-1';
      mockRepository.find
        .mockResolvedValueOnce([{ id: 'child-1' }])
        .mockResolvedValueOnce([]);

      const updateExecute = jest.fn().mockResolvedValue(undefined);
      const mockQb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: updateExecute,
      };
      mockRepository.createQueryBuilder.mockReturnValue(mockQb);

      const before = new Date();
      await (service as any).completeSubtaskTree(rootId);
      const after = before;
      void after;

      expect(mockQb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ActivityStatus.COMPLETED,
          completedAt: expect.any(Date),
        }),
      );
    });

    it('REGRESSION: reverting the parent from completed to pending does NOT re-run the cascade, so subtasks keep their completedAt untouched', async () => {
      // The parent itself was previously completed (and its subtasks were
      // completed by the cascade back then). Reopening the parent must be a
      // single-entity operation: no bulk UPDATE touching subtasks at all.
      const activity = baseActivity({
        status: ActivityStatus.COMPLETED,
        completedAt: new Date('2026-01-01T00:00:00.000Z'),
        subtasks: [
          {
            id: 'child-1',
            status: ActivityStatus.COMPLETED,
            completedAt: new Date('2026-01-01T00:05:00.000Z'),
          },
        ],
      });
      mockRepository.findOne.mockResolvedValue(activity);
      mockRepository.save.mockImplementation((a: any) =>
        Promise.resolve({ ...a }),
      );
      const cascadeSpy = jest
        .spyOn(service as any, 'completeSubtaskTree')
        .mockResolvedValue(undefined);

      await service.update('activity-1', {
        status: ActivityStatus.PENDING,
      } as any);

      // Un-completing is not a cascade trigger (only the transition INTO
      // completed is), and clearing completedAt is explicitly NOT a reverse
      // cascade per spec-028 — no bulk query should run against subtasks.
      expect(cascadeSpy).not.toHaveBeenCalled();
      expect(mockRepository.createQueryBuilder).not.toHaveBeenCalled();
    });
  });

  describe('postponementCount', () => {
    it('stays at 0 when the activity had no previous dueDate and one is assigned', async () => {
      const activity = baseActivity({ dueDate: null, postponementCount: 0 });
      mockRepository.findOne.mockResolvedValue(activity);
      mockRepository.save.mockImplementation((a: any) =>
        Promise.resolve({ ...a }),
      );

      await service.update('activity-1', {
        dueDate: '2026-06-10T00:00:00.000Z',
      } as any);

      expect(savedArg().postponementCount).toBe(0);
    });

    it('increments by 1 when the new dueDate is strictly later than the previous one', async () => {
      const activity = baseActivity({
        dueDate: new Date('2026-06-01T00:00:00.000Z'),
        postponementCount: 0,
      });
      mockRepository.findOne.mockResolvedValue(activity);
      mockRepository.save.mockImplementation((a: any) =>
        Promise.resolve({ ...a }),
      );

      await service.update('activity-1', {
        dueDate: '2026-06-10T00:00:00.000Z',
      } as any);

      expect(savedArg().postponementCount).toBe(1);
    });

    it('increments only once per update(), even if the call also touches other fields', async () => {
      const activity = baseActivity({
        dueDate: new Date('2026-06-01T00:00:00.000Z'),
        postponementCount: 2,
      });
      mockRepository.findOne.mockResolvedValue(activity);
      mockRepository.save.mockImplementation((a: any) =>
        Promise.resolve({ ...a }),
      );

      await service.update('activity-1', {
        dueDate: '2026-06-10T00:00:00.000Z',
        name: 'Renombrada de paso',
        priority: 'high',
      } as any);

      expect(savedArg().postponementCount).toBe(3);
    });

    it('does NOT increment when the new dueDate is earlier than the previous one', async () => {
      const activity = baseActivity({
        dueDate: new Date('2026-06-10T00:00:00.000Z'),
        postponementCount: 1,
      });
      mockRepository.findOne.mockResolvedValue(activity);
      mockRepository.save.mockImplementation((a: any) =>
        Promise.resolve({ ...a }),
      );

      await service.update('activity-1', {
        dueDate: '2026-06-01T00:00:00.000Z',
      } as any);

      expect(savedArg().postponementCount).toBe(1);
    });

    it('does NOT increment when the new dueDate equals the previous one (compared as instants)', async () => {
      const activity = baseActivity({
        dueDate: new Date('2026-06-10T00:00:00.000Z'),
        postponementCount: 1,
      });
      mockRepository.findOne.mockResolvedValue(activity);
      mockRepository.save.mockImplementation((a: any) =>
        Promise.resolve({ ...a }),
      );

      await service.update('activity-1', {
        dueDate: '2026-06-10T00:00:00.000Z',
      } as any);

      expect(savedArg().postponementCount).toBe(1);
    });

    it('does NOT increment when dueDate is cleared to null', async () => {
      const activity = baseActivity({
        dueDate: new Date('2026-06-10T00:00:00.000Z'),
        postponementCount: 1,
      });
      mockRepository.findOne.mockResolvedValue(activity);
      mockRepository.save.mockImplementation((a: any) =>
        Promise.resolve({ ...a }),
      );

      await service.update('activity-1', { dueDate: null } as any);

      expect(savedArg().postponementCount).toBe(1);
    });

    it('does NOT increment when the update does not touch dueDate at all (e.g. only priority changes)', async () => {
      const activity = baseActivity({
        dueDate: new Date('2026-06-10T00:00:00.000Z'),
        postponementCount: 1,
      });
      mockRepository.findOne.mockResolvedValue(activity);
      mockRepository.save.mockImplementation((a: any) =>
        Promise.resolve({ ...a }),
      );

      await service.update('activity-1', { priority: 'high' } as any);

      expect(savedArg().postponementCount).toBe(1);
    });

    // deferUntil (spec-030) / scheduledFor (spec-031) don't exist yet on the
    // DTO/entity in this phase. This test simulates their future arrival by
    // sending them as extra keys on the dto passed directly to the service
    // (bypassing the controller's ValidationPipe, which is out of scope for
    // this unit test) — postponementCount must ignore them entirely, only
    // `dueDate` counts as "posponer". Update this test if/when those fields
    // land on `UpdateActivityDto` with their real names.
    it('does NOT increment when only future-phase fields like deferUntil/scheduledFor would change (simulated), dueDate untouched', async () => {
      const activity = baseActivity({
        dueDate: new Date('2026-06-10T00:00:00.000Z'),
        postponementCount: 1,
      });
      mockRepository.findOne.mockResolvedValue(activity);
      mockRepository.save.mockImplementation((a: any) =>
        Promise.resolve({ ...a }),
      );

      await service.update('activity-1', {
        deferUntil: '2026-06-20T00:00:00.000Z',
        scheduledFor: '2026-06-15T00:00:00.000Z',
      } as any);

      expect(savedArg().postponementCount).toBe(1);
    });
  });

  describe('create()', () => {
    it('always creates activities with postponementCount: 0', async () => {
      mockRepository.save.mockImplementation((a: any) =>
        Promise.resolve({ ...a }),
      );

      const result = await service.create({
        name: 'Nueva actividad',
        type: 'task',
      } as any);

      expect(result.postponementCount).toBe(0);
    });

    it('sets completedAt when an activity is created already "completed"', async () => {
      mockRepository.save.mockImplementation((a: any) =>
        Promise.resolve({ ...a }),
      );

      const before = new Date();
      const result = await service.create({
        name: 'Nace completada',
        type: 'task',
        status: ActivityStatus.COMPLETED,
      } as any);
      const after = new Date();

      expect(result.completedAt).toBeInstanceOf(Date);
      expect(result.completedAt.getTime()).toBeGreaterThanOrEqual(
        before.getTime() - 1000,
      );
      expect(result.completedAt.getTime()).toBeLessThanOrEqual(
        after.getTime() + 1000,
      );
    });

    it('leaves completedAt null when an activity is created with the default (pending) status', async () => {
      mockRepository.save.mockImplementation((a: any) =>
        Promise.resolve({ ...a }),
      );

      const result = await service.create({
        name: 'Nace pendiente',
        type: 'task',
      } as any);

      expect(result.completedAt).toBeNull();
    });
  });
});

// spec-027 — Limpieza del modelo de Activity: `type`/`notionUrl`/
// `isRecurring` se eliminan; `isTemplate` pasa a derivarse de
// `recurrenceFrequency != null`.
//
// Redactado en modo test-first (@tester): en rojo hasta que
// `activities.service.ts` derive `isTemplate` de `recurrenceFrequency` (en
// vez de `isRecurring`) en `create()`/`update()`, `findActiveTemplates()`
// filtre por `recurrenceFrequency IS NOT NULL` (no `isRecurring`) y
// `buildInstanceFromTemplate()` deje de copiar `type`, de setear
// `isRecurring` y de dar `dueDate` a las 9am a los antiguos "recordatorios".
describe('ActivitiesService - create()/update() derivan isTemplate de recurrenceFrequency (spec-027)', () => {
  let service: ActivitiesService;
  let mockRepository: any;
  let mockProjectsService: any;

  beforeEach(async () => {
    // `update()` propaga campos heredables a instancias futuras vía
    // `createQueryBuilder().update()...execute()` cuando la actividad
    // guardada queda con `isTemplate: true` — se mockea aquí (chainable, no
    // usado por las aserciones de estos casos) para que ese efecto lateral no
    // reviente con un `TypeError` y la señal de rojo/verde quede limpia en la
    // aserción real de cada caso.
    const chainableQb = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(undefined),
    };

    mockRepository = {
      create: jest.fn((data: any) => data),
      save: jest.fn((data: any) =>
        Promise.resolve({ id: 'new-activity', ...data }),
      ),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(chainableQb),
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

  describe('create()', () => {
    it('marca isTemplate:true al enviar recurrenceFrequency, sin necesidad de isRecurring', async () => {
      await service.create({
        name: 'Plantilla diaria',
        recurrenceFrequency: 'daily',
      } as any);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ isTemplate: true }),
      );
      const created = mockRepository.create.mock.calls[0][0];
      expect(created).not.toHaveProperty('isRecurring');
    });

    it('deja isTemplate:false cuando no se envía recurrenceFrequency', async () => {
      await service.create({ name: 'Actividad simple' } as any);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ isTemplate: false }),
      );
    });

    it('ya no persiste `type` aunque el caller lo siga enviando (el campo fue eliminado del DTO/modelo)', async () => {
      await service.create({
        name: 'Actividad con type residual',
        type: 'task',
        recurrenceFrequency: 'weekly',
        recurrenceDays: [1],
      } as any);

      const created = mockRepository.create.mock.calls[0][0];
      expect(created).not.toHaveProperty('type');
    });
  });

  describe('update()', () => {
    function existingTemplate(overrides: Record<string, unknown> = {}) {
      return {
        id: 'template-1',
        name: 'Plantilla',
        status: ActivityStatus.PENDING,
        isTemplate: true,
        recurrenceFrequency: 'daily',
        project: null,
        parent: null,
        subtasks: [],
        ...overrides,
      };
    }

    it('recurrenceFrequency: null deja isTemplate:false (las instancias ya generadas no se tocan desde este método)', async () => {
      mockRepository.findOne.mockResolvedValue(existingTemplate());
      mockRepository.save.mockImplementation((a: any) => Promise.resolve(a));

      const result = await service.update('template-1', {
        recurrenceFrequency: null,
      } as any);

      expect(result.isTemplate).toBe(false);
    });

    it('una actividad sin recurrenceFrequency que recibe recurrenceDays no se convierte en plantilla', async () => {
      mockRepository.findOne.mockResolvedValue(
        existingTemplate({ isTemplate: false, recurrenceFrequency: null }),
      );
      mockRepository.save.mockImplementation((a: any) => Promise.resolve(a));

      const result = await service.update('template-1', {
        recurrenceDays: [1, 2],
      } as any);

      expect(result.isTemplate).toBe(false);
    });
  });
});

describe('ActivitiesService - findActiveTemplates() filtra por recurrenceFrequency, no por isRecurring (spec-027)', () => {
  let service: ActivitiesService;
  let mockRepository: any;
  let mockProjectsService: any;

  beforeEach(async () => {
    mockRepository = {
      find: jest.fn().mockResolvedValue([]),
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

  it('filtra isTemplate:true AND recurrenceFrequency IS NOT NULL, sin usar isRecurring', async () => {
    await service.findActiveTemplates();

    expect(mockRepository.find).toHaveBeenCalledTimes(1);
    const [{ where }] = mockRepository.find.mock.calls[0];

    expect(where).toBeDefined();
    expect((where as Record<string, unknown>).isTemplate).toBe(true);
    expect(where).not.toHaveProperty('isRecurring');
    expect(where).toHaveProperty('recurrenceFrequency');
  });
});

describe('ActivitiesService - buildInstanceFromTemplate() sin `type` ni `isRecurring` (spec-027)', () => {
  let service: ActivitiesService;
  let mockRepository: any;
  let mockProjectsService: any;

  beforeEach(async () => {
    mockRepository = {
      create: jest.fn((data: any) => data),
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

  it('no copia `type` de la plantilla (el campo ya no existe en el modelo)', () => {
    const template = {
      id: 'template-1',
      name: 'Plantilla',
      description: null,
      priority: 'medium',
      energy: 'medium',
      project: null,
    } as any;

    const instance = service.buildInstanceFromTemplate(
      template,
      new Date(2031, 2, 15),
    );

    expect(instance).not.toHaveProperty('type');
  });

  it('no setea `isRecurring` en la instancia (el campo ya no existe en el modelo)', () => {
    const template = {
      id: 'template-1',
      name: 'Plantilla',
      project: null,
    } as any;

    const instance = service.buildInstanceFromTemplate(
      template,
      new Date(2031, 2, 15),
    );

    expect(instance).not.toHaveProperty('isRecurring');
  });

  it('dueDate siempre null al construir la instancia — ya no hay rama de "recordatorio" que la ponga a las 9am', () => {
    // Usa un valor de `type` heredado de datos viejos a propósito: aunque la
    // plantilla todavía lo tuviera en memoria, buildInstanceFromTemplate no
    // debe volver a ramificar sobre él.
    const templateThatWasReminder = {
      id: 'template-1',
      name: 'Plantilla',
      type: 'reminder',
      project: null,
    } as any;

    const instance = service.buildInstanceFromTemplate(
      templateThatWasReminder,
      new Date(2031, 2, 15),
    );

    expect((instance as any).dueDate).toBeNull();
  });
});

// spec-031 — De `scheduledForToday` (booleano) a `scheduledFor` (fecha)
//
// Redactado en modo test-first (@tester): en rojo hasta que la columna
// `scheduledFor` reemplace a `scheduledForToday` en la entidad y `findToday()`
// use la nueva rama del OR. El caso de `deferUntil` asume el diseño ya
// aprobado en spec-030 (la condición vive FUERA del paréntesis del OR); si
// spec-030 tampoco está implementado todavía, este caso queda en rojo por esa
// razón adicional — comportamiento esperado mientras el paquete 027→032
// avanza en orden.
describe('ActivitiesService - findToday() con scheduledFor (spec-031)', () => {
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
      skip: jest.fn().mockReturnThis(),
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

  function allConditions(): string {
    const allWhereCalls = [
      ...mockQb.where.mock.calls,
      ...mockQb.andWhere.mock.calls,
    ];
    return allWhereCalls.map((call: any[]) => call[0]).join(' ');
  }

  function allParams(): Record<string, unknown> {
    const allWhereCalls = [
      ...mockQb.where.mock.calls,
      ...mockQb.andWhere.mock.calls,
    ];
    return allWhereCalls.reduce(
      (acc, [, params]: [string, any]) => ({ ...acc, ...(params ?? {}) }),
      {},
    );
  }

  it('la rama del OR usa `activity.scheduledFor = :today` en lugar del booleano `scheduledForToday`', async () => {
    await service.findToday({ page: 1, limit: 20 });

    const conditions = allConditions();
    expect(conditions).not.toMatch(/scheduledForToday/);
    expect(conditions).toMatch(/activity\.scheduledFor\s*=\s*:today/);
    expect(conditions).toMatch(/activity\.status\s*!=\s*:completedStatus/);
  });

  it('el parámetro :today es una fecha YYYY-MM-DD local, no un Date/timestamp', async () => {
    await service.findToday({ page: 1, limit: 20 });

    const params = allParams();
    expect(params.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('conserva la condición de deferUntil de spec-030 FUERA del paréntesis del OR (deferUntil manda sobre scheduledFor)', async () => {
    await service.findToday({ page: 1, limit: 20 });

    const conditions = allConditions();
    // La condición de deferUntil debe existir...
    expect(conditions).toMatch(/deferUntil/);
    // ...y no debe estar dentro del bloque OR de dueDate/scheduledFor: se
    // localiza el paréntesis que agrupa ambas ramas (dueDate BETWEEN ... OR
    // scheduledFor = :today) y se verifica que ese bloque específico no
    // contiene la palabra deferUntil.
    const orBlockMatch = conditions.match(
      /\(\s*\(\s*activity\.dueDate[\s\S]*?activity\.scheduledFor\s*=\s*:today[\s\S]*?\)\s*\)/,
    );
    expect(orBlockMatch).toBeDefined();
    expect(orBlockMatch?.[0] ?? '').not.toMatch(/deferUntil/);
  });

  it('sigue excluyendo plantillas (isTemplate = false)', async () => {
    await service.findToday({ page: 1, limit: 20 });

    const conditions = allConditions();
    expect(conditions).toMatch(/isTemplate\s*=\s*false/);
  });
});

describe('ActivitiesService - buildInstanceFromTemplate() con scheduledFor (spec-031)', () => {
  let service: ActivitiesService;
  let mockRepository: any;
  let mockProjectsService: any;

  beforeEach(async () => {
    mockRepository = {
      create: jest.fn((data: any) => data),
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

  function templateActivity(overrides: Record<string, unknown> = {}) {
    return {
      id: 'template-1',
      name: 'Plantilla',
      description: null,
      type: 'task',
      priority: 'medium',
      energy: 'medium',
      project: null,
      ...overrides,
    } as any;
  }

  it('la instancia queda programada para su propio día: scheduledFor = instanceDate (opción A confirmada)', () => {
    const instanceDate = new Date(2031, 2, 15); // 2031-03-15, cualquier día, no necesariamente hoy

    const instance = service.buildInstanceFromTemplate(
      templateActivity(),
      instanceDate,
    );

    expect((instance as any).scheduledFor).toBe('2031-03-15');
    // La columna vieja ya no debe usarse.
    expect((instance as any).scheduledForToday).toBeUndefined();
  });

  it('una instancia futura también queda programada para su propio día (mejora sobre el comportamiento actual)', () => {
    const farFutureDate = new Date(2099, 11, 25); // 2099-12-25

    const instance = service.buildInstanceFromTemplate(
      templateActivity(),
      farFutureDate,
    );

    expect((instance as any).scheduledFor).toBe('2099-12-25');
  });
});

// spec-032 — Estado `waiting`: bloqueado por otra persona (`waitingFor`,
// `waitingSince`).
//
// Redactado en modo test-first (@tester): en rojo hasta que exista el valor
// `waiting` en `ActivityStatus` y las columnas `waitingFor`/`waitingSince`
// en `Activity`, con su ciclo de vida en `create()`/`update()`. Como
// `ActivityStatus` todavía no declara `WAITING`, estos casos usan el literal
// `'waiting'` (con `as any` donde hace falta) en lugar de
// `ActivityStatus.WAITING` — referenciar el miembro inexistente rompería la
// compilación de todo el archivo antes de poder ejecutar un solo test.
//
// El caso de regresión `completed → waiting` asume `completedAt` (spec-028),
// parte del mismo paquete "Actividades — modelo de capas" y con orden de
// implementación anterior a spec-032 según el propio spec.
describe('ActivitiesService - ciclo de vida de `waiting` (spec-032)', () => {
  let service: ActivitiesService;
  let mockRepository: any;
  let mockProjectsService: any;

  function todayDateOnlyString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  beforeEach(async () => {
    mockRepository = {
      create: jest.fn((data: any) => data),
      findOne: jest.fn(),
      save: jest.fn((a: any) => Promise.resolve({ ...a })),
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
      id: 'activity-1',
      name: 'Actividad',
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
      waitingFor: null,
      waitingSince: null,
      ...overrides,
    };
  }

  describe('create() — nace en waiting o fuera de waiting', () => {
    it('nace en waiting sin waitingSince: se autocompleta a la fecha de hoy', async () => {
      const result = await service.create({
        name: 'Nace esperando',
        type: 'task',
        status: 'waiting',
      } as any);

      expect((result as any).status).toEqual('waiting');
      expect((result as any).waitingSince).toEqual(todayDateOnlyString());
    });

    it('nace en waiting con waitingSince explícito: se respeta el valor enviado', async () => {
      const result = await service.create({
        name: 'Nace esperando desde antes',
        type: 'task',
        status: 'waiting',
        waitingSince: '2026-01-03',
      } as any);

      expect((result as any).waitingSince).toEqual('2026-01-03');
    });

    it('nace en waiting sin waitingFor: no es obligatorio, queda null', async () => {
      const result = await service.create({
        name: 'Nace esperando sin decir a quién',
        type: 'task',
        status: 'waiting',
      } as any);

      expect((result as any).waitingFor).toBeNull();
    });

    it('nace fuera de waiting: waitingFor/waitingSince se fuerzan a null aunque se envíen', async () => {
      const result = await service.create({
        name: 'No nace esperando',
        type: 'task',
        status: 'pending',
        waitingFor: 'Alguien',
        waitingSince: '2026-01-03',
      } as any);

      expect((result as any).waitingFor).toBeNull();
      expect((result as any).waitingSince).toBeNull();
    });
  });

  describe('update() — entrar y salir de waiting', () => {
    it('entra en waiting sin waitingSince: se autocompleta a la fecha de hoy', async () => {
      const activity = baseActivity({ status: ActivityStatus.PENDING });
      mockRepository.findOne.mockResolvedValue(activity);

      const result = await service.update('activity-1', {
        status: 'waiting',
      } as any);

      expect((result as any).status).toEqual('waiting');
      expect((result as any).waitingSince).toEqual(todayDateOnlyString());
    });

    it('entra en waiting con waitingSince explícito: se respeta el valor enviado', async () => {
      const activity = baseActivity({ status: ActivityStatus.PENDING });
      mockRepository.findOne.mockResolvedValue(activity);

      const result = await service.update('activity-1', {
        status: 'waiting',
        waitingSince: '2026-01-03',
      } as any);

      expect((result as any).waitingSince).toEqual('2026-01-03');
    });

    it('sale de waiting hacia otro estado: limpia waitingFor y waitingSince', async () => {
      const activity = baseActivity({
        status: 'waiting' as any,
        waitingFor: 'El proveedor',
        waitingSince: '2026-01-03',
      });
      mockRepository.findOne.mockResolvedValue(activity);

      const result = await service.update('activity-1', {
        status: 'pending',
      } as any);

      expect((result as any).status).toEqual('pending');
      expect((result as any).waitingFor).toBeNull();
      expect((result as any).waitingSince).toBeNull();
    });

    it('datos incoherentes se limpian en silencio: waitingFor enviado con status distinto de waiting no lanza error y queda null', async () => {
      const activity = baseActivity({ status: ActivityStatus.PENDING });
      mockRepository.findOne.mockResolvedValue(activity);

      const result = await service.update('activity-1', {
        status: 'pending',
        waitingFor: 'Este valor debe descartarse',
      } as any);

      expect((result as any).waitingFor).toBeNull();
    });

    it('permanecer en waiting sin tocar el status no reautocompleta waitingSince (no pisa el valor existente)', async () => {
      const activity = baseActivity({
        status: 'waiting' as any,
        waitingFor: 'El proveedor',
        waitingSince: '2026-01-03',
      });
      mockRepository.findOne.mockResolvedValue(activity);

      const result = await service.update('activity-1', {
        name: 'Renombrada sin tocar status',
      } as any);

      expect((result as any).waitingSince).toEqual('2026-01-03');
      expect((result as any).waitingFor).toEqual('El proveedor');
    });
  });

  describe('regresión — completed → waiting (spec-024, spec-028)', () => {
    it('limpia completedAt (spec-028) y fija waitingSince en la misma llamada, sin revertir la cascada de subtareas de spec-024', async () => {
      const activity = baseActivity({
        status: ActivityStatus.COMPLETED,
        completedAt: new Date('2026-01-01T00:00:00Z'),
      } as any);
      mockRepository.findOne.mockResolvedValue(activity);

      const cascadeSpy = jest
        .spyOn(service as any, 'completeSubtaskTree')
        .mockResolvedValue(undefined);

      const result = await service.update('activity-1', {
        status: 'waiting',
        waitingFor: 'El cliente',
      } as any);

      expect((result as any).status).toEqual('waiting');
      expect((result as any).completedAt).toBeNull();
      expect((result as any).waitingSince).toEqual(todayDateOnlyString());
      expect((result as any).waitingFor).toEqual('El cliente');
      // completed → waiting no es una transición HACIA completed: la cascada
      // de spec-024 no debe dispararse en este sentido.
      expect(cascadeSpy).not.toHaveBeenCalled();
    });
  });
});

// spec-033 — Estado `testing`: trabajo hecho, pendiente de probar.
// A diferencia de spec-032, `testing` no tiene campos asociados ni ciclo de
// vida propio: lo único que hay que verificar es que NO dispare lo que
// pertenece a `completed` (cascada de spec-024, `completedAt` de spec-028).
describe('ActivitiesService - `testing` no dispara lo que pertenece a `completed` (spec-033)', () => {
  let service: ActivitiesService;
  let mockRepository: any;
  let mockProjectsService: any;

  beforeEach(async () => {
    mockRepository = {
      create: jest.fn((data: any) => data),
      findOne: jest.fn(),
      save: jest.fn((a: any) => Promise.resolve({ ...a })),
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
      id: 'activity-1',
      name: 'Actividad',
      description: null,
      status: ActivityStatus.PENDING,
      priority: 'medium',
      energy: 'medium',
      isTemplate: false,
      project: null,
      parent: null,
      subtasks: [],
      completedAt: null,
      ...overrides,
    };
  }

  it('pasar a testing NO dispara la cascada de subtareas de spec-024', async () => {
    const activity = baseActivity({ status: ActivityStatus.PENDING });
    mockRepository.findOne.mockResolvedValue(activity);

    const cascadeSpy = jest
      .spyOn(service as any, 'completeSubtaskTree')
      .mockResolvedValue(undefined);

    await service.update('activity-1', {
      status: ActivityStatus.TESTING,
    } as any);

    expect(cascadeSpy).not.toHaveBeenCalled();
  });

  it('pasar a testing NO fija completedAt (spec-028)', async () => {
    const activity = baseActivity({ status: ActivityStatus.PENDING });
    mockRepository.findOne.mockResolvedValue(activity);

    const result = await service.update('activity-1', {
      status: ActivityStatus.TESTING,
    } as any);

    expect((result as any).status).toEqual(ActivityStatus.TESTING);
    expect((result as any).completedAt).toBeNull();
  });

  it('completed → testing limpia completedAt (spec-028) sin revertir la cascada de spec-024', async () => {
    const activity = baseActivity({
      status: ActivityStatus.COMPLETED,
      completedAt: new Date('2026-01-01T00:00:00Z'),
    });
    mockRepository.findOne.mockResolvedValue(activity);

    const cascadeSpy = jest
      .spyOn(service as any, 'completeSubtaskTree')
      .mockResolvedValue(undefined);

    const result = await service.update('activity-1', {
      status: ActivityStatus.TESTING,
    } as any);

    expect((result as any).status).toEqual(ActivityStatus.TESTING);
    expect((result as any).completedAt).toBeNull();
    // completed → testing no es una transición HACIA completed: la cascada
    // de spec-024 no debe dispararse en este sentido.
    expect(cascadeSpy).not.toHaveBeenCalled();
  });

  it('testing → completed SÍ dispara la cascada y fija completedAt — es una transición normal hacia completed', async () => {
    const activity = baseActivity({ status: ActivityStatus.TESTING });
    mockRepository.findOne.mockResolvedValue(activity);

    const cascadeSpy = jest
      .spyOn(service as any, 'completeSubtaskTree')
      .mockResolvedValue(undefined);

    const result = await service.update('activity-1', {
      status: ActivityStatus.COMPLETED,
    } as any);

    expect((result as any).status).toEqual(ActivityStatus.COMPLETED);
    expect((result as any).completedAt).not.toBeNull();
    expect(cascadeSpy).toHaveBeenCalledTimes(1);
    expect(cascadeSpy).toHaveBeenCalledWith('activity-1');
  });
});
