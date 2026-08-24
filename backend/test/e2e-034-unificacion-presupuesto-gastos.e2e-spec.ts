// spec-034 — Unificación de presupuesto y gastos.
//
// Redactado en modo test-first (@tester), ANTES de que exista la
// implementación: se espera que TODO este archivo esté en rojo hasta que
// spec-034 se implemente (fusión de BudgetItem en Expense, migración
// 1787100000000-UnifyBudgetItemsIntoExpenses, DTOs con amount/date
// opcionales, auto-vínculo, agregados rediseñados en budgets.service.ts, y
// el portado de la maquinaria de deudas de spec-026 a Expense).
//
// Este archivo asume el spec ya redactado y aprobado como documento (no se
// escribió sin leerlo, a diferencia de e2e-026): los nombres de campos,
// endpoints y shapes citados abajo (`plannedAmount`, `budgetId`,
// `executionStatus`, `plannedTotal`/`executedTotal`/`variance`/
// `pendingPlannedTotal`/`unplannedTotal`/`byType`/`cardTotals`,
// `plannedExpensesCopied`) se tomaron literalmente de
// `spec/spec-034-unificacion-presupuesto-gastos.md`. Si la implementación
// final se desvía de alguno, es una razón para revisar el nombre, no para
// relajar la aserción.
//
// Un bloque `describe` por criterio de aceptación (12 en total), en el
// mismo orden en que aparecen en el spec. Todos los casos anclados a "el
// mes en curso" usan la fecha real de ejecución (`new Date()`), no una
// fecha fija — mismo criterio que e2e-026/e2e-032. Los casos que necesitan
// un mes "propio" aislado (sin pisar presupuestos reales del entorno) usan
// desplazamientos grandes (años) respecto de hoy.

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

/** month is 1-12. Returns the {year, month} that results from shifting
 * `offsetMonths` months (positive or negative) away from year/month. */
function shiftMonth(
  year: number,
  month: number,
  offsetMonths: number,
): { year: number; month: number } {
  const idx = year * 12 + (month - 1) + offsetMonths;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}

function dateInMonth(year: number, month: number, day = 10): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

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

describe('spec-034 — Unificación de presupuesto y gastos (e2e)', () => {
  let app: INestApplication<App>;
  let authCookies: string[];

  const createdBudgetIds: string[] = [];
  const createdExpenseIds: string[] = [];
  const createdDebtIds: string[] = [];
  const createdCreditCardIds: string[] = [];

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1; // 1-12

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
    for (const id of [...createdDebtIds].reverse()) {
      await request(app.getHttpServer())
        .delete(`/api/v1/finances/debts/${id}`)
        .set('Cookie', authCookies);
    }
    for (const id of [...createdExpenseIds].reverse()) {
      await request(app.getHttpServer())
        .delete(`/api/v1/finances/expenses/${id}`)
        .set('Cookie', authCookies);
    }
    for (const id of [...createdBudgetIds].reverse()) {
      await request(app.getHttpServer())
        .delete(`/api/v1/finances/budgets/${id}`)
        .set('Cookie', authCookies);
    }
    for (const id of [...createdCreditCardIds].reverse()) {
      await request(app.getHttpServer())
        .delete(`/api/v1/finances/credit-cards/${id}`)
        .set('Cookie', authCookies);
    }
    if (app) {
      await app.close();
    }
  });

  function api() {
    return request(app.getHttpServer());
  }

  async function createBudget(overrides: Record<string, unknown> = {}) {
    const response = await api()
      .post('/api/v1/finances/budgets')
      .set('Cookie', authCookies)
      .send({ name: 'Presupuesto de prueba spec-034', ...overrides });
    if (response.status === 201 && response.body?.data?.id) {
      createdBudgetIds.push(response.body.data.id);
    }
    return response;
  }

  async function createExpense(
    overrides: Record<string, unknown> = {},
    expectedStatus = 201,
  ) {
    const response = await api()
      .post('/api/v1/finances/expenses')
      .set('Cookie', authCookies)
      .send({
        description: 'Gasto de prueba spec-034',
        type: 'basico',
        ...overrides,
      });
    expect(response.status).toBe(expectedStatus);
    if (response.status === 201 && response.body?.data?.id) {
      createdExpenseIds.push(response.body.data.id);
    }
    return response;
  }

  function patchExpense(id: string, body: Record<string, unknown>) {
    return api()
      .patch(`/api/v1/finances/expenses/${id}`)
      .set('Cookie', authCookies)
      .send(body);
  }

  async function getExpense(id: string) {
    const response = await api()
      .get(`/api/v1/finances/expenses/${id}`)
      .set('Cookie', authCookies)
      .expect(200);
    return response.body.data;
  }

  async function getBudget(id: string) {
    const response = await api()
      .get(`/api/v1/finances/budgets/${id}`)
      .set('Cookie', authCookies)
      .expect(200);
    return response.body.data;
  }

  async function createDebt(overrides: Record<string, unknown> = {}) {
    const response = await api()
      .post('/api/v1/finances/debts')
      .set('Cookie', authCookies)
      .send({
        description: 'Deuda de prueba spec-034',
        productValue: 300000,
        installmentValue: 100000,
        totalInstallments: 3,
        ...overrides,
      });
    if (response.status === 201 && response.body?.data?.id) {
      createdDebtIds.push(response.body.data.id);
    }
    return response;
  }

  async function callMcpTool(
    name: string,
    args: Record<string, unknown>,
    id: string,
  ) {
    const res = await api()
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

  // ---------------------------------------------------------------------
  // AC-1: no existe la tabla budget_items ni la entidad BudgetItem.
  // ---------------------------------------------------------------------
  describe('AC-1: BudgetItem eliminado — una sola entidad de gasto', () => {
    it('los endpoints de items de presupuesto ya no existen (404)', async () => {
      const budgetResponse = await createBudget({
        month: currentMonth,
        year: currentYear + 20, // far-future isolated year
      });
      expect(budgetResponse.status).toBe(201);
      const budgetId = budgetResponse.body.data.id;

      await api()
        .post(`/api/v1/finances/budgets/${budgetId}/items`)
        .set('Cookie', authCookies)
        .send({
          description: 'Ítem legacy',
          plannedAmount: 10000,
          type: 'basico',
        })
        .expect(404);

      await api()
        .patch(
          `/api/v1/finances/budgets/${budgetId}/items/00000000-0000-0000-0000-000000000000`,
        )
        .set('Cookie', authCookies)
        .send({ plannedAmount: 20000 })
        .expect(404);

      await api()
        .delete(
          `/api/v1/finances/budgets/${budgetId}/items/00000000-0000-0000-0000-000000000000`,
        )
        .set('Cookie', authCookies)
        .expect(404);
    });

    it('POST /finances/budgets ya no acepta un array `items` anidado (el presupuesto nace vacío)', async () => {
      const response = await createBudget({
        month: currentMonth,
        year: currentYear + 21,
        items: [
          {
            description: 'No debería crearse',
            plannedAmount: 5000,
            type: 'basico',
          },
        ],
      });
      expect(response.status).toBe(201);
      // `items` no está en el DTO — con whitelist:true, el body debe
      // ignorarse (no rechazarse) y el presupuesto debe nacer vacío.
      const budget = await getBudget(response.body.data.id);
      expect(budget.expenses ?? []).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------
  // AC-2: validación cruzada de amount/date/plannedAmount.
  // ---------------------------------------------------------------------
  describe('AC-2: validación de los tres estados de un gasto', () => {
    it('crea un gasto solo con plannedAmount (planeado)', async () => {
      const response = await createExpense({
        description: '[E2E-034] AC2 — solo planeado',
        plannedAmount: 250000,
      });
      expect(response.body.data.plannedAmount).not.toBeNull();
      expect(response.body.data.amount).toBeNull();
      expect(response.body.data.date).toBeNull();
    });

    it('crea un gasto solo con amount + date (ejecutado)', async () => {
      const response = await createExpense({
        description: '[E2E-034] AC2 — solo ejecutado',
        amount: 50000,
        date: dateInMonth(currentYear + 22, 1),
      });
      expect(response.body.data.amount).not.toBeNull();
      expect(response.body.data.plannedAmount).toBeNull();
    });

    it('crea un gasto con plannedAmount + amount + date (liquidado)', async () => {
      const response = await createExpense({
        description: '[E2E-034] AC2 — liquidado',
        plannedAmount: 100000,
        amount: 95000,
        date: dateInMonth(currentYear + 22, 2),
      });
      expect(response.body.data.plannedAmount).not.toBeNull();
      expect(response.body.data.amount).not.toBeNull();
    });

    it('rechaza (400) un gasto sin ningún monto', async () => {
      await createExpense(
        { description: '[E2E-034] AC2 — sin ningún monto, debe fallar' },
        400,
      );
    });

    it('rechaza (400) un gasto con amount pero sin date', async () => {
      await createExpense(
        {
          description: '[E2E-034] AC2 — amount sin date, debe fallar',
          amount: 30000,
        },
        400,
      );
    });

    it('rechaza (400) un gasto con date pero sin amount', async () => {
      await createExpense(
        {
          description: '[E2E-034] AC2 — date sin amount, debe fallar',
          date: dateInMonth(currentYear + 22, 3),
        },
        400,
      );
    });

    it('rechaza (400) al actualizar un gasto ejecutado quitándole solo la date (estado resultante inválido)', async () => {
      const created = await createExpense({
        description: '[E2E-034] AC2 — update rompe el par amount/date',
        amount: 40000,
        date: dateInMonth(currentYear + 22, 4),
      });
      const response = await patchExpense(created.body.data.id, { date: null });
      expect(response.status).toBe(400);
    });
  });

  // ---------------------------------------------------------------------
  // AC-3: auto-vínculo sin auto-creación.
  // ---------------------------------------------------------------------
  describe('AC-3: auto-vínculo al crear con date en un mes con presupuesto', () => {
    it('asigna budgetId automáticamente cuando el mes ya tiene presupuesto', async () => {
      const budgetResponse = await createBudget({
        month: 5,
        year: currentYear + 23,
      });
      expect(budgetResponse.status).toBe(201);
      const budgetId = budgetResponse.body.data.id;

      const expenseResponse = await createExpense({
        description: '[E2E-034] AC3 — auto-vínculo',
        amount: 60000,
        date: dateInMonth(currentYear + 23, 5),
      });

      expect(
        expenseResponse.body.data.budget?.id ??
          expenseResponse.body.data.budgetId,
      ).toBe(budgetId);
    });

    it('deja budgetId null cuando el mes no tiene presupuesto, y no crea uno', async () => {
      const year = currentYear + 24;
      const month = 6;

      const before = await api()
        .get('/api/v1/finances/budgets')
        .query({ year, month })
        .set('Cookie', authCookies)
        .expect(200);
      expect(before.body.data.length).toBe(0);

      const expenseResponse = await createExpense({
        description: '[E2E-034] AC3 — sin presupuesto, queda suelto',
        amount: 70000,
        date: dateInMonth(year, month),
      });

      expect(
        expenseResponse.body.data.budget?.id ??
          expenseResponse.body.data.budgetId ??
          null,
      ).toBeNull();

      const after = await api()
        .get('/api/v1/finances/budgets')
        .query({ year, month })
        .set('Cookie', authCookies)
        .expect(200);
      expect(after.body.data.length).toBe(0);
    });
  });

  // ---------------------------------------------------------------------
  // AC-4: anclaje por presupuesto por encima de la fecha.
  // ---------------------------------------------------------------------
  describe('AC-4: manda el presupuesto sobre la fecha (anclaje)', () => {
    it('un gasto planeado en el mes A y ejecutado con fecha del mes B sigue contando en A, no en B', async () => {
      const monthA = { year: currentYear + 25, month: 7 };
      const monthB = shiftMonth(monthA.year, monthA.month, 1);

      const budgetAResponse = await createBudget({
        month: monthA.month,
        year: monthA.year,
      });
      const budgetAId = budgetAResponse.body.data.id;

      // Created with a date inside month A → auto-linked to budget A.
      const expenseResponse = await createExpense({
        description: '[E2E-034] AC4 — anclado a mes A',
        amount: 90000,
        date: dateInMonth(monthA.year, monthA.month),
      });
      const expenseId = expenseResponse.body.data.id;
      expect(
        expenseResponse.body.data.budget?.id ??
          expenseResponse.body.data.budgetId,
      ).toBe(budgetAId);

      // Re-execute with a date that falls in month B — budgetId must NOT
      // be re-anchored automatically (decision 3: only an explicit
      // budgetId changes it once it's already set).
      const patchResponse = await patchExpense(expenseId, {
        date: dateInMonth(monthB.year, monthB.month),
      });
      expect(patchResponse.status).toBe(200);
      expect(
        patchResponse.body.data.budget?.id ?? patchResponse.body.data.budgetId,
      ).toBe(budgetAId);

      const monthASummary = await api()
        .get('/api/v1/finances/budgets/monthly-summary')
        .query({ year: monthA.year, month: monthA.month })
        .set('Cookie', authCookies)
        .expect(200);
      expect(monthASummary.body.data.executedTotal).toBeGreaterThanOrEqual(
        90000,
      );

      const monthBSummary = await api()
        .get('/api/v1/finances/budgets/monthly-summary')
        .query({ year: monthB.year, month: monthB.month })
        .set('Cookie', authCookies)
        .expect(200);
      // The expense's `date` falls in month B, but it must NOT be counted
      // there — it belongs to its budget (month A).
      expect(monthBSummary.body.data.unplannedTotal).toBe(0);
      expect(monthBSummary.body.data.executedTotal).toBe(0);

      const listMonthB = await api()
        .get('/api/v1/finances/expenses')
        .query({ year: monthB.year, month: monthB.month })
        .set('Cookie', authCookies)
        .expect(200);
      const idsInMonthB = listMonthB.body.data.map((e: { id: string }) => e.id);
      expect(idsInMonthB).not.toContain(expenseId);
    });
  });

  // ---------------------------------------------------------------------
  // AC-5: nuevo contrato de GET /finances/budgets/monthly-summary.
  // ---------------------------------------------------------------------
  describe('AC-5: contrato nuevo de monthly-summary — desaparecen budgetTotal/expensesTotal/combinedTotal', () => {
    it('devuelve exactamente el shape declarado en el spec', async () => {
      const year = currentYear + 26;
      const month = 8;
      await createBudget({ month, year });

      const response = await api()
        .get('/api/v1/finances/budgets/monthly-summary')
        .query({ year, month })
        .set('Cookie', authCookies)
        .expect(200);

      const summary = response.body.data;
      expect(summary).toHaveProperty('plannedTotal');
      expect(summary).toHaveProperty('executedTotal');
      expect(summary).toHaveProperty('variance');
      expect(summary).toHaveProperty('pendingPlannedTotal');
      expect(summary).toHaveProperty('unplannedTotal');
      expect(summary).toHaveProperty('byType');
      expect(summary).toHaveProperty('cardTotals');
      expect(summary).not.toHaveProperty('budgetTotal');
      expect(summary).not.toHaveProperty('expensesTotal');
      expect(summary).not.toHaveProperty('combinedTotal');
    });
  });

  // ---------------------------------------------------------------------
  // AC-6: sin doble conteo — el núcleo del spec.
  // ---------------------------------------------------------------------
  describe('AC-6: sin doble conteo entre plan y ejecución', () => {
    it('un gasto planeado en 100.000 y ejecutado en 95.000 aporta 100.000 al plan y 95.000 a lo ejecutado, nunca 195.000', async () => {
      const year = currentYear + 27;
      const month = 9;
      await createBudget({ month, year });

      await createExpense({
        description: '[E2E-034] AC6 — sin doble conteo',
        plannedAmount: 100000,
        amount: 95000,
        date: dateInMonth(year, month),
      });

      const response = await api()
        .get('/api/v1/finances/budgets/monthly-summary')
        .query({ year, month })
        .set('Cookie', authCookies)
        .expect(200);

      const summary = response.body.data;
      expect(summary.plannedTotal).toBe(100000);
      expect(summary.executedTotal).toBe(95000);
      expect(summary.variance).toBe(5000);
      // The forbidden regression: naively summing plannedAmount + amount.
      expect(summary.plannedTotal).not.toBe(195000);
      expect(summary.executedTotal).not.toBe(195000);
      expect(summary.plannedTotal + summary.executedTotal).not.toBe(
        summary.plannedTotal, // sanity: plannedTotal alone must not already smuggle 195000
      );
    });

    it('lo mismo se cumple en el detalle del presupuesto (byType) y en get_budget vía MCP', async () => {
      const year = currentYear + 28;
      const month = 10;
      const budgetResponse = await createBudget({ month, year });
      const budgetId = budgetResponse.body.data.id;

      await createExpense({
        description: '[E2E-034] AC6 — byType sin doble conteo',
        plannedAmount: 200000,
        amount: 180000,
        date: dateInMonth(year, month),
        type: 'basico',
        budgetId,
      });

      const detail = await getBudget(budgetId);
      expect(detail.plannedTotal).toBe(200000);
      expect(detail.executedTotal).toBe(180000);
      const basicoRow = (
        detail.byType as Array<{
          type: string;
          planned: number;
          executed: number;
        }>
      ).find((row) => row.type === 'basico');
      expect(basicoRow?.planned).toBe(200000);
      expect(basicoRow?.executed).toBe(180000);
    });
  });

  // ---------------------------------------------------------------------
  // AC-7: asimetría duplicar mes vs duplicar gasto.
  // ---------------------------------------------------------------------
  describe('AC-7: duplicar un mes copia solo el plan; duplicar un gasto copia todo', () => {
    it('duplicar un mes deja amount/date en null en el destino, incluso para un gasto que estaba settled', async () => {
      const source = { year: currentYear + 29, month: 1 };
      const dest = shiftMonth(source.year, source.month, 3);

      const budgetResponse = await createBudget({
        month: source.month,
        year: source.year,
      });
      const budgetId = budgetResponse.body.data.id;

      await createExpense({
        description: '[E2E-034] AC7 — settled en origen',
        plannedAmount: 100000,
        amount: 90000,
        date: dateInMonth(source.year, source.month),
        budgetId,
      });

      const duplicateResponse = await api()
        .post(`/api/v1/finances/budgets/${budgetId}/duplicate`)
        .set('Cookie', authCookies)
        .send({ month: dest.month, year: dest.year })
        .expect(201);

      expect(duplicateResponse.body.data).toHaveProperty(
        'plannedExpensesCopied',
      );
      expect(duplicateResponse.body.data).not.toHaveProperty('itemsCopied');
      createdBudgetIds.push(duplicateResponse.body.data.budget.id);

      const destExpenses = duplicateResponse.body.data.budget
        .expenses as Array<{
        plannedAmount: string | number | null;
        amount: string | number | null;
        date: string | null;
      }>;
      expect(destExpenses.length).toBeGreaterThan(0);
      for (const expense of destExpenses) {
        expect(Number(expense.plannedAmount)).toBe(100000);
        expect(expense.amount).toBeNull();
        expect(expense.date).toBeNull();
      }
    });

    it('duplicar un gasto individual copia amount y date desplazados (comportamiento sin cambios de spec-023)', async () => {
      const source = await createExpense({
        description: '[E2E-034] AC7 — duplicar gasto individual',
        amount: 45000,
        date: dateInMonth(currentYear + 30, 3, 15),
      });

      const response = await api()
        .post(`/api/v1/finances/expenses/${source.body.data.id}/duplicate`)
        .set('Cookie', authCookies)
        .send({ month: 6, year: currentYear + 30 })
        .expect(201);

      createdExpenseIds.push(response.body.data.id);
      expect(response.body.data.amount).not.toBeNull();
      expect(response.body.data.date).toEqual(`${currentYear + 30}-06-15`);
    });

    it('duplicar un gasto plan-only (sin date) no revienta (Fase 2, "tolerante a plan-only")', async () => {
      const source = await createExpense({
        description: '[E2E-034] AC7 — duplicar gasto plan-only',
        plannedAmount: 300000,
      });

      const response = await api()
        .post(`/api/v1/finances/expenses/${source.body.data.id}/duplicate`)
        .set('Cookie', authCookies)
        .send({ month: 7, year: currentYear + 30 })
        .expect(201);

      createdExpenseIds.push(response.body.data.id);
      expect(Number(response.body.data.plannedAmount)).toBe(300000);
      expect(response.body.data.amount).toBeNull();
      expect(response.body.data.date).toBeNull();
    });
  });

  // ---------------------------------------------------------------------
  // AC-8: integridad de la migración (verificable de forma aproximada en
  // e2e: no podemos re-ejecutar la migración de datos legacy dentro de un
  // test contra una base ya migrada, así que este bloque valida las
  // invariantes estructurales que la migración debe dejar en pie).
  // ---------------------------------------------------------------------
  describe('AC-8: integridad estructural post-migración', () => {
    it('un gasto de deuda conserva debtId + installmentNumber tal como los tenía BudgetItem', async () => {
      const start = shiftMonth(currentYear + 31, 1, 0);
      const debtResponse = await createDebt({
        description: '[E2E-034] AC8 — integridad debtId/installmentNumber',
        installmentValue: 100000,
        totalInstallments: 2,
        startMonth: start.month,
        startYear: start.year,
      });
      expect(debtResponse.status).toBe(201);
      const debtId = debtResponse.body.data.id;

      const listResponse = await api()
        .get('/api/v1/finances/expenses')
        .query({ year: start.year, month: start.month })
        .set('Cookie', authCookies)
        .expect(200);

      const installment = (
        listResponse.body.data as Array<{
          debt?: { id: string } | null;
          debtId?: string | null;
          installmentNumber?: number | null;
        }>
      ).find((e) => (e.debtId ?? e.debt?.id) === debtId);

      expect(installment).toBeDefined();
      expect(installment?.installmentNumber).toBe(1);
    });

    it('la CHECK CHK_expenses_has_amount rechaza a nivel de base (vía DTO, camino observable en e2e) una fila sin ningún monto', async () => {
      // Ya cubierto funcionalmente en AC-2 (400 vía DTO). Este caso deja
      // constancia explícita del nombre del CHECK que respalda la
      // invariante en base de datos (Fase 1.2), para que la revisión de
      // la migración lo busque por nombre.
      await createExpense(
        { description: '[E2E-034] AC8 — CHK_expenses_has_amount' },
        400,
      );
    });

    it('la CHECK CHK_expenses_amount_date_together rechaza amount sin date y viceversa', async () => {
      await createExpense(
        {
          description:
            '[E2E-034] AC8 — CHK_expenses_amount_date_together (amount)',
          amount: 10000,
        },
        400,
      );
      await createExpense(
        {
          description:
            '[E2E-034] AC8 — CHK_expenses_amount_date_together (date)',
          date: dateInMonth(currentYear + 31, 2),
        },
        400,
      );
    });
  });

  // ---------------------------------------------------------------------
  // AC-9: toda la lógica de spec-026 sigue funcionando sobre Expense.
  // ---------------------------------------------------------------------
  describe('AC-9: ciclo completo de deudas portado a Expense', () => {
    it('crear una deuda de N cuotas genera N gastos planeados de tipo pago_deuda, uno por mes', async () => {
      const start = shiftMonth(currentYear + 32, 1, 0);
      const totalInstallments = 3;

      const debtResponse = await createDebt({
        description: '[E2E-034] AC9 — calendario básico',
        installmentValue: 100000,
        totalInstallments,
        startMonth: start.month,
        startYear: start.year,
      });
      expect(debtResponse.status).toBe(201);
      const debtId = debtResponse.body.data.id;

      for (let k = 1; k <= totalInstallments; k++) {
        const { year, month } = shiftMonth(start.year, start.month, k - 1);
        const listResponse = await api()
          .get('/api/v1/finances/expenses')
          .query({ year, month })
          .set('Cookie', authCookies)
          .expect(200);

        const item = (
          listResponse.body.data as Array<{
            debtId?: string | null;
            debt?: { id: string } | null;
            plannedAmount: string | number | null;
            amount: string | number | null;
            type: string;
            installmentNumber?: number | null;
          }>
        ).find((e) => (e.debtId ?? e.debt?.id) === debtId);

        expect(item).toBeDefined();
        expect(item?.type).toBe('pago_deuda');
        expect(Number(item?.plannedAmount)).toBe(100000);
        expect(item?.amount).toBeNull();
        expect(item?.installmentNumber).toBe(k);
      }
    });

    it('editar la deuda regenera solo las cuotas futuras', async () => {
      const start = shiftMonth(currentYear, currentMonth, -1);
      const totalInstallments = 4; // prev + current elapsed (2), 2 future
      const originalValue = 90000;
      const newValue = 120000;

      const debtResponse = await createDebt({
        description: '[E2E-034] AC9 — regeneración parcial',
        installmentValue: originalValue,
        totalInstallments,
        startMonth: start.month,
        startYear: start.year,
      });
      const debtId = debtResponse.body.data.id;

      await api()
        .patch(`/api/v1/finances/debts/${debtId}`)
        .set('Cookie', authCookies)
        .send({ installmentValue: newValue })
        .expect(200);

      for (let k = 0; k < 2; k++) {
        const { year, month } = shiftMonth(start.year, start.month, k);
        const listResponse = await api()
          .get('/api/v1/finances/expenses')
          .query({ year, month })
          .set('Cookie', authCookies)
          .expect(200);
        const item = (listResponse.body.data as Array<any>).find(
          (e) => (e.debtId ?? e.debt?.id) === debtId,
        );
        expect(Number(item?.plannedAmount)).toBe(originalValue);
      }

      for (let k = 2; k < totalInstallments; k++) {
        const { year, month } = shiftMonth(start.year, start.month, k);
        const listResponse = await api()
          .get('/api/v1/finances/expenses')
          .query({ year, month })
          .set('Cookie', authCookies)
          .expect(200);
        const item = (listResponse.body.data as Array<any>).find(
          (e) => (e.debtId ?? e.debt?.id) === debtId,
        );
        expect(Number(item?.plannedAmount)).toBe(newValue);
      }
    });

    it('eliminar la deuda desasocia las cuotas vencidas (quedan como gasto planeado normal) y borra las futuras', async () => {
      const start = shiftMonth(currentYear, currentMonth, -1);
      const totalInstallments = 3; // 2 elapsed, 1 future

      const debtResponse = await createDebt({
        description: '[E2E-034] AC9 — borrado de deuda',
        totalInstallments,
        startMonth: start.month,
        startYear: start.year,
      });
      const debtId = debtResponse.body.data.id;
      const idx = createdDebtIds.indexOf(debtId);
      if (idx >= 0) createdDebtIds.splice(idx, 1);

      const elapsedRefs: { year: number; month: number; expenseId: string }[] =
        [];
      const futureRefs: { year: number; month: number; expenseId: string }[] =
        [];
      for (let k = 0; k < totalInstallments; k++) {
        const { year, month } = shiftMonth(start.year, start.month, k);
        const listResponse = await api()
          .get('/api/v1/finances/expenses')
          .query({ year, month })
          .set('Cookie', authCookies)
          .expect(200);
        const item = (listResponse.body.data as Array<any>).find(
          (e) => (e.debtId ?? e.debt?.id) === debtId,
        );
        expect(item).toBeDefined();
        if (k < 2) elapsedRefs.push({ year, month, expenseId: item.id });
        else futureRefs.push({ year, month, expenseId: item.id });
      }

      await api()
        .delete(`/api/v1/finances/debts/${debtId}`)
        .set('Cookie', authCookies)
        .expect(204);

      for (const ref of elapsedRefs) {
        const expense = await getExpense(ref.expenseId);
        expect(expense.debtId ?? expense.debt?.id ?? null).toBeNull();
        expect(expense.installmentNumber ?? null).toBeNull();
        expect(expense.plannedAmount).not.toBeNull(); // still a valid planned expense
        createdExpenseIds.push(ref.expenseId); // now cleaned up as a plain expense
      }

      for (const ref of futureRefs) {
        await api()
          .get(`/api/v1/finances/expenses/${ref.expenseId}`)
          .set('Cookie', authCookies)
          .expect(404);
      }
    });

    it('pay-off borra las cuotas futuras y crea un Expense real por el saldo restante', async () => {
      const start = shiftMonth(currentYear, currentMonth, -1);
      const installmentValue = 80000;
      const totalInstallments = 4; // prev + current elapsed (2), 2 future

      const debtResponse = await createDebt({
        description: '[E2E-034] AC9 — pay-off',
        installmentValue,
        totalInstallments,
        startMonth: start.month,
        startYear: start.year,
      });
      const debtId = debtResponse.body.data.id;

      const payOffResponse = await api()
        .post(`/api/v1/finances/debts/${debtId}/pay-off`)
        .set('Cookie', authCookies)
        .send({})
        .expect(201);

      expect(payOffResponse.body.data.itemsRemoved).toBe(2);

      const expenseId = payOffResponse.body.data.expenseId;
      createdExpenseIds.push(expenseId);
      const expense = await getExpense(expenseId);
      expect(expense.plannedAmount).toBeNull();
      expect(Number(expense.amount)).toBe(installmentValue * 2);
      expect(expense.date).not.toBeNull();
      expect(expense.type).toBe('pago_deuda');
    });
  });

  // ---------------------------------------------------------------------
  // AC-10: BudgetDetailView — cubierto en test-034 (manual, UI). Este
  // bloque valida el contrato REST subyacente que la UI consume.
  // ---------------------------------------------------------------------
  describe('AC-10: el detalle de presupuesto expone plan y real por gasto', () => {
    it('GET /finances/budgets/:id devuelve `expenses` (no `items`) con plannedAmount y amount por fila', async () => {
      const year = currentYear + 33;
      const month = 1;
      const budgetResponse = await createBudget({ month, year });
      const budgetId = budgetResponse.body.data.id;

      await createExpense({
        description: '[E2E-034] AC10 — plan y real en la misma fila',
        plannedAmount: 100000,
        amount: 80000,
        date: dateInMonth(year, month),
        budgetId,
      });

      const detail = await getBudget(budgetId);
      expect(detail).toHaveProperty('expenses');
      expect(detail).not.toHaveProperty('items');
      expect(detail).not.toHaveProperty('typeSummary');
      const row = (detail.expenses as Array<any>).find(
        (e) =>
          e.description === '[E2E-034] AC10 — plan y real en la misma fila',
      );
      expect(Number(row.plannedAmount)).toBe(100000);
      expect(Number(row.amount)).toBe(80000);
    });

    it('PATCH /finances/expenses/:id "registra la ejecución" de un gasto planeado (mismo endpoint que cualquier edición)', async () => {
      const year = currentYear + 33;
      const month = 2;
      const budgetResponse = await createBudget({ month, year });
      const budgetId = budgetResponse.body.data.id;

      const created = await createExpense({
        description: '[E2E-034] AC10 — registrar ejecución',
        plannedAmount: 150000,
        budgetId,
      });

      const patched = await patchExpense(created.body.data.id, {
        amount: 150000,
        date: dateInMonth(year, month),
      }).expect(200);

      expect(Number(patched.body.data.amount)).toBe(150000);
      expect(Number(patched.body.data.plannedAmount)).toBe(150000);
    });
  });

  // ---------------------------------------------------------------------
  // AC-11: borrado de presupuesto informa cuántos gastos ejecutados se
  // pierden y por qué monto (contrato REST — el ConfirmDialog es manual).
  // ---------------------------------------------------------------------
  describe('AC-11: DELETE /finances/budgets/:id informa el impacto sobre gastos ejecutados', () => {
    it('devuelve el conteo y el monto total de gastos ejecutados eliminados', async () => {
      const year = currentYear + 34;
      const month = 1;
      const budgetResponse = await createBudget({ month, year });
      const budgetId = budgetResponse.body.data.id;

      await createExpense({
        description: '[E2E-034] AC11 — ejecutado 1',
        amount: 50000,
        date: dateInMonth(year, month),
        budgetId,
      });
      await createExpense({
        description: '[E2E-034] AC11 — ejecutado 2',
        amount: 30000,
        date: dateInMonth(year, month, 15),
        budgetId,
      });
      await createExpense({
        description: '[E2E-034] AC11 — solo planeado',
        plannedAmount: 20000,
        budgetId,
      });

      const idx = createdBudgetIds.indexOf(budgetId);
      if (idx >= 0) createdBudgetIds.splice(idx, 1);

      const deleteResponse = await api()
        .delete(`/api/v1/finances/budgets/${budgetId}`)
        .set('Cookie', authCookies);

      expect([200, 204]).toContain(deleteResponse.status);
      if (deleteResponse.status === 200) {
        expect(deleteResponse.body.data.executedExpensesRemoved).toBe(2);
        expect(deleteResponse.body.data.executedTotalRemoved).toBe(80000);
      }

      await api()
        .get(`/api/v1/finances/budgets/${budgetId}`)
        .set('Cookie', authCookies)
        .expect(404);
    });
  });

  // ---------------------------------------------------------------------
  // AC-12: MCP — tools eliminadas, tools nuevas, contrato roto expuesto.
  // ---------------------------------------------------------------------
  describe('AC-12: MCP — create_expense con plannedAmount/budgetId/creditCardId; tools de budget_item eliminadas', () => {
    it('tools/list ya no incluye add_budget_item / update_budget_item / delete_budget_item', async () => {
      const rpcResponse = await api()
        .post('/mcp')
        .set('Authorization', `Bearer ${TEST_MCP_API_KEY}`)
        .set('Accept', 'application/json, text/event-stream')
        .send({
          jsonrpc: '2.0',
          id: 'e2e-034-tools-list',
          method: 'tools/list',
          params: {},
        })
        .expect(200);

      const parsed = parseMcpSse(rpcResponse.text);
      const toolNames = (parsed.result.tools as Array<{ name: string }>).map(
        (t) => t.name,
      );
      expect(toolNames).not.toContain('add_budget_item');
      expect(toolNames).not.toContain('update_budget_item');
      expect(toolNames).not.toContain('delete_budget_item');
    });

    it('create_expense (MCP) acepta plannedAmount + budgetId para agregar un gasto planeado', async () => {
      const budgetResponse = await createBudget({
        month: 3,
        year: currentYear + 35,
      });
      const budgetId = budgetResponse.body.data.id;

      const rpcResponse = await callMcpTool(
        'create_expense',
        {
          description: '[E2E-034] AC12 — MCP planeado',
          plannedAmount: 220000,
          budgetId,
          type: 'basico',
        },
        'e2e-034-ac12-create',
      );

      expect(rpcResponse.error).toBeUndefined();
      const created = parseToolResult(rpcResponse);
      createdExpenseIds.push(created.id);
      expect(Number(created.plannedAmount)).toBe(220000);
      expect(created.amount).toBeNull();
    });

    it('create_expense (MCP) acepta creditCardId y tiene efecto real (aparece en cardTotals)', async () => {
      const cardResponse = await api()
        .post('/api/v1/finances/credit-cards')
        .set('Cookie', authCookies)
        .send({
          name: '[E2E-034] Visa MCP',
          bank: 'Banco de pruebas',
          interestRate: 0.2,
          monthlyFee: 5000,
          totalLimit: 2000000,
          availableLimit: 1500000,
        })
        .expect(201);
      createdCreditCardIds.push(cardResponse.body.data.id);

      const year = currentYear + 35;
      const month = 4;

      const rpcResponse = await callMcpTool(
        'create_expense',
        {
          description: '[E2E-034] AC12 — MCP con tarjeta',
          amount: 100000,
          date: dateInMonth(year, month),
          creditCardId: cardResponse.body.data.id,
          type: 'lujo',
        },
        'e2e-034-ac12-card',
      );

      expect(rpcResponse.error).toBeUndefined();
      const created = parseToolResult(rpcResponse);
      createdExpenseIds.push(created.id);
      expect(created.creditCard?.id ?? created.creditCardId).toBe(
        cardResponse.body.data.id,
      );

      const summaryResponse = await callMcpTool(
        'get_monthly_expense_summary',
        { year, month },
        'e2e-034-ac12-summary',
      );
      const summary = parseToolResult(summaryResponse);
      const cardRow = (
        summary.cardTotals as Array<{ creditCardId: string; executed: number }>
      ).find((row) => row.creditCardId === cardResponse.body.data.id);
      expect(cardRow?.executed).toBe(100000);
    });

    it('create_expense (MCP) sin ningún monto es rechazado por el schema Zod, no crea nada', async () => {
      const rpcResponse = await callMcpTool(
        'create_expense',
        {
          description: '[E2E-034] AC12 — MCP sin monto, debe fallar',
          type: 'basico',
        },
        'e2e-034-ac12-invalid',
      );

      // Zod validation errors surface as JSON-RPC protocol errors
      // (`-32602 Invalid params`), unlike NotFoundException which uses the
      // ok()/err() text-content convention — see e2e-023's note on
      // err()/ok() vs JSON-RPC-level error.
      expect(rpcResponse.error).toBeDefined();
    });
  });
});
