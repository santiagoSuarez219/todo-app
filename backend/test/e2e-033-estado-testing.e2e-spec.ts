// spec-033 — Estado `testing`: trabajo hecho, pendiente de probar.
//
// Redactado en modo test-first, ANTES de que exista la implementación: se
// espera que TODO este archivo esté en rojo hasta que spec-033 se implemente
// (valor nuevo `testing` en el enum `ActivityStatus` y en el tipo
// `activities_status_enum` de Postgres). Hasta entonces, cualquier petición
// que envíe `status: 'testing'` falla con 400 por `@IsEnum`.
//
// A diferencia de spec-032, `testing` NO tiene campos asociados ni ciclo de
// vida propio en el servicio: lo que hay que verificar es justamente que sea
// un estado *activo* más — que no oculte la actividad de ninguna vista y que
// no dispare los mecanismos que solo pertenecen a `completed` (la cascada de
// subtareas de spec-024 y el `completedAt` de spec-028).
//
// Todos los casos anclados a "hoy" usan la fecha real de ejecución
// (`new Date()`), no una fecha fija.

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

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

describe('spec-033 — Estado `testing` (e2e)', () => {
  let app: INestApplication<App>;
  let authCookies: string[];
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
    for (const id of [...createdActivityIds].reverse()) {
      await request(app.getHttpServer())
        .delete(`/api/v1/activities/${id}`)
        .set('Cookie', authCookies);
    }
    if (app) {
      await app.close();
    }
  });

  async function createActivity(
    overrides: Record<string, unknown> = {},
    expectedStatus = 201,
  ) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/activities')
      .set('Cookie', authCookies)
      .send({
        name: 'Actividad de prueba spec-033',
        ...overrides,
      })
      .expect(expectedStatus);
    const activity = response.body.data;
    if (activity?.id) {
      createdActivityIds.push(activity.id);
    }
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

  describe('El enum acepta `testing`', () => {
    it('TC-033-E2E-01: POST /activities con status testing crea la actividad en ese estado', async () => {
      const activity = await createActivity({
        name: 'AC1 nace en testing',
        status: 'testing',
      });

      expect(activity.status).toEqual('testing');
    });

    it('TC-033-E2E-02: PATCH /activities/:id a testing devuelve 200 y persiste el estado', async () => {
      const activity = await createActivity({ name: 'AC2 pasa a testing' });

      const response = await patchActivity(activity.id, {
        status: 'testing',
      }).expect(200);

      expect(response.body.data.status).toEqual('testing');

      const persisted = await getActivity(activity.id);
      expect(persisted.status).toEqual('testing');
    });

    it('TC-033-E2E-03: un status inexistente sigue rechazándose con 400', async () => {
      const activity = await createActivity({ name: 'AC3 status inválido' });

      await patchActivity(activity.id, { status: 'tested' }).expect(400);
    });

    it('TC-033-E2E-04: `testing` no admite campos inventados — el whitelist sigue activo', async () => {
      // `testing` no tiene campos asociados (a diferencia de waitingFor /
      // waitingSince). Un cliente que invente `testingSince` debe recibir 400
      // por forbidNonWhitelisted, no un guardado silencioso.
      //
      // OJO: antes de implementar spec-033 este caso pasa por el motivo
      // equivocado (el 400 lo produce `status: 'testing'`, todavía inválido).
      // Su valor real es después de la implementación, cuando el único motivo
      // posible del 400 sea el campo inventado.
      const activity = await createActivity({ name: 'AC4 campo inventado' });

      await patchActivity(activity.id, {
        status: 'testing',
        testingSince: '2026-08-17',
      }).expect(400);
    });
  });

  describe('`testing` es un estado activo — no desaparece de las vistas', () => {
    it('TC-033-E2E-05: una actividad testing con dueDate de hoy aparece en /activities/today', async () => {
      const todayNoon = new Date();
      todayNoon.setHours(12, 0, 0, 0);
      const activity = await createActivity({
        name: 'AC5 testing hoy',
        status: 'testing',
        dueDate: todayNoon.toISOString(),
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/activities/today')
        .set('Cookie', authCookies)
        .expect(200);

      const ids = response.body.data.map((a: { id: string }) => a.id);
      expect(ids).toContain(activity.id);
    });

    it('TC-033-E2E-06: una actividad testing con dueDate vencido aparece en /activities/overdue', async () => {
      const overdueDate = addDays(new Date(), -10);
      overdueDate.setHours(12, 0, 0, 0);
      const activity = await createActivity({
        name: 'AC6 testing vencida',
        status: 'testing',
        dueDate: overdueDate.toISOString(),
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/activities/overdue')
        .set('Cookie', authCookies)
        .expect(200);

      const ids = response.body.data.map((a: { id: string }) => a.id);
      expect(ids).toContain(activity.id);
    });

    it('TC-033-E2E-07: una actividad testing aparece en el cronograma mensual', async () => {
      const todayNoon = new Date();
      todayNoon.setHours(12, 0, 0, 0);
      const activity = await createActivity({
        name: 'AC7 testing en cronograma',
        status: 'testing',
        dueDate: todayNoon.toISOString(),
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/activities/schedule')
        .query({
          year: todayNoon.getFullYear(),
          month: todayNoon.getMonth() + 1,
        })
        .set('Cookie', authCookies)
        .expect(200);

      const ids = response.body.data.map((a: { id: string }) => a.id);
      expect(ids).toContain(activity.id);
    });

    it('TC-033-E2E-08: GET /activities/status/testing devuelve solo actividades en testing', async () => {
      const testingOne = await createActivity({
        name: 'AC8a testing',
        status: 'testing',
      });
      const inProgressOne = await createActivity({
        name: 'AC8b in_progress',
        status: 'in_progress',
      });
      const completedOne = await createActivity({
        name: 'AC8c completed',
        status: 'completed',
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/activities/status/testing')
        .set('Cookie', authCookies)
        .expect(200);

      const ids = response.body.data.map((a: { id: string }) => a.id);
      expect(ids).toContain(testingOne.id);
      expect(ids).not.toContain(inProgressOne.id);
      expect(ids).not.toContain(completedOne.id);
    });
  });

  describe('Regresión — `testing` no dispara lo que pertenece a `completed`', () => {
    it('TC-033-E2E-09: pasar a testing NO completa las subtareas (la cascada de spec-024 solo reacciona a completed)', async () => {
      const parent = await createActivity({ name: 'AC9 padre' });
      const child = await createActivity({
        name: 'AC9 hija',
        parentId: parent.id,
      });

      const response = await patchActivity(parent.id, {
        status: 'testing',
      }).expect(200);
      expect(response.body.data.status).toEqual('testing');

      const childAfter = await getActivity(child.id);
      expect(childAfter.status).toEqual('pending');
    });

    it('TC-033-E2E-10: pasar a testing NO fija completedAt (spec-028)', async () => {
      const activity = await createActivity({ name: 'AC10 sin completedAt' });

      const response = await patchActivity(activity.id, {
        status: 'testing',
      }).expect(200);

      expect(response.body.data.completedAt).toBeNull();
    });

    it('TC-033-E2E-11: completed → testing limpia completedAt sin revertir la cascada de subtareas', async () => {
      const parent = await createActivity({ name: 'AC11 padre' });
      const child = await createActivity({
        name: 'AC11 hija',
        parentId: parent.id,
      });

      // Completar el padre dispara la cascada de spec-024 sobre la hija y
      // fija completedAt (spec-028) en el padre.
      const completedResponse = await patchActivity(parent.id, {
        status: 'completed',
      }).expect(200);
      expect(completedResponse.body.data.completedAt).not.toBeNull();

      const completedChild = await getActivity(child.id);
      expect(completedChild.status).toEqual('completed');

      // Reabrir hacia testing debe limpiar completedAt (spec-028) …
      const testingResponse = await patchActivity(parent.id, {
        status: 'testing',
      }).expect(200);
      expect(testingResponse.body.data.status).toEqual('testing');
      expect(testingResponse.body.data.completedAt).toBeNull();

      // … pero la cascada es de un solo sentido: la hija sigue completada.
      const childAfter = await getActivity(child.id);
      expect(childAfter.status).toEqual('completed');
    });

    it('TC-033-E2E-12: testing → completed sí completa la cascada y fija completedAt', async () => {
      const parent = await createActivity({
        name: 'AC12 padre en testing',
        status: 'testing',
      });
      const child = await createActivity({
        name: 'AC12 hija',
        parentId: parent.id,
      });

      const response = await patchActivity(parent.id, {
        status: 'completed',
      }).expect(200);

      expect(response.body.data.status).toEqual('completed');
      expect(response.body.data.completedAt).not.toBeNull();

      const childAfter = await getActivity(child.id);
      expect(childAfter.status).toEqual('completed');
    });
  });

  describe('Coexistencia con los estados existentes', () => {
    it('TC-033-E2E-13: los seis estados previos siguen aceptándose sin cambios', async () => {
      const previousStatuses = [
        'pending',
        'in_progress',
        'completed',
        'cancelled',
        'on_hold',
        'waiting',
      ];

      for (const status of previousStatuses) {
        const activity = await createActivity({
          name: `AC13 ${status}`,
          status,
        });
        expect(activity.status).toEqual(status);
      }
    });

    it('TC-033-E2E-14: waiting → testing limpia waitingFor y waitingSince (spec-032)', async () => {
      const activity = await createActivity({
        name: 'AC14 waiting a testing',
        status: 'waiting',
        waitingFor: 'El revisor',
      });
      expect(activity.waitingSince).not.toBeNull();

      const response = await patchActivity(activity.id, {
        status: 'testing',
      }).expect(200);

      expect(response.body.data.status).toEqual('testing');
      expect(response.body.data.waitingFor).toBeNull();
      expect(response.body.data.waitingSince).toBeNull();
    });
  });
});
