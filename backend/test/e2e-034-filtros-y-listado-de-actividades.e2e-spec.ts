// spec-034 — Corrección del listado de actividades y filtros por estado.
//
// Todos los casos anclados a "hoy" usan la fecha real de ejecución
// (`new Date()`), no una fecha fija.
//
// Nota sobre determinismo (hallazgo de @reviewer, corregido): las
// aserciones POSITIVAS (`toContain`) contra `GET /activities` sin acotar
// eran frágiles bajo `npm run test:e2e` (BD de desarrollo compartida, en
// paralelo con las demás suites `e2e-*`) — `baseQuery()` ordena
// `dueDate ASC NULLS LAST` y una actividad de prueba sin `dueDate` puede
// caer fuera de la página 1 si hay ≥100 filas con fecha por delante. Los
// casos que necesitan una aserción positiva ahora fijan
// `status: 'testing'` en las actividades que crean y filtran la consulta
// por el mismo `status` — acota el universo comparado sin dejar de
// ejercitar el endpoint global real. Las aserciones NEGATIVAS
// (`not.toContain` sobre algo excluido por `WHERE`, no por paginación) no
// tenían este problema y se dejan sin acotar.

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

const ALL_STATUSES = [
  'pending',
  'in_progress',
  'testing',
  'completed',
  'cancelled',
  'on_hold',
  'waiting',
];

describe('spec-034 — Filtros y listado de actividades (e2e)', () => {
  let app: INestApplication<App>;
  let authCookies: string[];
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

  async function createActivity(
    overrides: Record<string, unknown> = {},
    expectedStatus = 201,
  ) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/activities')
      .set('Cookie', authCookies)
      .send({
        name: 'Actividad de prueba spec-034',
        ...overrides,
      })
      .expect(expectedStatus);
    const activity = response.body.data;
    if (activity?.id) {
      createdActivityIds.push(activity.id);
    }
    return activity;
  }

  async function createProject(overrides: Record<string, unknown> = {}) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Cookie', authCookies)
      .send({
        name: 'Proyecto de prueba spec-034',
        startDate: '2026-01-01',
        ...overrides,
      })
      .expect(201);
    const project = response.body.data;
    if (project?.id) {
      createdProjectIds.push(project.id);
    }
    return project;
  }

  function getActivitiesList(query: Record<string, unknown> = {}) {
    return request(app.getHttpServer())
      .get('/api/v1/activities')
      .query(query)
      .set('Cookie', authCookies);
  }

  describe('Exclusión de plantillas y subtareas por defecto (GET /activities)', () => {
    it('TC-034-E2E-01: no devuelve plantillas de recurrencia (isTemplate = true)', async () => {
      const template = await createActivity({
        name: 'AC1 plantilla recurrente',
        // isTemplate se deriva de recurrenceFrequency en el servicio — no es
        // un campo del DTO (y `isRecurring` ya no existe desde spec-027).
        recurrenceFrequency: 'daily',
      });

      const response = await getActivitiesList({ limit: 100 }).expect(200);

      const ids = response.body.data.map((a: { id: string }) => a.id);
      expect(ids).not.toContain(template.id);
    });

    it('TC-034-E2E-02: no devuelve subtareas (parent != null) como filas de primer nivel', async () => {
      // status: 'testing' en el padre + filtro por el mismo status: acota el
      // universo comparado para que la aserción POSITIVA (toContain) no
      // dependa de en qué página cae dentro del listado global — ver nota de
      // determinismo al inicio del archivo.
      const parent = await createActivity({
        name: 'AC2 padre',
        status: 'testing',
      });
      const child = await createActivity({
        name: 'AC2 hija',
        parentId: parent.id,
      });

      const response = await getActivitiesList({
        limit: 100,
        status: 'testing',
      }).expect(200);

      const ids = response.body.data.map((a: { id: string }) => a.id);
      expect(ids).toContain(parent.id);
      expect(ids).not.toContain(child.id);
    });

    it('TC-034-E2E-03: `includeTemplates=true` sí trae las plantillas', async () => {
      const template = await createActivity({
        name: 'AC3 plantilla incluida',
        status: 'testing',
        recurrenceFrequency: 'daily',
      });

      const response = await getActivitiesList({
        limit: 100,
        status: 'testing',
        includeTemplates: true,
      }).expect(200);

      const ids = response.body.data.map((a: { id: string }) => a.id);
      expect(ids).toContain(template.id);
    });

    it('TC-034-E2E-04: `includeSubtasks=true` sí trae las subtareas', async () => {
      const parent = await createActivity({ name: 'AC4 padre' });
      const child = await createActivity({
        name: 'AC4 hija incluida',
        status: 'testing',
        parentId: parent.id,
      });

      const response = await getActivitiesList({
        limit: 100,
        status: 'testing',
        includeSubtasks: true,
      }).expect(200);

      const ids = response.body.data.map((a: { id: string }) => a.id);
      expect(ids).toContain(child.id);
    });
  });

  describe('Filtro por estado (GET /activities?status=)', () => {
    it('TC-034-E2E-05: ?status=testing devuelve solo actividades en testing', async () => {
      const testingOne = await createActivity({
        name: 'AC5 testing',
        status: 'testing',
      });
      const pendingOne = await createActivity({
        name: 'AC5 pending',
        status: 'pending',
      });

      const response = await getActivitiesList({
        limit: 100,
        status: 'testing',
      }).expect(200);

      const ids = response.body.data.map((a: { id: string }) => a.id);
      expect(ids).toContain(testingOne.id);
      expect(ids).not.toContain(pendingOne.id);
    });

    it('TC-034-E2E-06: ?status=waiting,on_hold devuelve la unión de ambos estados', async () => {
      const waitingOne = await createActivity({
        name: 'AC6 waiting',
        status: 'waiting',
        waitingFor: 'El revisor',
      });
      const onHoldOne = await createActivity({
        name: 'AC6 on_hold',
        status: 'on_hold',
      });
      const pendingOne = await createActivity({
        name: 'AC6 pending',
        status: 'pending',
      });

      const response = await getActivitiesList({
        limit: 100,
        status: 'waiting,on_hold',
      }).expect(200);

      const ids = response.body.data.map((a: { id: string }) => a.id);
      expect(ids).toContain(waitingOne.id);
      expect(ids).toContain(onHoldOne.id);
      expect(ids).not.toContain(pendingOne.id);
    });
  });

  describe('Filtros derivados de fecha (GET /activities?dueFilter=)', () => {
    it('TC-034-E2E-07: ?dueFilter=no_date devuelve solo actividades con dueDate = null', async () => {
      const withoutDate = await createActivity({ name: 'AC7 sin fecha', status: 'testing' });
      const withDate = await createActivity({
        name: 'AC7 con fecha',
        status: 'testing',
        dueDate: new Date().toISOString(),
      });

      const response = await getActivitiesList({
        limit: 100,
        status: 'testing',
        dueFilter: 'no_date',
      }).expect(200);

      const ids = response.body.data.map((a: { id: string }) => a.id);
      expect(ids).toContain(withoutDate.id);
      expect(ids).not.toContain(withDate.id);
    });

    it('TC-034-E2E-08: ?dueFilter=overdue aplica el mismo criterio que /activities/overdue (vencida y no completada)', async () => {
      const overdueDate = addDays(new Date(), -10);
      overdueDate.setHours(12, 0, 0, 0);
      const overdueOne = await createActivity({
        name: 'AC8 vencida',
        status: 'testing',
        dueDate: overdueDate.toISOString(),
      });
      const overdueButCompleted = await createActivity({
        name: 'AC8 vencida pero completada',
        dueDate: overdueDate.toISOString(),
        status: 'completed',
      });
      const futureOne = await createActivity({
        name: 'AC8 futura',
        status: 'testing',
        dueDate: addDays(new Date(), 10).toISOString(),
      });

      const [listResponse, overdueEndpointResponse] = await Promise.all([
        getActivitiesList({
          limit: 100,
          status: 'testing',
          dueFilter: 'overdue',
        }).expect(200),
        // /activities/overdue no acepta `status` (endpoint preexistente,
        // fuera de alcance de spec-034) — se le sube el limit al máximo
        // como mitigación razonable; sigue existiendo un riesgo residual
        // menor de que la actividad quede fuera de la página 1 si hay
        // muchas vencidas reales en la BD compartida, igual que cualquier
        // otra suite e2e que ya consulta este endpoint.
        request(app.getHttpServer())
          .get('/api/v1/activities/overdue')
          .query({ limit: 100 })
          .set('Cookie', authCookies)
          .expect(200),
      ]);

      const listIds = listResponse.body.data.map((a: { id: string }) => a.id);
      const overdueEndpointIds = overdueEndpointResponse.body.data.map(
        (a: { id: string }) => a.id,
      );

      expect(listIds).toContain(overdueOne.id);
      expect(listIds).not.toContain(overdueButCompleted.id);
      expect(listIds).not.toContain(futureOne.id);

      // Mismo criterio que /activities/overdue: la actividad vencida creada
      // en este caso debe aparecer en ambos listados por igual.
      expect(overdueEndpointIds).toContain(overdueOne.id);
      expect(overdueEndpointIds).not.toContain(overdueButCompleted.id);
    });
  });

  describe('Whitelist de query params (forbidNonWhitelisted)', () => {
    it('TC-034-E2E-09: un query param no declarado devuelve 400', async () => {
      await getActivitiesList({ estadoInventado: 'foo' }).expect(400);
    });
  });

  describe('Exclusiones en /activities/project/:id y /activities/without-project', () => {
    it('TC-034-E2E-10: GET /activities/project/:id excluye plantillas y subtareas del proyecto', async () => {
      const project = await createProject({ name: 'AC10 proyecto' });
      const template = await createActivity({
        name: 'AC10 plantilla del proyecto',
        projectId: project.id,
        recurrenceFrequency: 'daily',
      });
      const parent = await createActivity({
        name: 'AC10 padre del proyecto',
        projectId: project.id,
      });
      const child = await createActivity({
        name: 'AC10 hija del proyecto',
        parentId: parent.id,
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/activities/project/${project.id}`)
        .query({ limit: 100 })
        .set('Cookie', authCookies)
        .expect(200);

      const ids = response.body.data.map((a: { id: string }) => a.id);
      expect(ids).toContain(parent.id);
      expect(ids).not.toContain(template.id);
      expect(ids).not.toContain(child.id);
    });

    it('TC-034-E2E-11: GET /activities/without-project excluye plantillas y subtareas', async () => {
      const template = await createActivity({
        name: 'AC11 plantilla sin proyecto',
        recurrenceFrequency: 'daily',
      });
      const parent = await createActivity({ name: 'AC11 padre sin proyecto' });
      const child = await createActivity({
        name: 'AC11 hija sin proyecto',
        parentId: parent.id,
      });

      // `findWithoutProject` sigue aceptando solo `PaginationDto` (el spec
      // no le agregó `status`/`dueFilter` — fuera de su Fase 1) así que,
      // a diferencia de TC-034-E2E-02/07, esta aserción positiva no se
      // puede acotar por status. Con `limit: 100` es el máximo mitigable
      // sin ampliar el scope del endpoint; riesgo residual menor, igual
      // que en TC-034-E2E-08 contra `/activities/overdue`.
      const response = await request(app.getHttpServer())
        .get('/api/v1/activities/without-project')
        .query({ limit: 100 })
        .set('Cookie', authCookies)
        .expect(200);

      const ids = response.body.data.map((a: { id: string }) => a.id);
      expect(ids).toContain(parent.id);
      expect(ids).not.toContain(template.id);
      expect(ids).not.toContain(child.id);
    });
  });

  describe('GET /activities/summary', () => {
    it('TC-034-E2E-12: devuelve total, byStatus con los 7 valores de ActivityStatus (0 si ausentes), overdue y noDate', async () => {
      const overdueDate = addDays(new Date(), -5);
      overdueDate.setHours(12, 0, 0, 0);

      await createActivity({ name: 'AC12 testing', status: 'testing' });
      await createActivity({
        name: 'AC12 vencida',
        dueDate: overdueDate.toISOString(),
      });
      await createActivity({ name: 'AC12 sin fecha' });

      const response = await request(app.getHttpServer())
        .get('/api/v1/activities/summary')
        .set('Cookie', authCookies)
        .expect(200);

      const summary = response.body.data;

      expect(summary).toHaveProperty('total');
      expect(summary).toHaveProperty('byStatus');
      expect(summary).toHaveProperty('overdue');
      expect(summary).toHaveProperty('noDate');

      for (const status of ALL_STATUSES) {
        expect(summary.byStatus).toHaveProperty(status);
        expect(typeof summary.byStatus[status]).toBe('number');
      }
      expect(Object.keys(summary.byStatus).sort()).toEqual(
        [...ALL_STATUSES].sort(),
      );

      expect(summary.byStatus.testing).toBeGreaterThanOrEqual(1);
      expect(summary.overdue).toBeGreaterThanOrEqual(1);
      expect(summary.noDate).toBeGreaterThanOrEqual(1);
    });

    it('TC-034-E2E-13: ?projectId= acota los conteos a ese proyecto', async () => {
      const project = await createProject({ name: 'AC13 proyecto acotado' });
      const other = await createProject({ name: 'AC13 otro proyecto' });

      await createActivity({
        name: 'AC13 dentro del proyecto',
        projectId: project.id,
        status: 'pending',
      });
      await createActivity({
        name: 'AC13 fuera del proyecto',
        projectId: other.id,
        status: 'pending',
      });
      await createActivity({
        name: 'AC13 sin proyecto',
        status: 'pending',
      });

      const [scopedResponse, unscopedResponse] = await Promise.all([
        request(app.getHttpServer())
          .get('/api/v1/activities/summary')
          .query({ projectId: project.id })
          .set('Cookie', authCookies)
          .expect(200),
        request(app.getHttpServer())
          .get('/api/v1/activities/summary')
          .set('Cookie', authCookies)
          .expect(200),
      ]);

      const scoped = scopedResponse.body.data;
      const unscoped = unscopedResponse.body.data;

      expect(scoped.total).toBeLessThan(unscoped.total);
      expect(scoped.total).toBeGreaterThanOrEqual(1);
    });

    it('TC-034-E2E-14: la suma de byStatus es igual a total, con y sin projectId', async () => {
      const project = await createProject({ name: 'AC14 proyecto suma' });
      await createActivity({
        name: 'AC14 pending',
        projectId: project.id,
        status: 'pending',
      });
      await createActivity({
        name: 'AC14 testing',
        projectId: project.id,
        status: 'testing',
      });
      await createActivity({
        name: 'AC14 waiting',
        projectId: project.id,
        status: 'waiting',
        waitingFor: 'Alguien',
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/activities/summary')
        .query({ projectId: project.id })
        .set('Cookie', authCookies)
        .expect(200);

      const summary = response.body.data;
      const sumByStatus = ALL_STATUSES.reduce(
        (acc, status) => acc + (summary.byStatus[status] ?? 0),
        0,
      );
      expect(sumByStatus).toEqual(summary.total);

      // Y también sin acotar por proyecto, sobre el conjunto completo.
      const globalResponse = await request(app.getHttpServer())
        .get('/api/v1/activities/summary')
        .set('Cookie', authCookies)
        .expect(200);
      const globalSummary = globalResponse.body.data;
      const globalSum = ALL_STATUSES.reduce(
        (acc, status) => acc + (globalSummary.byStatus[status] ?? 0),
        0,
      );
      expect(globalSum).toEqual(globalSummary.total);
    });
  });
});
