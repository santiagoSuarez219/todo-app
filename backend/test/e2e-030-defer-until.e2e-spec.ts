// spec-030 — Diferir actividades: `deferUntil`.
//
// Redactado en modo test-first (@tester), ANTES de que exista la
// implementación: se espera que TODO este archivo esté en rojo hasta que
// spec-030 se implemente (columna `deferUntil` en `activities`, filtrado en
// `findToday`/`findTomorrow`/`findThisWeek`/`findOverdue`/`findWithoutProject`,
// `buildInstanceFromTemplate()` fijando `deferUntil: null`, y el endpoint
// REST subyacente de `get_deferred_activities`).
//
// **Endpoint inferido:** el spec (Fase 4, MCP) define la tool
// `get_deferred_activities` pero no fija explícitamente su endpoint REST. Se
// infiere `GET /activities/deferred` por consistencia con el patrón existente
// de rutas estáticas antes de `:id` (`/activities/today`, `/tomorrow`,
// `/this-week`, `/overdue`, `/without-project`, `/schedule`) — misma forma:
// sin parámetro de ruta, con paginación estándar + `projectId` opcional en
// query. Si la implementación final nombra el endpoint distinto, actualizar
// este archivo junto con ella.
//
// Los casos que dependen de "hoy" (Hoy/Mañana/Semana/Vencidas/Backlog) crean
// las actividades con `deferUntil` = ayer/hoy/mañana vía API, igual que
// indica el spec para las pruebas manuales — nunca esperan al día siguiente.

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

/** `YYYY-MM-DD` local calendar date, offset by `offsetDays` from today —
 * matches the `date` column type of `deferUntil` (see spec-030 § "Tipo de
 * columna"), never a `Date`/timestamptz string. */
function deferDateOnly(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** ISO instant offset by `offsetDays` from *right now* (not midnight) — for
 * `dueDate`. Sending the real current time avoids the UTC-midnight timezone
 * pitfall documented in e2e-025 (`sanitizeByType` truncates `task.dueDate`
 * to LOCAL midnight of the instant received, so anchoring to "now" always
 * truncates to the intended local day, offset by whole days). */
function dueDateISO(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString();
}

function getThisWeekRange(): { monday: Date; sunday: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { monday, sunday };
}

describe('spec-030 — Diferir actividades: deferUntil (e2e)', () => {
  let app: INestApplication<App>;
  let authCookies: string[];
  let activitiesService: ActivitiesService;
  // Deleted in reverse creation order so leaves (subtasks/instances) go
  // before their parents/templates.
  const createdActivityIds: string[] = [];
  const createdProjectIds: string[] = [];

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

    activitiesService = moduleFixture.get<ActivitiesService>(ActivitiesService);

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

  async function createActivity(overrides: Record<string, unknown> = {}) {
    const response = await api()
      .post('/api/v1/activities')
      .set('Cookie', authCookies)
      .send({
        name: '[E2E-030] Actividad de prueba spec-030',
        ...overrides,
      })
      .expect(201);
    const activity = response.body.data;
    createdActivityIds.push(activity.id);
    return activity;
  }

  async function createProject(overrides: Record<string, unknown> = {}) {
    const response = await api()
      .post('/api/v1/projects')
      .set('Cookie', authCookies)
      .send({
        name: '[E2E-030] Proyecto de prueba spec-030',
        startDate: '2026-01-01',
        ...overrides,
      })
      .expect(201);
    const project = response.body.data;
    createdProjectIds.push(project.id);
    return project;
  }

  function idsOf(list: Array<{ id: string }>): string[] {
    return list.map((a) => a.id);
  }

  // ─── AC: findToday() ──────────────────────────────────────────────────────

  describe('GET /api/v1/activities/today', () => {
    it('AC: an activity with a FUTURE deferUntil does not appear today, even with dueDate = today', async () => {
      const deferred = await createActivity({
        name: '[E2E-030] Today — deferUntil futuro',
        dueDate: dueDateISO(0),
        deferUntil: deferDateOnly(2),
      });

      const response = await api()
        .get('/api/v1/activities/today')
        .query({ limit: 100 })
        .set('Cookie', authCookies)
        .expect(200);

      expect(idsOf(response.body.data)).not.toContain(deferred.id);
    });

    it('AC: an activity with deferUntil = today appears normally today', async () => {
      const activity = await createActivity({
        name: '[E2E-030] Today — deferUntil = hoy',
        dueDate: dueDateISO(0),
        deferUntil: deferDateOnly(0),
      });

      const response = await api()
        .get('/api/v1/activities/today')
        .query({ limit: 100 })
        .set('Cookie', authCookies)
        .expect(200);

      expect(idsOf(response.body.data)).toContain(activity.id);
    });

    it('AC: an activity with a PAST deferUntil behaves exactly like deferUntil: null', async () => {
      const activity = await createActivity({
        name: '[E2E-030] Today — deferUntil pasado',
        dueDate: dueDateISO(0),
        deferUntil: deferDateOnly(-3),
      });

      const response = await api()
        .get('/api/v1/activities/today')
        .query({ limit: 100 })
        .set('Cookie', authCookies)
        .expect(200);

      expect(idsOf(response.body.data)).toContain(activity.id);
    });

    it('AC: the deferred-future filter also applies to the scheduledFor branch, not just the dueDate branch', async () => {
      // scheduledForToday (boolean) fue reemplazado por scheduledFor (fecha)
      // en spec-031 — este caso ya existía antes de ese cambio y quedó
      // desactualizado; ajustado para usar el campo real, sin cambiar su
      // intención (la rama de scheduledFor también debe respetar deferUntil).
      const deferred = await createActivity({
        name: '[E2E-030] Today — scheduledFor + deferUntil futuro',
        scheduledFor: deferDateOnly(0),
        deferUntil: deferDateOnly(5),
      });

      const response = await api()
        .get('/api/v1/activities/today')
        .query({ limit: 100 })
        .set('Cookie', authCookies)
        .expect(200);

      expect(idsOf(response.body.data)).not.toContain(deferred.id);
    });
  });

  // ─── AC: findTomorrow() ───────────────────────────────────────────────────

  describe('GET /api/v1/activities/tomorrow', () => {
    it('AC: an activity with deferUntil compared against TODAY (not tomorrow) is hidden while deferUntil is still in the future', async () => {
      const deferred = await createActivity({
        name: '[E2E-030] Tomorrow — deferUntil futuro',
        dueDate: dueDateISO(1),
        deferUntil: deferDateOnly(2),
      });

      const response = await api()
        .get('/api/v1/activities/tomorrow')
        .query({ limit: 100 })
        .set('Cookie', authCookies)
        .expect(200);

      expect(idsOf(response.body.data)).not.toContain(deferred.id);
    });

    it('AC: deferUntil = today (not future) does not hide the activity from tomorrow', async () => {
      const activity = await createActivity({
        name: '[E2E-030] Tomorrow — deferUntil = hoy',
        dueDate: dueDateISO(1),
        deferUntil: deferDateOnly(0),
      });

      const response = await api()
        .get('/api/v1/activities/tomorrow')
        .query({ limit: 100 })
        .set('Cookie', authCookies)
        .expect(200);

      expect(idsOf(response.body.data)).toContain(activity.id);
    });
  });

  // ─── AC: findThisWeek() — key regression: compares against TODAY, not the window end ──

  describe('GET /api/v1/activities/this-week', () => {
    const { sunday } = getThisWeekRange();
    const now = new Date();
    // Only constructible when today is NOT the last day of the visible
    // window (Sunday): we need a deferUntil date that is simultaneously
    // (a) strictly after today, and (b) on/before the window's last day
    // (Sunday), so that a buggy implementation comparing against the WINDOW
    // END instead of TODAY would incorrectly treat it as "not future" and
    // show the activity — which is exactly the bug this case guards against.
    // When today IS Sunday, no such date exists within the window and the
    // scenario is skipped (re-run any other day of the week to cover it).
    const todayIsSunday = now.getDay() === 0;
    const itUnlessSunday = todayIsSunday ? it.skip : it;

    itUnlessSunday(
      'AC: an activity deferred until a day still WITHIN this week does not appear today, because the comparison is against today, not the window end',
      async () => {
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        // Guaranteed <= sunday because today is not Sunday.
        const deferTarget = tomorrow <= sunday ? tomorrow : sunday;
        const pad = (n: number) => String(n).padStart(2, '0');
        const deferUntil = `${deferTarget.getFullYear()}-${pad(deferTarget.getMonth() + 1)}-${pad(deferTarget.getDate())}`;

        const deferred = await createActivity({
          name: '[E2E-030] Week — diferida a un día de esta misma semana',
          dueDate: sunday.toISOString(),
          deferUntil,
        });

        const response = await api()
          .get('/api/v1/activities/this-week')
          .query({ limit: 100 })
          .set('Cookie', authCookies)
          .expect(200);

        expect(idsOf(response.body.data)).not.toContain(deferred.id);
      },
    );

    it('AC: an activity with a PAST deferUntil appears normally in the week view', async () => {
      const activity = await createActivity({
        name: '[E2E-030] Week — deferUntil pasado',
        dueDate: dueDateISO(0),
        deferUntil: deferDateOnly(-1),
      });

      const response = await api()
        .get('/api/v1/activities/this-week')
        .query({ limit: 100 })
        .set('Cookie', authCookies)
        .expect(200);

      expect(idsOf(response.body.data)).toContain(activity.id);
    });
  });

  // ─── AC: findOverdue() — the interaction the spec calls out explicitly ────

  describe('GET /api/v1/activities/overdue', () => {
    it('AC: an overdue activity (dueDate in the past) with a FUTURE deferUntil does NOT appear in Overdue', async () => {
      const deferred = await createActivity({
        name: '[E2E-030] Overdue — vencida y diferida',
        dueDate: dueDateISO(-5),
        deferUntil: deferDateOnly(3),
      });

      const response = await api()
        .get('/api/v1/activities/overdue')
        .query({ limit: 100 })
        .set('Cookie', authCookies)
        .expect(200);

      expect(idsOf(response.body.data)).not.toContain(deferred.id);
    });

    it('AC: once deferUntil is no longer in the future (reaches today), the same overdue activity reappears in Overdue', async () => {
      const activity = await createActivity({
        name: '[E2E-030] Overdue — vencida, deferUntil llegó a hoy',
        dueDate: dueDateISO(-5),
        deferUntil: deferDateOnly(0),
      });

      const response = await api()
        .get('/api/v1/activities/overdue')
        .query({ limit: 100 })
        .set('Cookie', authCookies)
        .expect(200);

      expect(idsOf(response.body.data)).toContain(activity.id);
    });

    it('AC: an overdue activity with a PAST deferUntil behaves like deferUntil: null (still overdue)', async () => {
      const activity = await createActivity({
        name: '[E2E-030] Overdue — vencida, deferUntil pasado',
        dueDate: dueDateISO(-5),
        deferUntil: deferDateOnly(-2),
      });

      const response = await api()
        .get('/api/v1/activities/overdue')
        .query({ limit: 100 })
        .set('Cookie', authCookies)
        .expect(200);

      expect(idsOf(response.body.data)).toContain(activity.id);
    });
  });

  // ─── AC: findWithoutProject() — Backlog ────────────────────────────────────

  describe('GET /api/v1/activities/without-project', () => {
    it('AC: a project-less activity with a FUTURE deferUntil does not appear in Backlog', async () => {
      const deferred = await createActivity({
        name: '[E2E-030] Backlog — diferida futuro',
        deferUntil: deferDateOnly(4),
      });

      const response = await api()
        .get('/api/v1/activities/without-project')
        .query({ limit: 100 })
        .set('Cookie', authCookies)
        .expect(200);

      expect(idsOf(response.body.data)).not.toContain(deferred.id);
    });

    it('AC: a project-less activity with a PAST deferUntil appears normally in Backlog', async () => {
      const activity = await createActivity({
        name: '[E2E-030] Backlog — diferida pasado',
        deferUntil: deferDateOnly(-1),
      });

      const response = await api()
        .get('/api/v1/activities/without-project')
        .query({ limit: 100 })
        .set('Cookie', authCookies)
        .expect(200);

      expect(idsOf(response.body.data)).toContain(activity.id);
    });

    it('AC: PATCH deferUntil: null clears the defer and the activity reappears in Backlog immediately', async () => {
      const activity = await createActivity({
        name: '[E2E-030] Backlog — se limpia deferUntil',
        deferUntil: deferDateOnly(6),
      });

      const before = await api()
        .get('/api/v1/activities/without-project')
        .query({ limit: 100 })
        .set('Cookie', authCookies)
        .expect(200);
      expect(idsOf(before.body.data)).not.toContain(activity.id);

      await api()
        .patch(`/api/v1/activities/${activity.id}`)
        .set('Cookie', authCookies)
        .send({ deferUntil: null })
        .expect(200);

      const after = await api()
        .get('/api/v1/activities/without-project')
        .query({ limit: 100 })
        .set('Cookie', authCookies)
        .expect(200);
      expect(idsOf(after.body.data)).toContain(activity.id);
    });
  });

  // ─── AC: views that must NOT change ────────────────────────────────────────

  describe('Views unaffected by deferUntil (explicit contract, spec-030 § "Vistas y consultas afectadas")', () => {
    it('AC: GET /activities (findAll) keeps showing a future-deferred activity — general listing was explicitly asked for', async () => {
      const deferred = await createActivity({
        name: '[E2E-030] findAll — no debe ocultar diferidas',
        // Anchored far in the past so ASC-by-dueDate ordering puts it on
        // page 1 regardless of how much real data exists in the DB.
        dueDate: '2000-01-02T00:00:00.000Z',
        deferUntil: deferDateOnly(10),
      });

      const response = await api()
        .get('/api/v1/activities')
        .query({ limit: 100 })
        .set('Cookie', authCookies)
        .expect(200);

      expect(idsOf(response.body.data)).toContain(deferred.id);
    });

    it('AC: GET /activities/search/:query keeps showing a future-deferred activity', async () => {
      const deferred = await createActivity({
        name: '[E2E-030] SearchNoOculta — no debe ocultar diferidas',
        deferUntil: deferDateOnly(8),
      });

      const response = await api()
        .get('/api/v1/activities/search/SearchNoOculta')
        .set('Cookie', authCookies)
        .expect(200);

      expect(idsOf(response.body.data)).toContain(deferred.id);
    });

    it('AC: GET /activities/project/:projectId keeps showing a future-deferred activity', async () => {
      const project = await createProject({
        name: '[E2E-030] Proyecto — no debe ocultar diferidas',
      });
      const deferred = await createActivity({
        name: '[E2E-030] findByProject — no debe ocultar diferidas',
        projectId: project.id,
        deferUntil: deferDateOnly(7),
      });

      const response = await api()
        .get(`/api/v1/activities/project/${project.id}`)
        .query({ limit: 100 })
        .set('Cookie', authCookies)
        .expect(200);

      expect(idsOf(response.body.data)).toContain(deferred.id);
    });

    it('AC: GET /activities/schedule (Cronograma) keeps showing a future-deferred activity', async () => {
      // year=2029, month=6 — far enough from real data to avoid collisions.
      const deferred = await createActivity({
        name: '[E2E-030] Cronograma — no debe ocultar diferidas',
        dueDate: '2029-06-15T12:00:00.000Z',
        deferUntil: deferDateOnly(9),
      });

      const response = await api()
        .get('/api/v1/activities/schedule')
        .query({ year: 2029, month: 6 })
        .set('Cookie', authCookies)
        .expect(200);

      expect(idsOf(response.body.data)).toContain(deferred.id);
    });

    it('AC: GET /activities/:id/subtasks keeps showing a future-deferred subtask', async () => {
      const parent = await createActivity({
        name: '[E2E-030] Padre — subtareas no filtran diferidas',
      });
      const deferredSubtask = await createActivity({
        name: '[E2E-030] Subtarea diferida',
        parentId: parent.id,
        deferUntil: deferDateOnly(3),
      });

      const response = await api()
        .get(`/api/v1/activities/${parent.id}/subtasks`)
        .query({ limit: 100 })
        .set('Cookie', authCookies)
        .expect(200);

      expect(idsOf(response.body.data)).toContain(deferredSubtask.id);
    });
  });

  // ─── AC: compatibility — activities without deferUntil behave exactly as before ──

  describe('Compatibilidad total (deferUntil: null es el default y no cambia nada)', () => {
    it('AC: creating an activity without sending deferUntil results in deferUntil: null and normal visibility today', async () => {
      const activity = await createActivity({
        name: '[E2E-030] Compat — sin deferUntil',
        dueDate: dueDateISO(0),
      });
      expect(activity.deferUntil).toBeNull();

      const response = await api()
        .get('/api/v1/activities/today')
        .query({ limit: 100 })
        .set('Cookie', authCookies)
        .expect(200);
      expect(idsOf(response.body.data)).toContain(activity.id);
    });
  });

  // ─── AC: deferring is not posponer (spec-028) ──────────────────────────────
  // spec-028 (postponementCount) ya está [DONE] al momento de completar esta
  // fase — este caso quedó pendiente en la redacción original del archivo
  // porque el campo todavía no existía en la entidad.

  describe('Diferir no es posponer (postponementCount, spec-028)', () => {
    it('AC: setting/changing deferUntil never increments postponementCount', async () => {
      const activity = await createActivity({
        name: '[E2E-030] deferUntil no toca postponementCount',
      });
      expect(activity.postponementCount).toBe(0);

      const firstDefer = await api()
        .patch(`/api/v1/activities/${activity.id}`)
        .set('Cookie', authCookies)
        .send({ deferUntil: deferDateOnly(3) })
        .expect(200);
      expect(firstDefer.body.data.postponementCount).toBe(0);

      const secondDefer = await api()
        .patch(`/api/v1/activities/${activity.id}`)
        .set('Cookie', authCookies)
        .send({ deferUntil: deferDateOnly(10) })
        .expect(200);
      expect(secondDefer.body.data.postponementCount).toBe(0);

      const cleared = await api()
        .patch(`/api/v1/activities/${activity.id}`)
        .set('Cookie', authCookies)
        .send({ deferUntil: null })
        .expect(200);
      expect(cleared.body.data.postponementCount).toBe(0);
    });
  });

  // ─── AC: recurring instances are born with deferUntil: null ───────────────

  describe('buildInstanceFromTemplate() — instances never inherit deferUntil from the template', () => {
    it('AC: an instance generated from a deferred recurring template is created with deferUntil: null', async () => {
      const template = await createActivity({
        name: '[E2E-030] Plantilla diferida',
        recurrenceFrequency: 'daily',
        deferUntil: deferDateOnly(15),
      });
      expect(template.deferUntil).toBe(deferDateOnly(15));

      // `buildInstanceFromTemplate()` is not reachable via any public
      // endpoint outside the daily recurrence cron — invoked directly
      // through the injected service, same technique as e2e-025's
      // `createInstanceOnlyActivity()` for the same structural reason.
      const instance = await activitiesService.generateInstanceForDate(
        template,
        new Date(),
      );
      expect(instance).not.toBeNull();
      if (instance) {
        createdActivityIds.push(instance.id);
        expect(instance.deferUntil).toBeNull();

        const fetched = await api()
          .get(`/api/v1/activities/${instance.id}`)
          .set('Cookie', authCookies)
          .expect(200);
        expect(fetched.body.data.deferUntil).toBeNull();
      }
    });
  });

  // ─── AC: GET /activities/deferred — REST counterpart of get_deferred_activities ──

  describe('GET /api/v1/activities/deferred (inferred REST endpoint backing the MCP tool get_deferred_activities)', () => {
    it('AC: returns activities with a non-null, future deferUntil, ordered by deferUntil ASC', async () => {
      const later = await createActivity({
        name: '[E2E-030] Deferred list — más tarde',
        deferUntil: deferDateOnly(20),
      });
      const sooner = await createActivity({
        name: '[E2E-030] Deferred list — más pronto',
        deferUntil: deferDateOnly(12),
      });

      const response = await api()
        .get('/api/v1/activities/deferred')
        .query({ limit: 100 })
        .set('Cookie', authCookies)
        .expect(200);

      const ids: string[] = idsOf(response.body.data);
      expect(ids).toContain(later.id);
      expect(ids).toContain(sooner.id);
      const soonerIndex = ids.indexOf(sooner.id);
      const laterIndex = ids.indexOf(later.id);
      expect(soonerIndex).toBeLessThan(laterIndex);
    });

    it('AC: excludes activities with deferUntil: null and with a PAST deferUntil', async () => {
      const noDefer = await createActivity({
        name: '[E2E-030] Deferred list — sin deferUntil',
      });
      const pastDefer = await createActivity({
        name: '[E2E-030] Deferred list — deferUntil pasado',
        deferUntil: deferDateOnly(-2),
      });

      const response = await api()
        .get('/api/v1/activities/deferred')
        .query({ limit: 100 })
        .set('Cookie', authCookies)
        .expect(200);

      const ids: string[] = idsOf(response.body.data);
      expect(ids).not.toContain(noDefer.id);
      expect(ids).not.toContain(pastDefer.id);
    });

    it('AC: an activity stops appearing in get_deferred_activities once its deferUntil is no longer in the future', async () => {
      const activity = await createActivity({
        name: '[E2E-030] Deferred list — deja de aparecer al llegar la fecha',
        deferUntil: deferDateOnly(1),
      });

      const before = await api()
        .get('/api/v1/activities/deferred')
        .query({ limit: 100 })
        .set('Cookie', authCookies)
        .expect(200);
      expect(idsOf(before.body.data)).toContain(activity.id);

      await api()
        .patch(`/api/v1/activities/${activity.id}`)
        .set('Cookie', authCookies)
        .send({ deferUntil: deferDateOnly(0) })
        .expect(200);

      const after = await api()
        .get('/api/v1/activities/deferred')
        .query({ limit: 100 })
        .set('Cookie', authCookies)
        .expect(200);
      expect(idsOf(after.body.data)).not.toContain(activity.id);
    });

    it('AC: optional projectId filters the deferred list to a single project', async () => {
      const projectA = await createProject({
        name: '[E2E-030] Deferred — proyecto A',
      });
      const projectB = await createProject({
        name: '[E2E-030] Deferred — proyecto B',
      });
      const deferredA = await createActivity({
        name: '[E2E-030] Deferred list — proyecto A',
        projectId: projectA.id,
        deferUntil: deferDateOnly(5),
      });
      const deferredB = await createActivity({
        name: '[E2E-030] Deferred list — proyecto B',
        projectId: projectB.id,
        deferUntil: deferDateOnly(5),
      });

      const response = await api()
        .get('/api/v1/activities/deferred')
        .query({ limit: 100, projectId: projectA.id })
        .set('Cookie', authCookies)
        .expect(200);

      const ids: string[] = idsOf(response.body.data);
      expect(ids).toContain(deferredA.id);
      expect(ids).not.toContain(deferredB.id);
    });
  });
});
