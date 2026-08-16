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
import request from 'supertest';
import { App } from 'supertest/types';
import cookieParser from 'cookie-parser';
import { AppModule } from './../src/app.module';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor';

const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'TestPass123';

describe('spec-024 — Completar subtareas al completar la tarea padre (e2e)', () => {
  let app: INestApplication<App>;
  let authCookies: string[];
  // Activities are deleted in reverse creation order so that leaves
  // (subtasks) are removed before their parents.
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
        name: 'Actividad de prueba spec-024',
        ...overrides,
      })
      .expect(201);
    const activity = response.body.data;
    createdActivityIds.push(activity.id);
    return activity;
  }

  function patchActivity(id: string, body: Record<string, unknown>) {
    return request(app.getHttpServer())
      .patch(`/api/v1/activities/${id}`)
      .set('Cookie', authCookies)
      .send(body);
  }

  async function getActivity(id: string) {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/activities/${id}`)
      .set('Cookie', authCookies)
      .expect(200);
    return response.body.data;
  }

  describe('PATCH /api/v1/activities/:id — propagación a subtareas', () => {
    it('TC-024-01 (AC-1): completing the parent completes its direct subtasks', async () => {
      const parent = await createActivity({ name: 'Padre AC1' });
      const child = await createActivity({
        name: 'Hija AC1',
        parentId: parent.id,
      });

      await patchActivity(parent.id, { status: 'completed' }).expect(200);

      const refreshedChild = await getActivity(child.id);
      expect(refreshedChild.status).toEqual('completed');
    });

    it('TC-024-02 (AC-2): propagation is recursive across multiple levels', async () => {
      const grandparent = await createActivity({ name: 'Abuelo AC2' });
      const parent = await createActivity({
        name: 'Padre AC2',
        parentId: grandparent.id,
      });
      const child = await createActivity({
        name: 'Nieto AC2',
        parentId: parent.id,
      });

      await patchActivity(grandparent.id, { status: 'completed' }).expect(200);

      const refreshedParent = await getActivity(parent.id);
      const refreshedChild = await getActivity(child.id);
      expect(refreshedParent.status).toEqual('completed');
      expect(refreshedChild.status).toEqual('completed');
    });

    it('TC-024-03 (AC-3): a subtask in "cancelled" is also dragged to "completed"', async () => {
      const parent = await createActivity({ name: 'Padre AC3' });
      const child = await createActivity({
        name: 'Hija cancelada AC3',
        parentId: parent.id,
        status: 'cancelled',
      });
      expect(child.status).toEqual('cancelled');

      await patchActivity(parent.id, { status: 'completed' }).expect(200);

      const refreshedChild = await getActivity(child.id);
      expect(refreshedChild.status).toEqual('completed');
    });

    it('TC-024-04 (AC-4): un-completing the parent does NOT revert already-propagated subtasks', async () => {
      const parent = await createActivity({ name: 'Padre AC4' });
      const child = await createActivity({
        name: 'Hija AC4',
        parentId: parent.id,
      });

      await patchActivity(parent.id, { status: 'completed' }).expect(200);
      let refreshedChild = await getActivity(child.id);
      expect(refreshedChild.status).toEqual('completed');

      await patchActivity(parent.id, { status: 'pending' }).expect(200);

      refreshedChild = await getActivity(child.id);
      expect(refreshedChild.status).toEqual('completed');
    });

    it('TC-024-05 (AC-5): updating the parent without touching its status does not touch subtask statuses', async () => {
      const parent = await createActivity({ name: 'Padre AC5' });
      const child = await createActivity({
        name: 'Hija AC5',
        parentId: parent.id,
        status: 'in_progress',
      });

      await patchActivity(parent.id, { name: 'Padre AC5 renombrado' }).expect(
        200,
      );

      const refreshedChild = await getActivity(child.id);
      expect(refreshedChild.status).toEqual('in_progress');
    });

    it('TC-024-06 (AC-6): re-sending status "completed" on an already-completed parent does not re-propagate to manually reopened subtasks', async () => {
      const parent = await createActivity({ name: 'Padre AC6' });
      const child = await createActivity({
        name: 'Hija AC6',
        parentId: parent.id,
      });

      await patchActivity(parent.id, { status: 'completed' }).expect(200);
      let refreshedChild = await getActivity(child.id);
      expect(refreshedChild.status).toEqual('completed');

      // User manually reopens the subtask after the parent was completed.
      await patchActivity(child.id, { status: 'pending' }).expect(200);
      refreshedChild = await getActivity(child.id);
      expect(refreshedChild.status).toEqual('pending');

      // Re-saving the parent while it was ALREADY completed (no status
      // transition) must not re-trigger the cascade.
      await patchActivity(parent.id, { status: 'completed' }).expect(200);

      refreshedChild = await getActivity(child.id);
      expect(refreshedChild.status).toEqual('pending');
    });

    it('TC-024-07 (AC-7): completing a parent without subtasks works without errors', async () => {
      const lonely = await createActivity({ name: 'Sin subtareas AC7' });

      const response = await patchActivity(lonely.id, {
        status: 'completed',
      }).expect(200);

      expect(response.body.data.status).toEqual('completed');
    });

    it('TC-024-08 (AC-8): the PATCH response keeps returning the updated parent with the same shape as before', async () => {
      const parent = await createActivity({ name: 'Padre AC8' });
      await createActivity({ name: 'Hija AC8', parentId: parent.id });

      const response = await patchActivity(parent.id, {
        status: 'completed',
      }).expect(200);

      const body = response.body;
      expect(body).toHaveProperty('statusCode', 200);
      expect(body).toHaveProperty('message');
      expect(body).toHaveProperty('data');

      const data = body.data;
      expect(data.id).toEqual(parent.id);
      expect(data.status).toEqual('completed');
      expect(data).toHaveProperty('name');
      expect(data).toHaveProperty('subtasks');
      expect(Array.isArray(data.subtasks)).toBe(true);
    });
  });
});
