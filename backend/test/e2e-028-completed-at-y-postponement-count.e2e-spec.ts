// spec-028 — Trazabilidad de la actividad: `completedAt` y `postponementCount`.
//
// Redactado en modo test-first (@tester), ANTES de que exista la
// implementación: se espera que TODO este archivo esté en rojo hasta que
// spec-028 se implemente (columnas `completedAt`/`postponementCount` en
// `Activity`, lógica en `ActivitiesService.update()`/`create()`/
// `completeSubtaskTree()`, migración `1787000000001-...`).
//
// Nota sobre `dueDate` y spec-027: spec-028 depende de spec-027 (limpieza del
// modelo), que en el momento de escribir estas pruebas TODAVÍA NO está
// implementado — `sanitizeByType()` sigue truncando `dueDate` a medianoche
// para `type: 'task'` (default). Para que estas pruebas sean válidas tanto
// antes como después de que spec-027 aterrice (quita ese truncamiento), los
// casos de `postponementCount` comparan `dueDate` a nivel de **día completo**
// (offsets de días, nunca solo de horas dentro del mismo día) y nunca envían
// `type` explícitamente — así no importa si el backend trunca o no.
//
// Nota sobre "ignorado" en completedAt/postponementCount: el spec dice que el
// `ValidationPipe` (whitelist: true) los "descarta" si llegan en el body. La
// configuración real de este proyecto (ver `main.ts` y el resto de e2e-*)
// además fija `forbidNonWhitelisted: true`, lo que hace que un campo no
// declarado en el DTO no se descarte en silencio sino que **rechace la
// petición completa con 400**. Ambos comportamientos cumplen la garantía de
// fondo del criterio ("el cliente no puede fijar el valor"), así que estas
// pruebas verifican el rechazo con 400 — la manifestación real de "ignorado"
// bajo la configuración vigente de este backend. Si `@architect` decidiera
// agregar los campos al DTO como de solo lectura (con otro mecanismo), este
// archivo debe actualizarse junto con la implementación.

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

/** ISO string for "today + offsetDays", at a fixed 10:00 local time so the
 * value is stable and unambiguous regardless of whether the backend truncates
 * `dueDate` to midnight (pre spec-027) or preserves the time (post spec-027).
 */
function isoDateOffset(offsetDays: number): string {
  const d = new Date();
  d.setHours(10, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString();
}

/** Asserts `value` is an actual, parseable timestamp — not `null`, and NOT
 * `undefined` either (which `expect(x).not.toBeNull()` would let through
 * silently, since `undefined !== null`; that gap would make these assertions
 * pass today, before `completedAt` even exists on the entity, defeating the
 * point of a red-first test). */
function expectValidTimestamp(value: unknown): void {
  expect(typeof value).toBe('string');
  expect(value as string).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  expect(Number.isNaN(new Date(value as string).getTime())).toBe(false);
}

describe('spec-028 — completedAt y postponementCount (e2e)', () => {
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

  async function createActivity(overrides: Record<string, unknown> = {}) {
    const response = await api()
      .post('/api/v1/activities')
      .set('Cookie', authCookies)
      .send({
        name: 'Actividad de prueba spec-028',
        ...overrides,
      });
    if (response.status === 201 && response.body?.data?.id) {
      createdActivityIds.push(response.body.data.id);
    }
    return response;
  }

  function patchActivity(id: string, body: Record<string, unknown>) {
    return api()
      .patch(`/api/v1/activities/${id}`)
      .set('Cookie', authCookies)
      .send(body);
  }

  async function getActivity(id: string) {
    const response = await api()
      .get(`/api/v1/activities/${id}`)
      .set('Cookie', authCookies)
      .expect(200);
    return response.body.data;
  }

  // ─── completedAt ────────────────────────────────────────────────────────────

  describe('completedAt', () => {
    it('TC-028-01: PATCH de pending a completed devuelve completedAt con la fecha/hora del cambio', async () => {
      const created = await createActivity({ name: 'AC completedAt 01' });
      expect(created.status).toBe(201);
      expect(created.body.data.completedAt).toBeNull();

      const before = new Date();
      const response = await patchActivity(created.body.data.id, {
        status: 'completed',
      }).expect(200);
      const after = new Date();

      expectValidTimestamp(response.body.data.completedAt);
      const completedAt = new Date(response.body.data.completedAt);
      expect(completedAt.getTime()).toBeGreaterThanOrEqual(
        before.getTime() - 1000,
      );
      expect(completedAt.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
    });

    it('TC-028-02: un segundo PATCH que no toca status conserva el completedAt original', async () => {
      const created = await createActivity({ name: 'AC completedAt 02' });
      const completedResponse = await patchActivity(created.body.data.id, {
        status: 'completed',
      }).expect(200);
      const originalCompletedAt = completedResponse.body.data.completedAt;
      expectValidTimestamp(originalCompletedAt);

      // Second PATCH: touches an unrelated field, not status.
      const renamedResponse = await patchActivity(created.body.data.id, {
        name: 'AC completedAt 02 renombrada',
      }).expect(200);

      expect(renamedResponse.body.data.completedAt).toEqual(
        originalCompletedAt,
      );
    });

    it('TC-028-03: PATCH de completed a pending devuelve completedAt: null', async () => {
      const created = await createActivity({ name: 'AC completedAt 03' });
      const completedResponse = await patchActivity(created.body.data.id, {
        status: 'completed',
      }).expect(200);
      expectValidTimestamp(completedResponse.body.data.completedAt);

      const reopenedResponse = await patchActivity(created.body.data.id, {
        status: 'pending',
      }).expect(200);

      expect(reopenedResponse.body.data.completedAt).toBeNull();
    });

    it('TC-028-04: al completar una tarea padre, todas sus subtareas (a cualquier nivel) quedan completed con completedAt seteado', async () => {
      const grandparent = await createActivity({
        name: 'Abuelo AC completedAt 04',
      });
      const parent = await createActivity({
        name: 'Padre AC completedAt 04',
        parentId: grandparent.body.data.id,
      });
      const child = await createActivity({
        name: 'Nieto AC completedAt 04',
        parentId: parent.body.data.id,
      });

      await patchActivity(grandparent.body.data.id, {
        status: 'completed',
      }).expect(200);

      const refreshedParent = await getActivity(parent.body.data.id);
      const refreshedChild = await getActivity(child.body.data.id);

      expect(refreshedParent.status).toEqual('completed');
      expectValidTimestamp(refreshedParent.completedAt);
      expect(refreshedChild.status).toEqual('completed');
      expectValidTimestamp(refreshedChild.completedAt);
    });

    it('TC-028-05: al reabrir la tarea padre, el padre queda con completedAt: null y las subtareas siguen completed con su completedAt intacto', async () => {
      const parent = await createActivity({ name: 'Padre AC completedAt 05' });
      const child = await createActivity({
        name: 'Hija AC completedAt 05',
        parentId: parent.body.data.id,
      });

      await patchActivity(parent.body.data.id, { status: 'completed' }).expect(
        200,
      );
      const childAfterCascade = await getActivity(child.body.data.id);
      expect(childAfterCascade.status).toEqual('completed');
      expectValidTimestamp(childAfterCascade.completedAt);
      const childCompletedAt = childAfterCascade.completedAt;

      await patchActivity(parent.body.data.id, { status: 'pending' }).expect(
        200,
      );

      const refreshedParent = await getActivity(parent.body.data.id);
      const refreshedChild = await getActivity(child.body.data.id);

      expect(refreshedParent.completedAt).toBeNull();
      expect(refreshedChild.status).toEqual('completed');
      expect(refreshedChild.completedAt).toEqual(childCompletedAt);
    });

    it('TC-028-06: completedAt enviado por el cliente en el body es ignorado (rechazado por el ValidationPipe)', async () => {
      const created = await createActivity({ name: 'AC completedAt 06' });

      const response = await patchActivity(created.body.data.id, {
        status: 'completed',
        completedAt: '2099-01-01T00:00:00.000Z',
      });

      expect(response.status).toBe(400);

      // Confirm the field never took effect: a normal follow-up PATCH (no
      // extraneous field) still computes completedAt server-side, not the
      // bogus 2099 value from the rejected request above.
      const normalResponse = await patchActivity(created.body.data.id, {
        status: 'completed',
      }).expect(200);
      expect(normalResponse.body.data.completedAt).not.toEqual(
        '2099-01-01T00:00:00.000Z',
      );
      expect(
        new Date(normalResponse.body.data.completedAt).getFullYear(),
      ).toBeLessThan(2099);
    });
  });

  // ─── postponementCount ──────────────────────────────────────────────────────

  describe('postponementCount', () => {
    it('TC-028-07: una actividad nueva nace con postponementCount: 0', async () => {
      const created = await createActivity({ name: 'AC postponement 07' });
      expect(created.status).toBe(201);
      expect(created.body.data.postponementCount).toBe(0);
    });

    it('TC-028-08: asignar dueDate a una actividad que no tenía ninguno no incrementa el contador', async () => {
      const created = await createActivity({ name: 'AC postponement 08' });
      expect(created.body.data.dueDate).toBeNull();

      const response = await patchActivity(created.body.data.id, {
        dueDate: isoDateOffset(5),
      }).expect(200);

      expect(response.body.data.postponementCount).toBe(0);
    });

    it('TC-028-09: recibir un dueDate estrictamente posterior incrementa el contador (dos veces seguidas: 1, luego 2)', async () => {
      const created = await createActivity({
        name: 'AC postponement 09',
        dueDate: isoDateOffset(1),
      });
      expect(created.body.data.postponementCount).toBe(0);

      const firstPostponement = await patchActivity(created.body.data.id, {
        dueDate: isoDateOffset(3),
      }).expect(200);
      expect(firstPostponement.body.data.postponementCount).toBe(1);

      const secondPostponement = await patchActivity(created.body.data.id, {
        dueDate: isoDateOffset(6),
      }).expect(200);
      expect(secondPostponement.body.data.postponementCount).toBe(2);
    });

    it('TC-028-10: recibir un dueDate anterior al actual no incrementa el contador', async () => {
      const created = await createActivity({
        name: 'AC postponement 10',
        dueDate: isoDateOffset(10),
      });

      const response = await patchActivity(created.body.data.id, {
        dueDate: isoDateOffset(4),
      }).expect(200);

      expect(response.body.data.postponementCount).toBe(0);
    });

    it('TC-028-11: recibir el mismo dueDate no incrementa el contador', async () => {
      const dueDate = isoDateOffset(7);
      const created = await createActivity({
        name: 'AC postponement 11',
        dueDate,
      });

      const response = await patchActivity(created.body.data.id, {
        dueDate,
      }).expect(200);

      expect(response.body.data.postponementCount).toBe(0);
    });

    it('TC-028-12: borrar el dueDate (null) no incrementa el contador', async () => {
      const created = await createActivity({
        name: 'AC postponement 12',
        dueDate: isoDateOffset(8),
      });

      const response = await patchActivity(created.body.data.id, {
        dueDate: null,
      }).expect(200);

      expect(response.body.data.dueDate).toBeNull();
      expect(response.body.data.postponementCount).toBe(0);
    });

    it('TC-028-13: un PATCH que cambia otro campo (priority) sin tocar dueDate no incrementa el contador', async () => {
      const created = await createActivity({
        name: 'AC postponement 13',
        dueDate: isoDateOffset(2),
        priority: 'low',
      });

      const response = await patchActivity(created.body.data.id, {
        priority: 'high',
      }).expect(200);

      expect(response.body.data.priority).toBe('high');
      expect(response.body.data.postponementCount).toBe(0);
    });

    it('TC-028-14: postponementCount enviado por el cliente en el body es ignorado (rechazado por el ValidationPipe)', async () => {
      const created = await createActivity({ name: 'AC postponement 14' });

      const response = await patchActivity(created.body.data.id, {
        priority: 'high',
        postponementCount: 999,
      });

      expect(response.status).toBe(400);

      const normalResponse = await patchActivity(created.body.data.id, {
        priority: 'high',
      }).expect(200);
      expect(normalResponse.body.data.postponementCount).not.toBe(999);
      expect(normalResponse.body.data.postponementCount).toBe(0);
    });

    it('TC-028-15: ningún comportamiento del sistema cambia al alcanzar 3 postergaciones', async () => {
      const created = await createActivity({
        name: 'AC postponement 15',
        dueDate: isoDateOffset(1),
      });

      let last = created;
      for (const offset of [2, 3, 4]) {
        last = await patchActivity(created.body.data.id, {
          dueDate: isoDateOffset(offset),
        }).expect(200);
      }

      expect(last.body.data.postponementCount).toBe(3);
      // No side effect: status, response shape and further updates behave
      // exactly as with any other value of the counter.
      expect(last.body.data.status).toBe('pending');
      const oneMore = await patchActivity(created.body.data.id, {
        dueDate: isoDateOffset(5),
      }).expect(200);
      expect(oneMore.body.data.postponementCount).toBe(4);
      expect(oneMore.status).toBe(200);
    });
  });
});
