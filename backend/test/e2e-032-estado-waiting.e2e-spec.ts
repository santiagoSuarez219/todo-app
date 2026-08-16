// spec-032 — Estado `waiting`: bloqueado por otra persona (`waitingFor`,
// `waitingSince`).
//
// Redactado en modo test-first (@tester), ANTES de que exista la
// implementación: se espera que TODO este archivo esté en rojo hasta que
// spec-032 se implemente (valor nuevo `waiting` en el enum
// `activities_status_enum`, columnas `waitingFor`/`waitingSince` en
// `activities`, y su ciclo de vida en `ActivitiesService.create()`/`update()`).
//
// El caso de regresión `completed → waiting` (TC-032-E2E-12) asume que, para
// cuando spec-032 se implemente, también lo están spec-024 (cascada de
// subtareas, ya `[DONE]` a la fecha de esta redacción) y spec-028
// (`completedAt`, `[NOT STARTED]` a la fecha de esta redacción pero parte
// del mismo paquete "Actividades — modelo de capas" y con orden de
// implementación anterior a spec-032 según el propio spec). Si el paquete
// se implementa fuera de ese orden, este caso debe ajustarse junto con la
// implementación.
//
// Todos los casos anclados a "hoy" usan la fecha real de ejecución
// (`new Date()`), no una fecha fija, igual que se comportaría la aplicación
// en producción.

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

/** Returns 'YYYY-MM-DD' for a Date, using local calendar fields (not UTC) —
 * same convention documented in backend/CLAUDE.md for `instanceDate`. */
function toDateOnlyString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

describe('spec-032 — Estado `waiting` (e2e)', () => {
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
        name: 'Actividad de prueba spec-032',
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

  describe('Entrada en `waiting` — autocompletado de `waitingSince`', () => {
    it('TC-032-E2E-01: PATCH a waiting sin waitingSince autocompleta la fecha de hoy', async () => {
      const activity = await createActivity({ name: 'AC1 sin waitingSince' });

      const response = await patchActivity(activity.id, {
        status: 'waiting',
      }).expect(200);

      expect(response.body.data.status).toEqual('waiting');
      expect(response.body.data.waitingSince).toEqual(
        toDateOnlyString(new Date()),
      );
    });

    it('TC-032-E2E-02: PATCH a waiting con waitingSince explícito respeta el valor enviado', async () => {
      const activity = await createActivity({ name: 'AC2 con waitingSince' });
      const explicitDate = toDateOnlyString(addDays(new Date(), -5));

      const response = await patchActivity(activity.id, {
        status: 'waiting',
        waitingSince: explicitDate,
      }).expect(200);

      expect(response.body.data.waitingSince).toEqual(explicitDate);
    });

    it('TC-032-E2E-03: waitingFor es opcional — se puede entrar en waiting sin indicar a quién', async () => {
      const activity = await createActivity({ name: 'AC3 sin waitingFor' });

      const response = await patchActivity(activity.id, {
        status: 'waiting',
      }).expect(200);

      expect(response.body.data.status).toEqual('waiting');
      expect(response.body.data.waitingFor).toBeNull();
    });

    it('TC-032-E2E-04: create() con status waiting sin waitingSince también autocompleta hoy', async () => {
      const activity = await createActivity({
        name: 'AC4 nace en waiting',
        status: 'waiting',
      });

      expect(activity.status).toEqual('waiting');
      expect(activity.waitingSince).toEqual(toDateOnlyString(new Date()));
    });

    it('TC-032-E2E-04b: create() con status waiting y waitingSince explícito lo respeta', async () => {
      const explicitDate = toDateOnlyString(addDays(new Date(), -3));
      const activity = await createActivity({
        name: 'AC4b nace en waiting con fecha',
        status: 'waiting',
        waitingSince: explicitDate,
        waitingFor: 'El contador',
      });

      expect(activity.waitingSince).toEqual(explicitDate);
      expect(activity.waitingFor).toEqual('El contador');
    });
  });

  describe('Limpieza automática al salir de `waiting` o al no estar en `waiting`', () => {
    it('TC-032-E2E-05: create() fuera de waiting fuerza waitingFor/waitingSince a null aunque se envíen', async () => {
      const activity = await createActivity({
        name: 'AC5 pending con datos de waiting',
        status: 'pending',
        waitingFor: 'Alguien',
        waitingSince: toDateOnlyString(new Date()),
      });

      expect(activity.status).toEqual('pending');
      expect(activity.waitingFor).toBeNull();
      expect(activity.waitingSince).toBeNull();
    });

    it('TC-032-E2E-06: salir de waiting hacia otro estado limpia ambos campos', async () => {
      const activity = await createActivity({ name: 'AC6 sale de waiting' });
      await patchActivity(activity.id, {
        status: 'waiting',
        waitingFor: 'El proveedor',
      }).expect(200);

      const inWaiting = await getActivity(activity.id);
      expect(inWaiting.status).toEqual('waiting');
      expect(inWaiting.waitingFor).toEqual('El proveedor');
      expect(inWaiting.waitingSince).not.toBeNull();

      const response = await patchActivity(activity.id, {
        status: 'pending',
      }).expect(200);

      expect(response.body.data.status).toEqual('pending');
      expect(response.body.data.waitingFor).toBeNull();
      expect(response.body.data.waitingSince).toBeNull();
    });

    it('TC-032-E2E-07: enviar waitingFor con status distinto de waiting no produce error y el campo queda null', async () => {
      const activity = await createActivity({
        name: 'AC7 limpieza silenciosa',
      });

      const response = await patchActivity(activity.id, {
        status: 'pending',
        waitingFor: 'Este valor debe descartarse',
      }).expect(200);

      expect(response.body.data.status).toEqual('pending');
      expect(response.body.data.waitingFor).toBeNull();
    });
  });

  describe('Coexistencia con `on_hold`', () => {
    it('TC-032-E2E-08: on_hold sigue funcionando igual y no queda contaminado por los campos de waiting', async () => {
      const activity = await createActivity({ name: 'AC8 on_hold' });

      const response = await patchActivity(activity.id, {
        status: 'on_hold',
      }).expect(200);

      expect(response.body.data.status).toEqual('on_hold');
      expect(response.body.data.waitingFor).toBeNull();
      expect(response.body.data.waitingSince).toBeNull();
    });

    it('TC-032-E2E-08b: una actividad creada en on_hold antes de este spec no cambia de estado por el mero hecho de existir el enum ampliado', async () => {
      // La migración de spec-032 no hace backfill: no reclasifica ninguna
      // actividad existente. Este caso es una aproximación funcional (no
      // podemos re-ejecutar la migración dentro del e2e) — crea una
      // actividad en on_hold y confirma que una lectura posterior, sin
      // ninguna escritura de por medio, la deja intacta en on_hold. La
      // verificación real de "cero backfill" ocurre al correr la migración
      // en local (Fase 3 del spec).
      const activity = await createActivity({
        name: 'AC8b on_hold preexistente',
        status: 'on_hold',
      });

      const reread = await getActivity(activity.id);
      expect(reread.status).toEqual('on_hold');
    });
  });

  describe('Validación de DTO', () => {
    it('TC-032-E2E-09: waitingFor mayor a 255 caracteres es rechazado con 400', async () => {
      await createActivity(
        {
          name: 'AC9 waitingFor muy largo',
          status: 'waiting',
          waitingFor: 'x'.repeat(256),
        },
        400,
      );
    });

    it('TC-032-E2E-10: waitingSince con formato de fecha inválido es rechazado con 400', async () => {
      await createActivity(
        {
          name: 'AC10 waitingSince inválido',
          status: 'waiting',
          waitingSince: 'no-es-una-fecha',
        },
        400,
      );
    });
  });

  describe('Vistas Hoy / Vencidas y filtro por status', () => {
    it('TC-032-E2E-11: una actividad waiting con dueDate de hoy aparece en /activities/today', async () => {
      const todayNoon = new Date();
      todayNoon.setHours(12, 0, 0, 0);
      const activity = await createActivity({
        name: 'AC11 waiting hoy',
        status: 'waiting',
        dueDate: todayNoon.toISOString(),
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/activities/today')
        .set('Cookie', authCookies)
        .expect(200);

      const ids = response.body.data.map((a: { id: string }) => a.id);
      expect(ids).toContain(activity.id);
    });

    it('TC-032-E2E-12: una actividad waiting con dueDate vencido aparece en /activities/overdue', async () => {
      const overdueDate = addDays(new Date(), -10);
      overdueDate.setHours(12, 0, 0, 0);
      const activity = await createActivity({
        name: 'AC12 waiting vencida',
        status: 'waiting',
        dueDate: overdueDate.toISOString(),
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/activities/overdue')
        .set('Cookie', authCookies)
        .expect(200);

      const ids = response.body.data.map((a: { id: string }) => a.id);
      expect(ids).toContain(activity.id);
    });

    it('TC-032-E2E-13: GET /activities/status/waiting devuelve solo actividades en waiting', async () => {
      const waitingOne = await createActivity({
        name: 'AC13a waiting',
        status: 'waiting',
      });
      const onHoldOne = await createActivity({
        name: 'AC13b on_hold',
        status: 'on_hold',
      });
      const pendingOne = await createActivity({
        name: 'AC13c pending',
        status: 'pending',
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/activities/status/waiting')
        .set('Cookie', authCookies)
        .expect(200);

      const ids = response.body.data.map((a: { id: string }) => a.id);
      expect(ids).toContain(waitingOne.id);
      expect(ids).not.toContain(onHoldOne.id);
      expect(ids).not.toContain(pendingOne.id);
    });
  });

  describe('Regresión — interacción con spec-024 y spec-028', () => {
    it('TC-032-E2E-14: completed → waiting limpia completedAt (spec-028) y fija waitingSince, sin revertir la cascada de subtareas (spec-024)', async () => {
      const parent = await createActivity({ name: 'AC14 padre' });
      const child = await createActivity({
        name: 'AC14 hija',
        parentId: parent.id,
      });

      // Completar el padre dispara la cascada de spec-024 sobre la hija y
      // fija completedAt (spec-028) en el padre.
      const completedResponse = await patchActivity(parent.id, {
        status: 'completed',
      }).expect(200);
      expect(completedResponse.body.data.status).toEqual('completed');
      expect(completedResponse.body.data.completedAt).not.toBeNull();

      const completedChild = await getActivity(child.id);
      expect(completedChild.status).toEqual('completed');

      // Mover el padre a waiting en la misma llamada debe:
      // - limpiar completedAt (spec-028, ya no está completed)
      // - fijar waitingSince a hoy (spec-032, autocompletado por entrar en waiting)
      const waitingResponse = await patchActivity(parent.id, {
        status: 'waiting',
        waitingFor: 'El cliente',
      }).expect(200);

      expect(waitingResponse.body.data.status).toEqual('waiting');
      expect(waitingResponse.body.data.completedAt).toBeNull();
      expect(waitingResponse.body.data.waitingSince).toEqual(
        toDateOnlyString(new Date()),
      );
      expect(waitingResponse.body.data.waitingFor).toEqual('El cliente');

      // La cascada de spec-024 es de un solo sentido: la hija ya
      // completada por la cascada NO debe revertirse.
      const childAfter = await getActivity(child.id);
      expect(childAfter.status).toEqual('completed');
    });
  });
});
