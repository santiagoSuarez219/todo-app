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

describe('spec-023 — Duplicar un gasto individual (e2e)', () => {
  let app: INestApplication<App>;
  let authCookies: string[];
  const createdExpenseIds: string[] = [];
  const createdCreditCardIds: string[] = [];

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
    // Clean up every resource created during this suite, in reverse order.
    for (const id of createdExpenseIds) {
      await request(app.getHttpServer())
        .delete(`/api/v1/finances/expenses/${id}`)
        .set('Cookie', authCookies);
    }
    for (const id of createdCreditCardIds) {
      await request(app.getHttpServer())
        .delete(`/api/v1/finances/credit-cards/${id}`)
        .set('Cookie', authCookies);
    }
    if (app) {
      await app.close();
    }
  });

  async function createExpense(overrides: Record<string, unknown> = {}) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/finances/expenses')
      .set('Cookie', authCookies)
      .send({
        description: 'Suscripción de prueba spec-023',
        amount: 45000,
        date: '2026-01-31',
        type: 'basico',
        ...overrides,
      })
      .expect(201);
    const expense = response.body.data;
    createdExpenseIds.push(expense.id);
    return expense;
  }

  async function createCreditCard() {
    const response = await request(app.getHttpServer())
      .post('/api/v1/finances/credit-cards')
      .set('Cookie', authCookies)
      .send({
        name: 'Visa spec-023',
        bank: 'Banco de pruebas',
        interestRate: 0.25,
        monthlyFee: 10000,
        totalLimit: 5000000,
        availableLimit: 3000000,
      })
      .expect(201);
    const card = response.body.data;
    createdCreditCardIds.push(card.id);
    return card;
  }

  describe('POST /api/v1/finances/expenses/:id/duplicate', () => {
    it('TC-023-01: duplicates an expense without a credit card, copying description/amount/type and shifting the date', async () => {
      const source = await createExpense({
        date: '2026-03-15',
        amount: 20000,
        type: 'lujo',
      });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/finances/expenses/${source.id}/duplicate`)
        .set('Cookie', authCookies)
        .send({ month: 6, year: 2026 })
        .expect(201);

      const duplicated = response.body.data;
      createdExpenseIds.push(duplicated.id);

      expect(duplicated.id).not.toEqual(source.id);
      expect(duplicated.description).toEqual(source.description);
      expect(Number(duplicated.amount)).toEqual(20000);
      expect(duplicated.type).toEqual('lujo');
      expect(duplicated.date).toEqual('2026-06-15');
      expect(duplicated.creditCard).toBeNull();
    });

    it('TC-023-02: duplicates an expense with a credit card, preserving the creditCardId', async () => {
      const card = await createCreditCard();
      const source = await createExpense({
        date: '2026-03-15',
        creditCardId: card.id,
      });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/finances/expenses/${source.id}/duplicate`)
        .set('Cookie', authCookies)
        .send({ month: 4, year: 2026 })
        .expect(201);

      const duplicated = response.body.data;
      createdExpenseIds.push(duplicated.id);

      expect(duplicated.creditCard).not.toBeNull();
      expect(duplicated.creditCard.id).toEqual(card.id);
    });

    it('TC-023-03: clamps day 31 to the last day of a 30-day destination month', async () => {
      const source = await createExpense({ date: '2026-01-31' });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/finances/expenses/${source.id}/duplicate`)
        .set('Cookie', authCookies)
        .send({ month: 4, year: 2026 }) // April has 30 days
        .expect(201);

      const duplicated = response.body.data;
      createdExpenseIds.push(duplicated.id);

      expect(duplicated.date).toEqual('2026-04-30');
    });

    it('TC-023-04: clamps January 31 to February 29 on a leap year', async () => {
      const source = await createExpense({ date: '2028-01-31' });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/finances/expenses/${source.id}/duplicate`)
        .set('Cookie', authCookies)
        .send({ month: 2, year: 2028 })
        .expect(201);

      const duplicated = response.body.data;
      createdExpenseIds.push(duplicated.id);

      expect(duplicated.date).toEqual('2028-02-29');
    });

    it('TC-023-05: clamps January 31 to February 28 on a non-leap year', async () => {
      const source = await createExpense({ date: '2026-01-31' });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/finances/expenses/${source.id}/duplicate`)
        .set('Cookie', authCookies)
        .send({ month: 2, year: 2026 })
        .expect(201);

      const duplicated = response.body.data;
      createdExpenseIds.push(duplicated.id);

      expect(duplicated.date).toEqual('2026-02-28');
    });

    it('TC-023-06: returns 404 when the source expense does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app.getHttpServer())
        .post(`/api/v1/finances/expenses/${nonExistentId}/duplicate`)
        .set('Cookie', authCookies)
        .send({ month: 6, year: 2026 })
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('MCP tool: duplicate_expense', () => {
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

    it('TC-MCP-023-01: duplicates an expense to a valid destination period without a credit card', async () => {
      const source = await createExpense({
        date: '2026-05-15',
        amount: 30000,
        type: 'ahorro',
      });

      const rpcResponse = await callTool(
        'duplicate_expense',
        { expenseId: source.id, month: 6, year: 2026 },
        'mcp-023-01',
      );

      expect(rpcResponse.error).toBeUndefined();
      const duplicated = parseToolResult(rpcResponse);
      createdExpenseIds.push(duplicated.id);

      expect(duplicated.id).not.toEqual(source.id);
      expect(duplicated.date).toEqual('2026-06-15');
      expect(duplicated.type).toEqual('ahorro');
      expect(duplicated.creditCard).toBeNull();
    });

    it('TC-MCP-023-02: duplicates an expense to a valid destination period preserving the credit card', async () => {
      const card = await createCreditCard();
      const source = await createExpense({
        date: '2026-05-15',
        creditCardId: card.id,
      });

      const rpcResponse = await callTool(
        'duplicate_expense',
        { expenseId: source.id, month: 7, year: 2026 },
        'mcp-023-02',
      );

      expect(rpcResponse.error).toBeUndefined();
      const duplicated = parseToolResult(rpcResponse);
      createdExpenseIds.push(duplicated.id);

      expect(duplicated.creditCard).not.toBeNull();
      expect(duplicated.creditCard.id).toEqual(card.id);
    });

    it('TC-MCP-023-03: returns an error when the source expense does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const rpcResponse = await callTool(
        'duplicate_expense',
        { expenseId: nonExistentId, month: 6, year: 2026 },
        'mcp-023-03',
      );

      // err() wraps NotFoundException as a tool result whose text starts with
      // "Error: " (JSON-RPC-level `error` is reserved for protocol/transport
      // failures — see mcp.service.ts's ok()/err() helpers).
      expect(rpcResponse.error).toBeUndefined();
      const errorText = rpcResponse.result.content[0].text as string;
      expect(errorText).toMatch(/^Error: /);
      expect(errorText).toMatch(/not found/i);
    });
  });
});
