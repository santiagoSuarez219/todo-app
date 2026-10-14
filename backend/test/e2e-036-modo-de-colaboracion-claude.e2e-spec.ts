// spec-036 — Modo de colaboración con Claude: campo `mode` en actividades.
//
// Redactado en modo test-first (@tester), ANTES de la implementación: se
// espera que este archivo esté en rojo hasta que spec-036 se implemente
// (enum ActivityMode, columna `mode`, DTOs, propagación a instancias,
// `GET /activities/mode/:mode`, filtro `?mode=` en listado/summary, `byMode`
// y las tools MCP correspondientes).
//
// Aislamiento: cada bloque crea su propio proyecto `[E2E-036]` y acota toda
// consulta de lista/summary por `projectId` (o por `status`), para no
// interferir con otras suites corriendo en paralelo (lección de spec-034).
// Todo lo creado se elimina en `afterAll`.
//
// Las instancias recurrentes se generan vía
// `ActivitiesService.generateInstanceForDate()` (no se espera al cron),
// igual que e2e-030.

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
import { ActivitiesService } from './../src/activities/activities.service';

const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'TestPass123';
const TEST_MCP_API_KEY = 'test-mcp-api-key-12345';

/** `YYYY-MM-DD` local calendar date offset from today (columna `date`). */
function dateOnly(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local noon `offsetDays` from today: its UTC calendar date equals the local
 * date in any realistic timezone, so `generateInstanceForDate()` (which uses
 * `toISOString()`) stores the intended `instanceDate`. */
function localNoon(offsetDays: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(12, 0, 0, 0);
  return d;
}

/** Parses a StreamableHTTP/SSE body (`event: message\ndata: {...}`). */
function parseMcpSse(text: string): any {
  const line = text.split('\n').find((l) => l.startsWith('data: '));
  if (!line) throw new Error(`No SSE data line found in MCP response: ${text}`);
  return JSON.parse(line.slice('data: '.length));
}

function parseToolResult(rpcResponse: any): any {
  const text = rpcResponse.result?.content?.[0]?.text;
  if (text === undefined) return rpcResponse.result;
  return JSON.parse(text);
}

describe('spec-036 — Modo de colaboración con Claude: mode (e2e)', () => {
  let app: INestApplication<App>;
  let authCookies: string[];
  let activitiesService: ActivitiesService;
  const createdActivityIds: string[] = [];
  const createdProjectIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1', {
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

    activitiesService = moduleFixture.get<ActivitiesService>(ActivitiesService);

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
      .expect(200);
    authCookies = loginResponse.headers['set-cookie'];
  });

  afterAll(async () => {
    // Reverse creation order: leaves (subtasks/instances) before parents.
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

  async function createProject(name = '[E2E-036] Proyecto de prueba') {
    const response = await api()
      .post('/api/v1/projects')
      .set('Cookie', authCookies)
      .send({ name, startDate: '2026-01-01' })
      .expect(201);
    createdProjectIds.push(response.body.data.id);
    return response.body.data;
  }

  async function createActivity(overrides: Record<string, unknown> = {}) {
    const response = await api()
      .post('/api/v1/activities')
      .set('Cookie', authCookies)
      .send({ name: '[E2E-036] Actividad de prueba', ...overrides })
      .expect(201);
    createdActivityIds.push(response.body.data.id);
    return response.body.data;
  }

  function idsOf(list: Array<{ id: string }>): string[] {
    return list.map((a) => a.id);
  }

  /** The 400 must come from enum validation on `mode`, not from the generic
   * `forbidNonWhitelisted` rejection that applies today because the property
   * does not exist yet (which would make the invalid-value cases pass
   * vacuously before the implementation). */
  function expectModeEnumRejection(res: request.Response) {
    expect(res.status).toBe(400);
    const message = JSON.stringify(res.body.message);
    expect(message).toMatch(/mode/);
    expect(message).not.toMatch(/should not exist/);
  }

  // ─── Crear / actualizar mode ──────────────────────────────────────────────

  describe('POST/PATCH /api/v1/activities — mode', () => {
    let projectId: string;

    beforeAll(async () => {
      projectId = (await createProject()).id;
    });

    it.each(['autonomous', 'cowork_async', 'cowork'])(
      'E2E-01: POST con mode=%s persiste y lo devuelve (también en GET /:id)',
      async (mode) => {
        const created = await createActivity({ projectId, mode });
        expect(created.mode).toBe(mode);

        const fetched = await api()
          .get(`/api/v1/activities/${created.id}`)
          .set('Cookie', authCookies)
          .expect(200);
        expect(fetched.body.data.mode).toBe(mode);
      },
    );

    it('E2E-02: POST sin mode => mode es null', async () => {
      const created = await createActivity({ projectId });
      expect(created).toHaveProperty('mode');
      expect(created.mode).toBeNull();
    });

    it('E2E-03: POST con mode inválido => 400 (incluye mayúsculas)', async () => {
      for (const mode of ['foo', 'AUTONOMOUS']) {
        const res = await api()
          .post('/api/v1/activities')
          .set('Cookie', authCookies)
          .send({ name: '[E2E-036] mode inválido', projectId, mode });
        expectModeEnumRejection(res);
      }
    });

    it('E2E-04: PATCH con mode inválido => 400 (incluye mayúsculas)', async () => {
      const activity = await createActivity({ projectId, mode: 'cowork' });
      for (const mode of ['foo', 'AUTONOMOUS']) {
        const res = await api()
          .patch(`/api/v1/activities/${activity.id}`)
          .set('Cookie', authCookies)
          .send({ mode });
        expectModeEnumRejection(res);
      }
    });

    it('E2E-05: PATCH cambia mode', async () => {
      const activity = await createActivity({ projectId, mode: 'cowork' });
      const res = await api()
        .patch(`/api/v1/activities/${activity.id}`)
        .set('Cookie', authCookies)
        .send({ mode: 'autonomous' })
        .expect(200);
      expect(res.body.data.mode).toBe('autonomous');
    });

    it('E2E-06: PATCH con mode: null lo limpia', async () => {
      const activity = await createActivity({ projectId, mode: 'autonomous' });
      const res = await api()
        .patch(`/api/v1/activities/${activity.id}`)
        .set('Cookie', authCookies)
        .send({ mode: null })
        .expect(200);
      expect(res.body.data.mode).toBeNull();
    });

    it('E2E-07: PATCH sin mode conserva el valor existente', async () => {
      const activity = await createActivity({ projectId, mode: 'cowork_async' });
      const res = await api()
        .patch(`/api/v1/activities/${activity.id}`)
        .set('Cookie', authCookies)
        .send({ name: '[E2E-036] renombrada, mode intacto' })
        .expect(200);
      expect(res.body.data.mode).toBe('cowork_async');
    });

    it('E2E-08: autonomous + waiting se acepta (sin validación cruzada)', async () => {
      const created = await createActivity({
        projectId,
        mode: 'autonomous',
        status: 'waiting',
        waitingFor: 'Insumo de Santiago',
      });
      expect(created.mode).toBe('autonomous');
      expect(created.status).toBe('waiting');

      const other = await createActivity({ projectId, mode: 'autonomous' });
      const patched = await api()
        .patch(`/api/v1/activities/${other.id}`)
        .set('Cookie', authCookies)
        .send({ status: 'waiting', waitingFor: 'Insumo' })
        .expect(200);
      expect(patched.body.data.mode).toBe('autonomous');
      expect(patched.body.data.status).toBe('waiting');
    });

    it('E2E-09: una subtarea de un padre autonomous nace con mode null (no hereda)', async () => {
      const parent = await createActivity({ projectId, mode: 'autonomous' });
      const subtask = await createActivity({ projectId, parentId: parent.id });
      expect(subtask.mode).toBeNull();
    });
  });

  // ─── Plantillas e instancias ──────────────────────────────────────────────

  describe('Recurrencia — herencia y propagación de mode', () => {
    let projectId: string;

    beforeAll(async () => {
      projectId = (await createProject('[E2E-036] Proyecto recurrencia')).id;
    });

    async function createTemplate(mode: string | null) {
      return createActivity({
        name: '[E2E-036] Plantilla recurrente',
        projectId,
        recurrenceFrequency: 'daily',
        ...(mode !== null ? { mode } : {}),
      });
    }

    async function generate(template: any, offsetDays: number): Promise<any> {
      const instance = await activitiesService.generateInstanceForDate(
        template,
        localNoon(offsetDays),
      );
      expect(instance).not.toBeNull();
      createdActivityIds.push(instance!.id);
      return instance!;
    }

    async function getActivity(id: string) {
      const res = await api()
        .get(`/api/v1/activities/${id}`)
        .set('Cookie', authCookies)
        .expect(200);
      return res.body.data;
    }

    it('E2E-10: la instancia generada hereda el mode de la plantilla', async () => {
      const template = await createTemplate('cowork_async');
      expect(template.mode).toBe('cowork_async');
      const instance = await generate(template, 1);
      expect(instance.mode).toBe('cowork_async');
      expect((await getActivity(instance.id)).mode).toBe('cowork_async');
    });

    it('E2E-11: PATCH de mode en la plantilla se propaga a la instancia futura pending, no a la completed ni a la de hoy', async () => {
      const template = await createTemplate('cowork');
      const todayInstance = await generate(template, 0);
      const futurePending = await generate(template, 2);
      const futureCompleted = await generate(template, 3);

      await api()
        .patch(`/api/v1/activities/${futureCompleted.id}`)
        .set('Cookie', authCookies)
        .send({ status: 'completed' })
        .expect(200);

      await api()
        .patch(`/api/v1/activities/${template.id}`)
        .set('Cookie', authCookies)
        .send({ mode: 'autonomous' })
        .expect(200);

      expect((await getActivity(futurePending.id)).mode).toBe('autonomous');
      expect((await getActivity(futureCompleted.id)).mode).toBe('cowork');
      expect((await getActivity(todayInstance.id)).mode).toBe('cowork');
    });

    it('E2E-12: PATCH de mode: null en la plantilla limpia mode en la instancia futura pending', async () => {
      const template = await createTemplate('autonomous');
      const futurePending = await generate(template, 2);
      expect((await getActivity(futurePending.id)).mode).toBe('autonomous');

      await api()
        .patch(`/api/v1/activities/${template.id}`)
        .set('Cookie', authCookies)
        .send({ mode: null })
        .expect(200);

      expect((await getActivity(futurePending.id)).mode).toBeNull();
    });
  });

  // ─── GET /activities/mode/:mode ───────────────────────────────────────────

  describe('GET /api/v1/activities/mode/:mode', () => {
    let projectId: string;
    let otherProjectId: string;
    let active: any;
    let inProgress: any;
    let deferredTomorrow: any;
    let deferredToday: any;
    let completed: any;
    let cancelled: any;
    let template: any;
    let subtask: any;
    let otherProjectActivity: any;
    let noMode: any;
    let coworkOne: any;

    const get = (mode: string, query: Record<string, unknown> = {}) =>
      api()
        .get(`/api/v1/activities/mode/${mode}`)
        .query({ limit: 100, ...query })
        .set('Cookie', authCookies);

    beforeAll(async () => {
      projectId = (await createProject('[E2E-036] Proyecto by-mode')).id;
      otherProjectId = (await createProject('[E2E-036] Otro proyecto')).id;
      const m = { mode: 'autonomous', projectId };

      active = await createActivity({ ...m, name: '[E2E-036] auto pending' });
      inProgress = await createActivity({
        ...m,
        name: '[E2E-036] auto in_progress',
        status: 'in_progress',
      });
      deferredTomorrow = await createActivity({
        ...m,
        name: '[E2E-036] auto diferida mañana',
        deferUntil: dateOnly(1),
      });
      deferredToday = await createActivity({
        ...m,
        name: '[E2E-036] auto diferida hoy',
        deferUntil: dateOnly(0),
      });
      completed = await createActivity({
        ...m,
        name: '[E2E-036] auto completed',
        status: 'completed',
      });
      cancelled = await createActivity({
        ...m,
        name: '[E2E-036] auto cancelled',
        status: 'cancelled',
      });
      template = await createActivity({
        ...m,
        name: '[E2E-036] auto plantilla',
        recurrenceFrequency: 'daily',
      });
      subtask = await createActivity({
        ...m,
        name: '[E2E-036] auto subtarea',
        parentId: active.id,
      });
      otherProjectActivity = await createActivity({
        mode: 'autonomous',
        projectId: otherProjectId,
        name: '[E2E-036] auto otro proyecto',
      });
      noMode = await createActivity({
        projectId,
        name: '[E2E-036] sin modo',
      });
      coworkOne = await createActivity({
        projectId,
        mode: 'cowork',
        name: '[E2E-036] cowork',
      });
    });

    it('E2E-13: devuelve las actividades activas del modo y excluye otros modos', async () => {
      const res = await get('autonomous', { projectId }).expect(200);
      const ids = idsOf(res.body.data);
      expect(ids).toEqual(expect.arrayContaining([active.id, inProgress.id]));
      expect(ids).not.toContain(coworkOne.id);
      expect(ids).not.toContain(noMode.id);
      for (const a of res.body.data) expect(a.mode).toBe('autonomous');
    });

    it('E2E-14: excluye las diferidas a futuro (deferUntil = mañana)', async () => {
      const res = await get('autonomous', { projectId }).expect(200);
      expect(idsOf(res.body.data)).not.toContain(deferredTomorrow.id);
    });

    it('E2E-15: incluye las de deferUntil = hoy', async () => {
      const res = await get('autonomous', { projectId }).expect(200);
      expect(idsOf(res.body.data)).toContain(deferredToday.id);
    });

    it('E2E-16: excluye plantillas', async () => {
      const res = await get('autonomous', { projectId }).expect(200);
      expect(idsOf(res.body.data)).not.toContain(template.id);
    });

    it('E2E-17: excluye completed/cancelled por defecto', async () => {
      const res = await get('autonomous', { projectId }).expect(200);
      const ids = idsOf(res.body.data);
      expect(ids).not.toContain(completed.id);
      expect(ids).not.toContain(cancelled.id);
    });

    it('E2E-18: con ?status=completed los incluye (el status explícito sustituye la lista por defecto)', async () => {
      const res = await get('autonomous', {
        projectId,
        status: 'completed',
      }).expect(200);
      const ids = idsOf(res.body.data);
      expect(ids).toContain(completed.id);
      expect(ids).not.toContain(active.id);
    });

    it('E2E-19: projectId acota el resultado', async () => {
      const scoped = await get('autonomous', { projectId }).expect(200);
      expect(idsOf(scoped.body.data)).not.toContain(otherProjectActivity.id);

      const other = await get('autonomous', {
        projectId: otherProjectId,
      }).expect(200);
      expect(idsOf(other.body.data)).toEqual([otherProjectActivity.id]);
    });

    it('E2E-20: incluye subtareas con mode propio (D2)', async () => {
      // Subtask created with `mode: autonomous` explicitly (no inheritance).
      const res = await get('autonomous', { projectId }).expect(200);
      expect(idsOf(res.body.data)).toContain(subtask.id);
    });

    it('E2E-21: mode=none devuelve solo actividades sin modo (IS NULL) (D1)', async () => {
      const res = await get('none', { projectId }).expect(200);
      const ids = idsOf(res.body.data);
      expect(ids).toContain(noMode.id);
      expect(ids).not.toContain(active.id);
      expect(ids).not.toContain(coworkOne.id);
      for (const a of res.body.data) expect(a.mode).toBeNull();
    });

    it('E2E-22: mode=foo => 400', async () => {
      await get('foo').expect(400);
    });
  });

  // ─── GET /activities?mode= ────────────────────────────────────────────────

  describe('GET /api/v1/activities — filtro ?mode=', () => {
    let projectId: string;
    let auto: any;
    let none: any;

    beforeAll(async () => {
      projectId = (await createProject('[E2E-036] Proyecto listado')).id;
      auto = await createActivity({ projectId, mode: 'autonomous' });
      await createActivity({ projectId, mode: 'cowork' });
      none = await createActivity({ projectId });
    });

    it('E2E-23: ?mode=autonomous filtra; ?mode=none => sin modo; ?mode=foo => 400', async () => {
      // GET /activities no acepta projectId: se acota por la ruta de proyecto
      // (mismo ListActivitiesQueryDto). GET /activities?mode=foo valida el 400.
      const byProject = (query: Record<string, unknown>) =>
        api()
          .get(`/api/v1/activities/project/${projectId}`)
          .query({ limit: 100, ...query })
          .set('Cookie', authCookies);

      const autoRes = await byProject({ mode: 'autonomous' }).expect(200);
      expect(idsOf(autoRes.body.data)).toEqual([auto.id]);

      const noneRes = await byProject({ mode: 'none' }).expect(200);
      expect(idsOf(noneRes.body.data)).toEqual([none.id]);

      await api()
        .get('/api/v1/activities')
        .query({ mode: 'foo' })
        .set('Cookie', authCookies)
        .expect(400);
    });
  });

  // ─── GET /activities/summary ──────────────────────────────────────────────

  describe('GET /api/v1/activities/summary — byMode y filtro ?mode=', () => {
    let projectId: string;

    beforeAll(async () => {
      projectId = (await createProject('[E2E-036] Proyecto summary')).id;
      await createActivity({ projectId, mode: 'autonomous' });
      await createActivity({
        projectId,
        mode: 'autonomous',
        status: 'completed',
      });
      await createActivity({ projectId, mode: 'cowork_async' });
      await createActivity({ projectId, mode: 'cowork' });
      await createActivity({ projectId });
      await createActivity({ projectId });
    });

    it('E2E-24: byMode trae las 4 claves y sum(byMode) = total', async () => {
      const res = await api()
        .get('/api/v1/activities/summary')
        .query({ projectId })
        .set('Cookie', authCookies)
        .expect(200);
      const { byMode, total } = res.body.data;
      expect(Object.keys(byMode).sort()).toEqual(
        ['autonomous', 'cowork', 'cowork_async', 'none'].sort(),
      );
      expect(byMode).toEqual({
        autonomous: 2,
        cowork_async: 1,
        cowork: 1,
        none: 2,
      });
      expect(
        (Object.values(byMode) as number[]).reduce((a, b) => a + b, 0),
      ).toBe(total);
      expect(total).toBe(6);
    });

    it('E2E-25: ?mode= acota total y byStatus; mode=foo => 400', async () => {
      const res = await api()
        .get('/api/v1/activities/summary')
        .query({ projectId, mode: 'autonomous' })
        .set('Cookie', authCookies)
        .expect(200);
      expect(res.body.data.total).toBe(2);
      expect(res.body.data.byStatus.pending).toBe(1);
      expect(res.body.data.byStatus.completed).toBe(1);

      const none = await api()
        .get('/api/v1/activities/summary')
        .query({ projectId, mode: 'none' })
        .set('Cookie', authCookies)
        .expect(200);
      expect(none.body.data.total).toBe(2);

      await api()
        .get('/api/v1/activities/summary')
        .query({ mode: 'foo' })
        .set('Cookie', authCookies)
        .expect(400);
    });
  });

  // ─── mode en detalle, listado y subtasks anidadas ─────────────────────────

  describe('mode en las respuestas (detalle, listado y subtasks anidadas)', () => {
    it('E2E-26: el detalle y el listado incluyen mode, también en subtasks anidadas', async () => {
      const project = await createProject('[E2E-036] Proyecto respuestas');
      const parent = await createActivity({
        projectId: project.id,
        mode: 'autonomous',
      });
      const child = await createActivity({
        projectId: project.id,
        parentId: parent.id,
        mode: 'cowork',
      });

      const detail = await api()
        .get(`/api/v1/activities/${parent.id}`)
        .set('Cookie', authCookies)
        .expect(200);
      expect(detail.body.data.mode).toBe('autonomous');
      const nested = detail.body.data.subtasks.find(
        (s: { id: string }) => s.id === child.id,
      );
      expect(nested).toBeDefined();
      expect(nested).toHaveProperty('mode', 'cowork');

      const list = await api()
        .get(`/api/v1/activities/project/${project.id}`)
        .query({ limit: 100 })
        .set('Cookie', authCookies)
        .expect(200);
      const listed = list.body.data.find(
        (a: { id: string }) => a.id === parent.id,
      );
      expect(listed.mode).toBe('autonomous');
      const listedNested = listed.subtasks.find(
        (s: { id: string }) => s.id === child.id,
      );
      expect(listedNested).toHaveProperty('mode', 'cowork');
    });
  });

  // ─── MCP ──────────────────────────────────────────────────────────────────

  describe('MCP todo-api — mode', () => {
    let projectId: string;

    beforeAll(async () => {
      projectId = (await createProject('[E2E-036] Proyecto MCP')).id;
    });

    async function callTool(
      name: string,
      args: Record<string, unknown>,
      id: string,
    ) {
      const res = await request(app.getHttpServer())
        .post('/mcp')
        .set('Authorization', `Bearer ${TEST_MCP_API_KEY}`)
        .set('Accept', 'application/json, text/event-stream')
        .send({
          jsonrpc: '2.0',
          id,
          method: 'tools/call',
          params: { name, arguments: args },
        })
        .expect(200);
      return parseMcpSse(res.text);
    }

    /** Invalid args surface either as a JSON-RPC error (-32602, per spec) or
     * as a tool result with `isError`, depending on the SDK version. */
    function expectRejected(rpc: any) {
      const code = rpc.error?.code;
      expect(code === -32602 || rpc.result?.isError === true).toBe(true);
    }

    it('E2E-MCP-01: create_activity, update_activity (incl. null) y create_recurring_activity aceptan mode', async () => {
      const created = parseToolResult(
        await callTool(
          'create_activity',
          {
            name: '[E2E-036] MCP create',
            projectId,
            mode: 'autonomous',
          },
          'mcp-036-01a',
        ),
      );
      createdActivityIds.push(created.id);
      expect(created.mode).toBe('autonomous');

      const updated = parseToolResult(
        await callTool(
          'update_activity',
          { id: created.id, mode: 'cowork' },
          'mcp-036-01b',
        ),
      );
      expect(updated.mode).toBe('cowork');

      const cleared = parseToolResult(
        await callTool(
          'update_activity',
          { id: created.id, mode: null },
          'mcp-036-01c',
        ),
      );
      expect(cleared.mode).toBeNull();

      const template = parseToolResult(
        await callTool(
          'create_recurring_activity',
          {
            name: '[E2E-036] MCP plantilla',
            projectId,
            recurrenceFrequency: 'daily',
            mode: 'cowork_async',
          },
          'mcp-036-01d',
        ),
      );
      createdActivityIds.push(template.id);
      expect(template.mode).toBe('cowork_async');
    });

    it('E2E-MCP-02: un mode fuera del enum se rechaza (-32602) en create/update/create_recurring', async () => {
      const existing = await createActivity({ projectId });
      expectRejected(
        await callTool(
          'create_activity',
          { name: '[E2E-036] MCP inválida', projectId, mode: 'AUTONOMOUS' },
          'mcp-036-02a',
        ),
      );
      expectRejected(
        await callTool(
          'update_activity',
          { id: existing.id, mode: 'foo' },
          'mcp-036-02b',
        ),
      );
      expectRejected(
        await callTool(
          'create_recurring_activity',
          {
            name: '[E2E-036] MCP plantilla inválida',
            projectId,
            recurrenceFrequency: 'daily',
            mode: 'foo',
          },
          'mcp-036-02c',
        ),
      );
    });

    it('E2E-MCP-03: get_activities_by_mode devuelve el modo pedido y excluye diferidas', async () => {
      const visible = await createActivity({ projectId, mode: 'cowork' });
      const deferred = await createActivity({
        projectId,
        mode: 'cowork',
        deferUntil: dateOnly(2),
      });
      const rpc = await callTool(
        'get_activities_by_mode',
        { mode: 'cowork', projectId, limit: 100 },
        'mcp-036-03',
      );
      expect(rpc.error).toBeUndefined();
      const ids = idsOf(parseToolResult(rpc));
      expect(ids).toContain(visible.id);
      expect(ids).not.toContain(deferred.id);
    });

    it('E2E-MCP-04: get_activities_by_mode con status explícito incluye completed; mode inválido se rechaza', async () => {
      const done = await createActivity({
        projectId,
        mode: 'cowork_async',
        status: 'completed',
      });
      const rpc = await callTool(
        'get_activities_by_mode',
        {
          mode: 'cowork_async',
          status: ['completed'],
          projectId,
          limit: 100,
        },
        'mcp-036-04a',
      );
      expect(rpc.error).toBeUndefined();
      expect(idsOf(parseToolResult(rpc))).toContain(done.id);

      expectRejected(
        await callTool(
          'get_activities_by_mode',
          { mode: 'foo' },
          'mcp-036-04b',
        ),
      );
    });

    it('E2E-MCP-05: get_activities_summary trae byMode con 4 claves y sum = total', async () => {
      const project = await createProject('[E2E-036] Proyecto MCP summary');
      await createActivity({ projectId: project.id, mode: 'autonomous' });
      await createActivity({ projectId: project.id });
      const rpc = await callTool(
        'get_activities_summary',
        { projectId: project.id },
        'mcp-036-05',
      );
      expect(rpc.error).toBeUndefined();
      const summary = parseToolResult(rpc);
      expect(Object.keys(summary.byMode).sort()).toEqual(
        ['autonomous', 'cowork', 'cowork_async', 'none'].sort(),
      );
      expect(summary.byMode.autonomous).toBe(1);
      expect(summary.byMode.none).toBe(1);
      expect(
        (Object.values(summary.byMode) as number[]).reduce((a, b) => a + b, 0),
      ).toBe(summary.total);
    });
  });
});
