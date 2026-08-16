// spec-027 — Limpieza del modelo de Activity: eliminar `notionUrl`,
// `isRecurring` y `type`.
//
// Redactado en modo test-first (@tester), ANTES de que exista la
// implementación: se espera que TODO este archivo esté en rojo hasta que
// spec-027 se implemente (columnas `type`/`notionUrl`/`isRecurring`
// eliminadas de `activities`, ruta `GET /activities/type/:type` eliminada,
// `isTemplate` derivado de `recurrenceFrequency`, tool MCP
// `get_activities_by_type` eliminada).
//
// ⚠️ RIESGO DETECTADO AL REDACTAR ESTE ARCHIVO (reportar antes de implementar,
// no corregido aquí): el criterio de aceptación "POST /activities con type,
// notionUrl o isRecurring en el body no falla, pero esas propiedades se
// descartan" asume el comportamiento de un ValidationPipe con
// `whitelist: true` y `forbidNonWhitelisted: false` — pero `main.ts` (y todos
// los bootstraps de e2e existentes, incluido este archivo, por consistencia)
// usan `forbidNonWhitelisted: true`. Con esa combinación, NestJS no descarta
// silenciosamente las propiedades no reconocidas: lanza `400 Bad Request`
// ("property type should not exist", etc.). El caso `AC-027-01` de abajo
// encodifica el criterio TAL COMO ESTÁ ESCRITO en el spec (expect 201 con las
// propiedades ausentes de la respuesta) — quedará en rojo tanto antes de
// implementar (hoy esas props sí se guardan y aparecen) como, muy
// probablemente, después de implementar (a menos que se decida no incluir
// `forbidNonWhitelisted` para esos tres campos, algo que el spec no
// contempla). Confirmar con @architect/el usuario antes de dar por buena la
// implementación: o se ajusta el criterio de aceptación (esperar 400), o se
// ajusta el pipe.

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
import { ActivityStatus } from './../src/common/enums/activity-status.enum';

const TEST_MCP_API_KEY = 'test-mcp-api-key-12345';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'TestPass123';

/**
 * Parses a StreamableHTTP/SSE response body from the MCP endpoint
 * (`event: message\ndata: {...}`) into the JSON-RPC payload.
 */
function parseMcpSse(text: string): any {
  const line = text.split('\n').find((l) => l.startsWith('data: '));
  if (!line) throw new Error(`No SSE data line found in MCP response: ${text}`);
  return JSON.parse(line.slice('data: '.length));
}

/** Parses the JSON payload embedded in a successful MCP tool result. */
function parseToolResult(rpcResponse: any): any {
  const text = rpcResponse.result?.content?.[0]?.text;
  if (text === undefined) return rpcResponse.result;
  return JSON.parse(text);
}

/** Returns an ISO datetime string for "today" at the given local hour/minute
 * — used to verify `dueDate` is persisted with the time the client sent,
 * without truncation to midnight (AC "dueDate sin truncar"). */
function todayAtLocalTime(hour: number, minute: number): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

describe('spec-027 — Limpieza del modelo de Activity (e2e)', () => {
  let app: INestApplication<App>;
  let authCookies: string[];
  let activityRepository: Repository<Activity>;
  // Deleted in reverse creation order so children/instances go before
  // parents/templates.
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

  async function createActivity(
    payload: Record<string, unknown>,
    expectedStatus = 201,
  ) {
    const response = await api()
      .post('/api/v1/activities')
      .set('Cookie', authCookies)
      .send({ name: '[E2E-027] Actividad de prueba', ...payload });
    expect(response.status).toBe(expectedStatus);
    if (response.status === 201 && response.body?.data?.id) {
      createdActivityIds.push(response.body.data.id);
    }
    return response;
  }

  describe('AC-027-01: type/notionUrl/isRecurring en el body se descartan silenciosamente', () => {
    it('POST /activities con esos campos no falla y no los persiste ni devuelve', async () => {
      const response = await createActivity({
        name: '[E2E-027] AC1 — campos descartados',
        type: 'reminder',
        notionUrl: 'https://notion.so/pagina-de-prueba',
        isRecurring: true,
      });

      expect(response.status).toBe(201);
      expect(response.body.data).not.toHaveProperty('type');
      expect(response.body.data).not.toHaveProperty('notionUrl');
      expect(response.body.data).not.toHaveProperty('isRecurring');
    });
  });

  describe('AC-027-02: la respuesta de GET /activities/:id no expone los campos eliminados', () => {
    it('el detalle de una actividad no contiene type, notionUrl ni isRecurring', async () => {
      const created = await createActivity({
        name: '[E2E-027] AC2 — detalle sin campos eliminados',
      });
      const id = created.body.data.id;

      const detail = await api()
        .get(`/api/v1/activities/${id}`)
        .set('Cookie', authCookies)
        .expect(200);

      expect(detail.body.data).not.toHaveProperty('type');
      expect(detail.body.data).not.toHaveProperty('notionUrl');
      expect(detail.body.data).not.toHaveProperty('isRecurring');
    });
  });

  describe('AC-027-03: GET /activities/type/:type ya no existe', () => {
    it('responde 404 en vez de una lista filtrada', async () => {
      await api()
        .get('/api/v1/activities/type/task')
        .set('Cookie', authCookies)
        .expect(404);
    });
  });

  describe('AC-027-04: recurrenceFrequency, no isRecurring, decide si una actividad es plantilla', () => {
    it('crear con recurrenceFrequency marca isTemplate:true sin enviar isRecurring', async () => {
      const response = await createActivity({
        name: '[E2E-027] AC4 — plantilla por recurrenceFrequency',
        recurrenceFrequency: 'daily',
      });

      expect(response.status).toBe(201);
      expect(response.body.data.isTemplate).toBe(true);
    });
  });

  describe('AC-027-05: PATCH recurrenceFrequency:null quita isTemplate pero no borra instancias', () => {
    it('deja isTemplate:false y las instancias ya generadas siguen existiendo', async () => {
      const template = await createActivity({
        name: '[E2E-027] AC5 — plantilla con instancia',
        recurrenceFrequency: 'daily',
      });
      const templateId = template.body.data.id;
      expect(template.body.data.isTemplate).toBe(true);

      // No existe endpoint público para generar instancias (las crea el cron
      // de recurrencia): se construye la instancia por el mismo repositorio
      // TypeORM que inyecta Nest, igual que hace el propio cron — no es un
      // bypass del código de producción, mismo criterio ya usado en
      // e2e-025 (`createInstanceOnlyActivity`).
      const instance = await activityRepository.save(
        activityRepository.create({
          name: '[E2E-027] AC5 — instancia generada',
          status: ActivityStatus.PENDING,
          isTemplate: false,
          templateId,
          instanceDate: new Date().toISOString().split('T')[0],
        } as Partial<Activity>),
      );
      createdActivityIds.push(instance.id);

      const patchResponse = await api()
        .patch(`/api/v1/activities/${templateId}`)
        .set('Cookie', authCookies)
        .send({ recurrenceFrequency: null })
        .expect(200);

      expect(patchResponse.body.data.isTemplate).toBe(false);

      const instanceStillExists = await api()
        .get(`/api/v1/activities/${instance.id}`)
        .set('Cookie', authCookies)
        .expect(200);
      expect(instanceStillExists.body.data.id).toBe(instance.id);
    });
  });

  describe('AC-027-06: recurrenceDays sin recurrenceFrequency no convierte la actividad en plantilla', () => {
    it('isTemplate permanece false', async () => {
      const response = await createActivity({
        name: '[E2E-027] AC6 — recurrenceDays sin frequency',
        recurrenceDays: [1, 3, 5],
      });

      expect(response.status).toBe(201);
      expect(response.body.data.isTemplate).toBe(false);
    });
  });

  describe('AC-027-07: cualquier actividad admite subtareas (ya no existe el tipo que lo prohibía)', () => {
    it('asignar parentId a una actividad con dueDate tipo "recordatorio" (fecha+hora) ya no se descarta', async () => {
      const parent = await createActivity({
        name: '[E2E-027] AC7 — padre con fecha y hora',
        dueDate: todayAtLocalTime(20, 15),
      });

      const child = await createActivity({
        name: '[E2E-027] AC7 — subtarea',
        parentId: parent.body.data.id,
      });

      expect(child.status).toBe(201);
      expect(child.body.data.parent?.id ?? child.body.data.parentId).toBe(
        parent.body.data.id,
      );

      const parentDetail = await api()
        .get(`/api/v1/activities/${parent.body.data.id}`)
        .set('Cookie', authCookies)
        .expect(200);
      const subtaskIds = (parentDetail.body.data.subtasks ?? []).map(
        (s: { id: string }) => s.id,
      );
      expect(subtaskIds).toContain(child.body.data.id);
    });
  });

  describe('AC-027-08: dueDate se persiste con la hora enviada, sin truncar a medianoche', () => {
    it('conserva la hora exacta y la actividad aparece en /activities/today', async () => {
      const dueDate = todayAtLocalTime(21, 45);

      const created = await createActivity({
        name: '[E2E-027] AC8 — dueDate con hora, hoy',
        dueDate,
      });

      expect(created.status).toBe(201);
      expect(new Date(created.body.data.dueDate).toISOString()).toBe(
        new Date(dueDate).toISOString(),
      );

      const today = await api()
        .get('/api/v1/activities/today')
        .set('Cookie', authCookies)
        .expect(200);
      const ids = today.body.data.map((a: { id: string }) => a.id);
      expect(ids).toContain(created.body.data.id);
    });
  });

  describe('MCP tools: create_activity, update_activity, create_recurring_activity, get_activities_by_type', () => {
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

    async function listTools(id: string) {
      const res = await request(app.getHttpServer())
        .post('/mcp')
        .set('Authorization', `Bearer ${TEST_MCP_API_KEY}`)
        .set('Accept', 'application/json, text/event-stream')
        .send({ jsonrpc: '2.0', id, method: 'tools/list', params: {} })
        .expect(200);
      return parseMcpSse(res.text);
    }

    it('TC-MCP-027-e2e-01: create_activity funciona sin `type` y la actividad creada no expone type/notionUrl/isRecurring', async () => {
      const rpcResponse = await callTool(
        'create_activity',
        { name: '[E2E-027] MCP — create_activity sin type' },
        'mcp-027-01',
      );

      expect(rpcResponse.error).toBeUndefined();
      const created = parseToolResult(rpcResponse);
      expect(created.id).toBeDefined();
      createdActivityIds.push(created.id);

      expect(created).not.toHaveProperty('type');
      expect(created).not.toHaveProperty('notionUrl');
      expect(created).not.toHaveProperty('isRecurring');
    });

    it('TC-MCP-027-e2e-02: `type`, `notionUrl` e `isRecurring` ya no están en los schemas de create_activity/update_activity/create_recurring_activity', async () => {
      const rpcResponse = await listTools('mcp-027-02');
      expect(rpcResponse.error).toBeUndefined();
      const tools = rpcResponse.result.tools as Array<{
        name: string;
        inputSchema: { properties?: Record<string, unknown> };
      }>;

      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain('create_activity');
      expect(toolNames).toContain('update_activity');
      expect(toolNames).toContain('create_recurring_activity');

      for (const toolName of [
        'create_activity',
        'update_activity',
        'create_recurring_activity',
      ]) {
        const tool = tools.find((t) => t.name === toolName)!;
        const props = Object.keys(tool.inputSchema.properties ?? {});
        expect(props).not.toContain('type');
        expect(props).not.toContain('notionUrl');
        expect(props).not.toContain('isRecurring');
      }
    });

    it('TC-MCP-027-e2e-03: get_activities_by_type ya no aparece en tools/list', async () => {
      const rpcResponse = await listTools('mcp-027-03');
      expect(rpcResponse.error).toBeUndefined();
      const toolNames = (
        rpcResponse.result.tools as Array<{ name: string }>
      ).map((t) => t.name);
      expect(toolNames).not.toContain('get_activities_by_type');
    });

    it('TC-MCP-027-e2e-04: invocar get_activities_by_type devuelve error de herramienta inexistente', async () => {
      const res = await request(app.getHttpServer())
        .post('/mcp')
        .set('Authorization', `Bearer ${TEST_MCP_API_KEY}`)
        .set('Accept', 'application/json, text/event-stream')
        .send({
          jsonrpc: '2.0',
          id: 'mcp-027-04',
          method: 'tools/call',
          params: {
            name: 'get_activities_by_type',
            arguments: { type: 'task' },
          },
        });

      // El SDK de MCP responde a una tool inexistente con un error a nivel de
      // protocolo JSON-RPC (no un `result` envuelto por err(), que el propio
      // servidor reserva para fallos de negocio dentro de una tool real —
      // ver el comentario equivalente en e2e-023). No se asume el texto
      // exacto del mensaje, solo que la llamada es rechazada como error.
      const parsed = res.status === 200 ? parseMcpSse(res.text) : res.body;
      expect(parsed.error ?? parsed.result?.isError).toBeTruthy();
    });
  });
});
