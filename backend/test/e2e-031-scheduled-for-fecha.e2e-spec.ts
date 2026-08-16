// spec-031 — De `scheduledForToday` (booleano) a `scheduledFor` (fecha).
//
// Redactado en modo test-first (@tester), ANTES de que exista la
// implementación: se espera que TODO este archivo esté en rojo hasta que
// spec-031 se implemente (columna `scheduledFor` en `activities`, migración
// `1787000000004-ReplaceScheduledForTodayWithScheduledForActivities`, nueva
// rama del OR en `findToday()`, y la baja de `scheduledForToday`).
//
// Depende de spec-030 (`deferUntil`) para el caso de interacción — ver
// AC-scheduledFor-05. Mientras spec-030 tampoco esté implementado, ese caso
// además fallará por falta de `deferUntil`; es el comportamiento esperado en
// modo rojo mientras el paquete 027→032 avanza en orden.
//
// Todos los casos con fechas relativas (ayer/hoy/mañana) usan la fecha real
// de ejecución (`new Date()`), igual que se comportaría la aplicación en
// producción.

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

function toDateOnlyString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

describe('spec-031 — scheduledForToday (boolean) → scheduledFor (date) (e2e)', () => {
  let app: INestApplication<App>;
  let authCookies: string[];

  const createdActivityIds: string[] = [];

  const today = new Date();
  const yesterdayStr = toDateOnlyString(addDays(today, -1));
  const todayStr = toDateOnlyString(today);
  const tomorrowStr = toDateOnlyString(addDays(today, 1));

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

  function api() {
    return request(app.getHttpServer());
  }

  async function createActivity(overrides: Record<string, unknown>) {
    const response = await api()
      .post('/api/v1/activities')
      .set('Cookie', authCookies)
      .send({
        name: '[E2E-031] actividad de prueba',
        ...overrides,
      });
    if (response.status === 201 && response.body?.data?.id) {
      createdActivityIds.push(response.body.data.id);
    }
    return response;
  }

  async function getToday(): Promise<Array<{ id: string }>> {
    const response = await api()
      .get('/api/v1/activities/today')
      .query({ limit: 100 })
      .set('Cookie', authCookies)
      .expect(200);
    return response.body.data;
  }

  function idsIn(list: Array<{ id: string }>): string[] {
    return list.map((a) => a.id);
  }

  describe('AC-scheduledFor-01: scheduledFor = hoy, sin dueDate, aparece en /activities/today', () => {
    it('la actividad aparece en la vista Hoy', async () => {
      const createResponse = await createActivity({
        name: '[E2E-031] AC1 — scheduledFor hoy',
        scheduledFor: todayStr,
      });
      expect(createResponse.status).toBe(201);
      expect(createResponse.body.data.scheduledFor).toBe(todayStr);
      // La columna vieja ya no existe en la respuesta.
      expect(createResponse.body.data.scheduledForToday).toBeUndefined();

      const today = await getToday();
      expect(idsIn(today)).toContain(createResponse.body.data.id);
    });
  });

  describe('AC-scheduledFor-02: scheduledFor = mañana no aparece hoy, pero sí cuando esa fecha sea hoy', () => {
    it('no aparece hoy con scheduledFor = mañana', async () => {
      const createResponse = await createActivity({
        name: '[E2E-031] AC2 — scheduledFor mañana',
        scheduledFor: tomorrowStr,
      });
      expect(createResponse.status).toBe(201);

      const todayList = await getToday();
      expect(idsIn(todayList)).not.toContain(createResponse.body.data.id);
    });

    it('sí aparece hoy cuando se reprograma a scheduledFor = hoy', async () => {
      const createResponse = await createActivity({
        name: '[E2E-031] AC2b — reprogramada a hoy',
        scheduledFor: tomorrowStr,
      });
      expect(createResponse.status).toBe(201);
      const id = createResponse.body.data.id;

      await api()
        .patch(`/api/v1/activities/${id}`)
        .set('Cookie', authCookies)
        .send({ scheduledFor: todayStr })
        .expect(200);

      const todayList = await getToday();
      expect(idsIn(todayList)).toContain(id);
    });
  });

  describe('AC-scheduledFor-03: scheduledFor = ayer caduca sola, sin job', () => {
    it('no aparece en Hoy con scheduledFor = ayer y sin dueDate de hoy', async () => {
      const createResponse = await createActivity({
        name: '[E2E-031] AC3 — scheduledFor ayer',
        scheduledFor: yesterdayStr,
      });
      expect(createResponse.status).toBe(201);

      const todayList = await getToday();
      expect(idsIn(todayList)).not.toContain(createResponse.body.data.id);
    });
  });

  describe('AC-scheduledFor-04: scheduledFor = hoy + status completed no aparece en Hoy', () => {
    it('una actividad completada no aparece aunque scheduledFor sea hoy', async () => {
      const createResponse = await createActivity({
        name: '[E2E-031] AC4 — completada, scheduledFor hoy',
        scheduledFor: todayStr,
        status: 'completed',
      });
      expect(createResponse.status).toBe(201);

      const todayList = await getToday();
      expect(idsIn(todayList)).not.toContain(createResponse.body.data.id);
    });
  });

  describe('AC-scheduledFor-05: scheduledFor = hoy + deferUntil futura no aparece (spec-030 manda)', () => {
    it('una actividad diferida a futuro no aparece en Hoy aunque scheduledFor sea hoy', async () => {
      const createResponse = await createActivity({
        name: '[E2E-031] AC5 — deferUntil futura, scheduledFor hoy',
        scheduledFor: todayStr,
        deferUntil: tomorrowStr,
      });
      expect(createResponse.status).toBe(201);
      expect(createResponse.body.data.deferUntil).toBe(tomorrowStr);

      const todayList = await getToday();
      expect(idsIn(todayList)).not.toContain(createResponse.body.data.id);
    });
  });

  describe('AC-scheduledFor-06: PATCH scheduledFor: null desprograma la actividad', () => {
    it('poner scheduledFor en null la quita de Hoy', async () => {
      const createResponse = await createActivity({
        name: '[E2E-031] AC6 — desprogramar',
        scheduledFor: todayStr,
      });
      const id = createResponse.body.data.id;

      let todayList = await getToday();
      expect(idsIn(todayList)).toContain(id);

      const patchResponse = await api()
        .patch(`/api/v1/activities/${id}`)
        .set('Cookie', authCookies)
        .send({ scheduledFor: null })
        .expect(200);
      expect(patchResponse.body.data.scheduledFor).toBeNull();

      todayList = await getToday();
      expect(idsIn(todayList)).not.toContain(id);
    });
  });

  describe('AC-scheduledFor-07: la columna scheduledForToday ya no existe — enviarla responde 400', () => {
    // Corregido: el criterio original asumía descarte silencioso, pero
    // main.ts fija forbidNonWhitelisted: true junto con whitelist: true —
    // una propiedad no declarada en el DTO rechaza toda la petición con 400,
    // en vez de descartarse (mismo criterio ya corregido en spec-027/030;
    // ver "Criterios de aceptación" del spec-031).
    it('POST con scheduledForToday (nombre viejo) responde 400', async () => {
      const createResponse = await createActivity({
        name: '[E2E-031] AC7 — nombre viejo scheduledForToday',
        scheduledForToday: true,
      });
      expect(createResponse.status).toBe(400);
    });

    it('PATCH con scheduledForToday (nombre viejo) responde 400 y no tiene efecto', async () => {
      const createResponse = await createActivity({
        name: '[E2E-031] AC7b — PATCH con nombre viejo',
      });
      const id = createResponse.body.data.id;

      await api()
        .patch(`/api/v1/activities/${id}`)
        .set('Cookie', authCookies)
        .send({ scheduledForToday: true })
        .expect(400);

      const todayList = await getToday();
      expect(idsIn(todayList)).not.toContain(id);
    });
  });

  describe('AC-scheduledFor-08: cambiar scheduledFor no modifica postponementCount (spec-028)', () => {
    it('postponementCount permanece igual tras reprogramar scheduledFor varias veces', async () => {
      const createResponse = await createActivity({
        name: '[E2E-031] AC8 — no incrementa postponementCount',
        scheduledFor: todayStr,
      });
      const id = createResponse.body.data.id;
      const initialCount = createResponse.body.data.postponementCount ?? 0;

      await api()
        .patch(`/api/v1/activities/${id}`)
        .set('Cookie', authCookies)
        .send({ scheduledFor: tomorrowStr })
        .expect(200);

      const patchResponse = await api()
        .patch(`/api/v1/activities/${id}`)
        .set('Cookie', authCookies)
        .send({ scheduledFor: todayStr })
        .expect(200);

      expect(patchResponse.body.data.postponementCount ?? 0).toBe(initialCount);
    });
  });

  describe('AC-scheduledFor-09: MCP — update_activity con scheduledFor futuro', () => {
    it('la actividad no aparece en get_today_activities (vía REST get /today) hasta esa fecha', async () => {
      // Se valida el mismo contrato que expone la tool `update_activity` del
      // MCP (mismo servicio subyacente, ver activities.service.ts). El MCP
      // en sí se cubre con las pruebas manuales TC-MCP-031-xx.
      const createResponse = await createActivity({
        name: '[E2E-031] AC9 — MCP scheduledFor futuro',
        scheduledFor: tomorrowStr,
      });
      const id = createResponse.body.data.id;

      const todayList = await getToday();
      expect(idsIn(todayList)).not.toContain(id);
    });
  });
});
