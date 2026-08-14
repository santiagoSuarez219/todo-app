// Setup environment BEFORE importing AppModule
const setupTestEnv = () => {
  process.env.NODE_ENV = 'test';
  process.env.AUTH_EMAIL = 'test@example.com';
  process.env.AUTH_PASSWORD_HASH =
    '$2b$10$/74fvSxncNTtCHUFGAks.OsSLlwUAWVRuCkfE0sqK9wJUz6ThvIoe';
  process.env.JWT_SECRET = 'test-jwt-secret-min-32-chars-length-required-here';
  process.env.JWT_EXPIRES_IN = '30d';
  process.env.MCP_API_KEY = 'test-mcp-api-key-12345';
  process.env.DB_HOST = 'localhost';
  process.env.DB_PORT = '5433';
  process.env.DB_NAME = 'todo_db';
  process.env.DB_USER = 'todo_user';
  process.env.DB_PASSWORD = 'todo_password';
  process.env.FRONTEND_URL = 'http://localhost:5173';
};

setupTestEnv();

import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import cookieParser from 'cookie-parser';
import { AppModule } from './../src/app.module';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor';
import { Activity } from './../src/activities/entities/activity.entity';
import { ActivityType } from './../src/common/enums/activity-type.enum';
import { ActivityStatus } from './../src/common/enums/activity-status.enum';

const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'TestPass123';

describe('spec-025 — Cronograma: GET /activities/schedule (e2e)', () => {
  let app: INestApplication<App>;
  let authCookies: string[];
  let activityRepository: Repository<Activity>;
  // Activities are deleted in reverse creation order so that leaves
  // (subtasks / instances) are removed before their parents/templates.
  const createdActivityIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    const API_PREFIX = 'api/v1';
    app.setGlobalPrefix(API_PREFIX, {
      exclude: [
        { path: 'mcp', method: RequestMethod.POST },
        { path: 'mcp', method: RequestMethod.GET },
        { path: 'mcp', method: RequestMethod.DELETE },
      ],
    });

    app.use(cookieParser());
    app.enableCors({ origin: 'http://localhost:5173', credentials: true });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor());

    await app.init();

    activityRepository = moduleFixture.get<Repository<Activity>>(
      getRepositoryToken(Activity),
    );

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
      .expect(200);
    authCookies = loginResponse.headers['set-cookie'];
  });

  afterAll(async () => {
    // Clean up every resource created during this suite, leaves first.
    for (const id of [...createdActivityIds].reverse()) {
      await request(app.getHttpServer())
        .delete(`/api/v1/activities/${id}`)
        .set('Cookie', authCookies);
    }
    if (app) {
      await app.close();
    }
  });

  async function createActivity(overrides: Record<string, unknown> = {}) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/activities')
      .set('Cookie', authCookies)
      .send({
        name: 'Actividad de prueba spec-025',
        type: 'task',
        ...overrides,
      })
      .expect(201);
    const activity = response.body.data;
    createdActivityIds.push(activity.id);
    return activity;
  }

  // spec-025's endpoint locates activities by COALESCE(dueDate, instanceDate).
  // `instanceDate` is only ever written by the recurrence cron
  // (`buildInstanceFromTemplate()`), which is not reachable from any public
  // endpoint. To build that precondition for AC-3 without touching the
  // database with raw SQL, this helper goes through the same TypeORM
  // repository the application itself injects via NestJS DI — the same
  // write path the cron uses, not a bypass of it.
  async function createInstanceOnlyActivity(overrides: Record<string, unknown> = {}) {
    const saved = await activityRepository.save(
      activityRepository.create({
        name: 'Instancia de tarea recurrente spec-025',
        type: ActivityType.TASK,
        status: ActivityStatus.PENDING,
        isTemplate: false,
        isRecurring: false,
        dueDate: null,
        ...overrides,
      }),
    );
    createdActivityIds.push(saved.id);
    return saved;
  }

  function getSchedule(year: unknown, month: unknown) {
    return request(app.getHttpServer())
      .get('/api/v1/activities/schedule')
      .query({ year, month })
      .set('Cookie', authCookies);
  }

  describe('GET /api/v1/activities/schedule', () => {
    it('TC-025-e2e-01 (AC-1): only returns top-level, non-template activities — excludes subtasks and recurrence templates', async () => {
      // year=2031, month=3 → visible grid: 2031-02-24 → 2031-04-06
      const topLevel = await createActivity({
        name: 'AC1 — nivel superior',
        dueDate: '2031-03-15T12:00:00.000Z',
      });

      const parentForSubtask = await createActivity({
        name: 'AC1 — padre de subtarea (sin fecha)',
      });
      const subtask = await createActivity({
        name: 'AC1 — subtarea con fecha propia',
        dueDate: '2031-03-16T12:00:00.000Z',
        parentId: parentForSubtask.id,
      });

      const template = await createActivity({
        name: 'AC1 — plantilla recurrente',
        dueDate: '2031-03-17T12:00:00.000Z',
        isRecurring: true,
        recurrenceFrequency: 'daily',
      });
      expect(template.isTemplate).toBe(true);

      const response = await getSchedule(2031, 3).expect(200);
      const ids: string[] = response.body.data.map((a: Activity) => a.id);

      expect(ids).toContain(topLevel.id);
      expect(ids).not.toContain(subtask.id);
      expect(ids).not.toContain(template.id);
    });

    it('TC-025-e2e-02 (AC-2): includes activities within the visible grid range (month + Mon–Sun fill) and excludes the ones outside it', async () => {
      // year=2032, month=7 → visible grid: 2032-06-28 → 2032-08-01
      const inMonth = await createActivity({
        name: 'AC2 — dentro del mes objetivo',
        dueDate: '2032-07-15T12:00:00.000Z',
      });
      const gridFillBefore = await createActivity({
        name: 'AC2 — relleno de grilla, mes anterior',
        dueDate: '2032-06-29T12:00:00.000Z',
      });
      const gridFillAfter = await createActivity({
        name: 'AC2 — relleno de grilla, mes siguiente',
        dueDate: '2032-08-01T12:00:00.000Z',
      });
      const outsideBefore = await createActivity({
        name: 'AC2 — antes del inicio de la grilla',
        dueDate: '2032-06-20T12:00:00.000Z',
      });
      const outsideAfter = await createActivity({
        name: 'AC2 — después del fin de la grilla',
        dueDate: '2032-08-05T12:00:00.000Z',
      });

      const response = await getSchedule(2032, 7).expect(200);
      const ids: string[] = response.body.data.map((a: Activity) => a.id);

      expect(ids).toContain(inMonth.id);
      expect(ids).toContain(gridFillBefore.id);
      expect(ids).toContain(gridFillAfter.id);
      expect(ids).not.toContain(outsideBefore.id);
      expect(ids).not.toContain(outsideAfter.id);
    });

    it('TC-025-e2e-03 (AC-3): includes activities without dueDate that have an instanceDate within range (recurring task instances)', async () => {
      // year=2033, month=2 → visible grid: 2033-01-31 → 2033-03-06
      const instanceOnly = await createInstanceOnlyActivity({
        name: 'AC3 — instancia de tarea recurrente sin dueDate',
        instanceDate: '2033-02-10',
      });
      expect(instanceOnly.dueDate).toBeNull();

      const response = await getSchedule(2033, 2).expect(200);
      const ids: string[] = response.body.data.map((a: Activity) => a.id);

      expect(ids).toContain(instanceOnly.id);
    });

    it('TC-025-e2e-03b (AC-3, regression): includes instanceDate exactly on the grid boundaries, excludes it one day outside them', async () => {
      // Bug found in code review: COALESCE(dueDate, instanceDate) promoted
      // the `date` column to timestamptz using the DB session timezone,
      // excluding instances landing on the grid's first visible day and
      // including ones a day past its last visible day. Same grid as
      // TC-025-e2e-03: 2033-01-31 (start) → 2033-03-06 (end).
      const onStart = await createInstanceOnlyActivity({
        name: 'AC3b — instancia en el primer día visible de la grilla',
        instanceDate: '2033-01-31',
      });
      const onEnd = await createInstanceOnlyActivity({
        name: 'AC3b — instancia en el último día visible de la grilla',
        instanceDate: '2033-03-06',
      });
      const beforeStart = await createInstanceOnlyActivity({
        name: 'AC3b — instancia un día antes del inicio de la grilla',
        instanceDate: '2033-01-30',
      });
      const afterEnd = await createInstanceOnlyActivity({
        name: 'AC3b — instancia un día después del fin de la grilla',
        instanceDate: '2033-03-07',
      });

      const response = await getSchedule(2033, 2).expect(200);
      const ids: string[] = response.body.data.map((a: Activity) => a.id);

      expect(ids).toContain(onStart.id);
      expect(ids).toContain(onEnd.id);
      expect(ids).not.toContain(beforeStart.id);
      expect(ids).not.toContain(afterEnd.id);
    });

    it('TC-025-e2e-04 (AC-4): excludes activities with neither dueDate nor instanceDate (backlog)', async () => {
      // year=2034, month=11 — no date fields set at all.
      const backlog = await createActivity({
        name: 'AC4 — backlog sin fecha',
      });
      expect(backlog.dueDate).toBeNull();

      const response = await getSchedule(2034, 11).expect(200);
      const ids: string[] = response.body.data.map((a: Activity) => a.id);

      expect(ids).not.toContain(backlog.id);
    });

    it('TC-025-e2e-05 (AC-5): includes completed activities within range, unlike Today/Week/Overdue', async () => {
      // year=2035, month=9 → visible grid: 2035-08-27 → 2035-09-30
      const completed = await createActivity({
        name: 'AC5 — actividad completada',
        dueDate: '2035-09-10T12:00:00.000Z',
        status: 'completed',
      });

      const response = await getSchedule(2035, 9).expect(200);
      const found = response.body.data.find(
        (a: Activity) => a.id === completed.id,
      );

      expect(found).toBeDefined();
      expect(found.status).toEqual('completed');
    });

    it('TC-025-e2e-06 (AC-6): rejects out-of-range or missing year/month with 400', async () => {
      await getSchedule(1999, 6).expect(400);
      await getSchedule(2101, 6).expect(400);
      await getSchedule(2030, 0).expect(400);
      await getSchedule(2030, 13).expect(400);
      await getSchedule(undefined, 6).expect(400);
      await getSchedule(2030, undefined).expect(400);
    });
  });
});
