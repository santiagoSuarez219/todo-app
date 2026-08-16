// spec-029 — Horizonte de proyecto (`horizon`).
//
// Redactado en modo test-first (@tester), ANTES de que exista la
// implementación: se espera que TODO este archivo esté en rojo hasta que
// spec-029 se implemente (enum `ProjectHorizon`, columna `horizon` en
// `projects` NOT NULL default 'next', validación `@IsEnum` en
// `CreateProjectDto`, migración `AddHorizonToProjects`).
//
// Este spec es el más simple del paquete "Actividades — modelo de capas"
// (027→032): agrega un único campo enum a `Project`, sin lógica de negocio
// nueva (`projects.service.ts` sigue usando `Object.assign`/`create`).
//
// La fase de MCP (create_project/update_project con `horizon`) se valida
// manualmente en `docs/testing/test-029-horizonte-de-proyecto.md`
// (`TC-MCP-029-xxx`), siguiendo el mismo criterio que spec-026: los e2e
// automáticos de este paquete no golpean `/mcp` directamente.

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

const ALL_HORIZONS = ['now', 'next', 'later', 'someday'] as const;

describe('spec-029 — Horizonte de proyecto: horizon (e2e)', () => {
  let app: INestApplication<App>;
  let authCookies: string[];

  const createdProjectIds: string[] = [];
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
    // Activities before projects (activities.project has onDelete: CASCADE,
    // but we clean up explicitly and in reverse creation order anyway).
    for (const id of [...createdActivityIds].reverse()) {
      await request(app.getHttpServer())
        .delete(`/api/v1/activities/${id}`)
        .set('Cookie', authCookies);
    }
    for (const id of [...createdProjectIds].reverse()) {
      await request(app.getHttpServer())
        .delete(`/api/v1/projects/${id}`)
        .set('Cookie', authCookies);
    }
    if (app) {
      await app.close();
    }
  });

  function api() {
    return request(app.getHttpServer());
  }

  async function createProject(overrides: Record<string, unknown> = {}) {
    const response = await api()
      .post('/api/v1/projects')
      .set('Cookie', authCookies)
      .send({
        name: '[E2E-029] Proyecto de prueba',
        startDate: '2026-01-01',
        ...overrides,
      });
    if (response.status === 201 && response.body?.data?.id) {
      createdProjectIds.push(response.body.data.id);
    }
    return response;
  }

  describe('POST /api/v1/projects — default y valores válidos', () => {
    it('AC-1: sin horizon en el body, el proyecto se crea con horizon "next"', async () => {
      const response = await createProject({
        name: '[E2E-029] AC1 — default next',
      });

      expect(response.status).toBe(201);
      expect(response.body.data.horizon).toBe('next');
    });

    it.each(ALL_HORIZONS)(
      'AC-2: con horizon "%s" lo persiste tal cual',
      async (horizon) => {
        const response = await createProject({
          name: `[E2E-029] AC2 — horizon ${horizon}`,
          horizon,
        });

        expect(response.status).toBe(201);
        expect(response.body.data.horizon).toBe(horizon);
      },
    );
  });

  describe('POST /api/v1/projects — validación', () => {
    it('AC-3: horizon con un valor inválido ("urgente") responde 400 y no crea el proyecto', async () => {
      const response = await api()
        .post('/api/v1/projects')
        .set('Cookie', authCookies)
        .send({
          name: '[E2E-029] AC3 — horizon inválido',
          startDate: '2026-01-01',
          horizon: 'urgente',
        });

      expect(response.status).toBe(400);

      const listResponse = await api()
        .get('/api/v1/projects')
        .set('Cookie', authCookies)
        .expect(200);
      const found = (listResponse.body.data as Array<{ name: string }>).find(
        (p) => p.name === '[E2E-029] AC3 — horizon inválido',
      );
      expect(found).toBeUndefined();
    });
  });

  describe('PATCH /api/v1/projects/:id — movimiento entre horizontes', () => {
    it('AC-4: puede moverse por los cuatro horizontes, uno a la vez', async () => {
      const createResponse = await createProject({
        name: '[E2E-029] AC4 — movimiento entre horizontes',
        horizon: 'next',
      });
      const projectId = createResponse.body.data.id;

      for (const horizon of ['now', 'later', 'someday', 'next']) {
        const patchResponse = await api()
          .patch(`/api/v1/projects/${projectId}`)
          .set('Cookie', authCookies)
          .send({ horizon })
          .expect(200);
        expect(patchResponse.body.data.horizon).toBe(horizon);

        const getResponse = await api()
          .get(`/api/v1/projects/${projectId}`)
          .set('Cookie', authCookies)
          .expect(200);
        expect(getResponse.body.data.horizon).toBe(horizon);
      }
    });

    it('rechaza un horizon inválido en PATCH sin modificar el valor actual', async () => {
      const createResponse = await createProject({
        name: '[E2E-029] AC4b — PATCH con horizon inválido',
        horizon: 'later',
      });
      const projectId = createResponse.body.data.id;

      await api()
        .patch(`/api/v1/projects/${projectId}`)
        .set('Cookie', authCookies)
        .send({ horizon: 'urgente' })
        .expect(400);

      const getResponse = await api()
        .get(`/api/v1/projects/${projectId}`)
        .set('Cookie', authCookies)
        .expect(200);
      expect(getResponse.body.data.horizon).toBe('later');
    });
  });

  describe('Independencia entre horizon y status (AC-5)', () => {
    it('un proyecto puede quedar status "paused" + horizon "now" sin error ni advertencia', async () => {
      const createResponse = await createProject({
        name: '[E2E-029] AC5 — paused + now',
        status: 'paused',
        horizon: 'now',
      });

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.data.status).toBe('paused');
      expect(createResponse.body.data.horizon).toBe('now');
    });

    it('cambiar status vía PATCH no afecta horizon, y viceversa', async () => {
      const createResponse = await createProject({
        name: '[E2E-029] AC5b — cambios independientes',
        status: 'active',
        horizon: 'later',
      });
      const projectId = createResponse.body.data.id;

      const patchStatus = await api()
        .patch(`/api/v1/projects/${projectId}`)
        .set('Cookie', authCookies)
        .send({ status: 'completed' })
        .expect(200);
      expect(patchStatus.body.data.status).toBe('completed');
      expect(patchStatus.body.data.horizon).toBe('later');

      const patchHorizon = await api()
        .patch(`/api/v1/projects/${projectId}`)
        .set('Cookie', authCookies)
        .send({ horizon: 'someday' })
        .expect(200);
      expect(patchHorizon.body.data.status).toBe('completed');
      expect(patchHorizon.body.data.horizon).toBe('someday');
    });
  });

  describe('GET /api/v1/projects — exposición del campo (AC-6, AC-7)', () => {
    it('AC-6: GET /projects (lista) y GET /projects/:id devuelven horizon en cada proyecto', async () => {
      await createProject({
        name: '[E2E-029] AC6 — visible en GET',
        horizon: 'now',
      });

      const listResponse = await api()
        .get('/api/v1/projects')
        .set('Cookie', authCookies)
        .expect(200);
      const projects = listResponse.body.data as Array<{
        name: string;
        horizon?: string;
      }>;
      expect(projects.length).toBeGreaterThan(0);
      for (const project of projects) {
        expect(project.horizon).toBeDefined();
        expect(ALL_HORIZONS).toContain(project.horizon);
      }

      const created = projects.find(
        (p) => p.name === '[E2E-029] AC6 — visible en GET',
      );
      expect(created?.horizon).toBe('now');
    });

    it(
      'AC-7: todo proyecto ya existente (creado sin especificar horizon, como antes de la migración) ' +
        'expone horizon "next" — comportamiento estructural del NOT NULL + DEFAULT de la migración ' +
        '(el backfill sobre filas reales previas a la migración se verifica en despliegue, ' +
        'ver TC-029 correspondiente en docs/testing/, mismo criterio que TC-026-016)',
      async () => {
        const response = await createProject({
          name: '[E2E-029] AC7 — proyecto sin horizon explícito',
        });

        expect(response.status).toBe(201);
        expect(response.body.data.horizon).toBe('next');
      },
    );
  });

  describe('Ausencia de bloqueos por concentración en "now" (AC-8, AC-9)', () => {
    it('AC-8: varios proyectos pueden estar en horizon "now" simultáneamente, sin error', async () => {
      const responses = await Promise.all([
        createProject({ name: '[E2E-029] AC8 — now #1', horizon: 'now' }),
        createProject({ name: '[E2E-029] AC8 — now #2', horizon: 'now' }),
        createProject({ name: '[E2E-029] AC8 — now #3', horizon: 'now' }),
      ]);

      for (const response of responses) {
        expect(response.status).toBe(201);
        expect(response.body.data.horizon).toBe('now');
      }

      const listResponse = await api()
        .get('/api/v1/projects')
        .set('Cookie', authCookies)
        .expect(200);
      const nowProjects = (
        listResponse.body.data as Array<{ name: string; horizon: string }>
      ).filter(
        (p) => p.horizon === 'now' && p.name.startsWith('[E2E-029] AC8 — now'),
      );
      expect(nowProjects.length).toBe(3);
    });

    it('AC-9: varias actividades in_progress bajo el mismo proyecto no se bloquean por horizon', async () => {
      const projectResponse = await createProject({
        name: '[E2E-029] AC9 — proyecto con varias in_progress',
        horizon: 'now',
      });
      const projectId = projectResponse.body.data.id;

      const activityPayloads = [
        {
          name: '[E2E-029] AC9 — actividad 1',
          projectId,
          status: 'in_progress',
        },
        {
          name: '[E2E-029] AC9 — actividad 2',
          projectId,
          status: 'in_progress',
        },
        {
          name: '[E2E-029] AC9 — actividad 3',
          projectId,
          status: 'in_progress',
        },
      ];

      for (const payload of activityPayloads) {
        const response = await api()
          .post('/api/v1/activities')
          .set('Cookie', authCookies)
          .send(payload);
        expect(response.status).toBe(201);
        expect(response.body.data.status).toBe('in_progress');
        createdActivityIds.push(response.body.data.id);
      }
    });
  });
});
