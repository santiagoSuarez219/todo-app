// spec-026 — Deudas: calendario de cuotas materializado en presupuestos.
//
// Redactado en modo test-first (@tester), ANTES de que exista la
// implementación: se espera que TODO este archivo esté en rojo hasta que
// spec-026 se implemente (columnas nuevas en `debts`/`budget_items`,
// endpoints `pay-off`/`sync-budget-items`, y la baja de `POST
// /finances/debts/:id/pay`).
//
// Redactado sin haber leído `spec/spec-026-deudas-cuotas-en-presupuesto.md`
// (instrucción explícita — el spec se está redactando en paralelo). Los
// nombres de campos (`startMonth`, `startYear`, `paidOffAt`,
// `installmentNumber`, endpoints `pay-off`/`sync-budget-items`) y los
// formatos de texto (`"Cuota k/N — <descripción>"`,
// `"Presupuesto <Mes> <Año>"`, `"Pago total: <descripción>"`) se tomaron
// literalmente de la descripción funcional que acompañó este encargo. Si el
// spec definitivo los nombra distinto, este archivo debe actualizarse junto
// con la implementación (no es una razón para no ponerlo en verde, es una
// razón para revisar que el nombre coincida).
//
// Todos los casos anclados a "el mes en curso" usan la fecha real de
// ejecución (`new Date()`), no una fecha fija, igual que se comportaría la
// aplicación en producción. Los casos que solo necesitan un mes "propio"
// aislado (sin pisar presupuestos reales del entorno) usan desplazamientos
// grandes (años) respecto de hoy para minimizar el riesgo de colisión con
// datos reales del entorno de desarrollo.

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

const MONTH_NAMES_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

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

describe('spec-026 — Deudas: calendario de cuotas en presupuesto (e2e)', () => {
  let app: INestApplication<App>;
  let authCookies: string[];

  const createdDebtIds: string[] = [];
  // Budgets we fully own (created in isolated far-future/past months) — safe
  // to delete entirely in cleanup.
  const ownedBudgetIds: string[] = [];
  // {budgetId, itemId} pairs added onto budgets we do NOT fully own (e.g. the
  // real current-month budget) — cleaned up item-by-item.
  const looseItemRefs: { budgetId: string; itemId: string }[] = [];
  const createdExpenseIds: string[] = [];

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
    // Loose items first (they may belong to budgets we don't own).
    for (const { budgetId, itemId } of looseItemRefs.reverse()) {
      await request(app.getHttpServer())
        .delete(`/api/v1/finances/budgets/${budgetId}/items/${itemId}`)
        .set('Cookie', authCookies);
    }
    // Debts next (may cascade-delete future items / desassociate past ones).
    for (const id of [...createdDebtIds].reverse()) {
      await request(app.getHttpServer())
        .delete(`/api/v1/finances/debts/${id}`)
        .set('Cookie', authCookies);
    }
    // Expenses created via pay-off.
    for (const id of [...createdExpenseIds].reverse()) {
      await request(app.getHttpServer())
        .delete(`/api/v1/finances/expenses/${id}`)
        .set('Cookie', authCookies);
    }
    // Budgets we fully own.
    for (const id of [...ownedBudgetIds].reverse()) {
      await request(app.getHttpServer())
        .delete(`/api/v1/finances/budgets/${id}`)
        .set('Cookie', authCookies);
    }
    if (app) {
      await app.close();
    }
  });

  function api() {
    return request(app.getHttpServer());
  }

  async function createDebt(overrides: Record<string, unknown>) {
    const response = await api()
      .post('/api/v1/finances/debts')
      .set('Cookie', authCookies)
      .send({
        description: 'Deuda de prueba spec-026',
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

  async function getBudgetsForMonth(year: number, month: number) {
    const response = await api()
      .get('/api/v1/finances/budgets')
      .query({ year, month })
      .set('Cookie', authCookies)
      .expect(200);
    return response.body.data as Array<{
      id: string;
      name: string;
      month: number;
      year: number;
      items: Array<{
        id: string;
        description: string;
        plannedAmount: string | number;
        type: string;
        debt?: { id: string } | null;
        debtId?: string | null;
        installmentNumber?: number | null;
      }>;
    }>;
  }

  function itemDebtId(item: { debt?: { id: string } | null; debtId?: string | null }) {
    return item.debtId ?? item.debt?.id ?? null;
  }

  describe('POST /api/v1/finances/debts (AC-1, AC-2, AC-3): calendario de cuotas al crear', () => {
    it('AC-1: crea exactamente N BudgetItem consecutivos con debtId e installmentNumber correctos', async () => {
      // Isolated far-future window (currentYear + 7) to avoid any real data.
      const start = shiftMonth(currentYear + 7, 1, 2); // month 3 of that year
      const totalInstallments = 3;

      const createResponse = await createDebt({
        description: '[E2E-026] AC1 — calendario básico',
        installmentValue: 100000,
        totalInstallments,
        startMonth: start.month,
        startYear: start.year,
      });
      expect(createResponse.status).toBe(201);

      for (let k = 1; k <= totalInstallments; k++) {
        const { year, month } = shiftMonth(start.year, start.month, k - 1);
        const budgets = await getBudgetsForMonth(year, month);
        expect(budgets.length).toBeGreaterThan(0);
        for (const budget of budgets) ownedBudgetIds.push(budget.id);

        const item = budgets
          .flatMap((b) => b.items)
          .find((i) => i.description.includes('AC1 — calendario básico'));

        expect(item).toBeDefined();
        expect(item?.description).toBe(
          `Cuota ${k}/${totalInstallments} — [E2E-026] AC1 — calendario básico`,
        );
        expect(Number(item?.plannedAmount)).toBe(100000);
        expect(item?.installmentNumber).toBe(k);
        expect(itemDebtId(item!)).toBe(createResponse.body.data.id);
        expect(item?.type).toBe('pago_deuda');
      }
    });

    it('AC-2: reutiliza presupuestos existentes sin duplicarlos y autogenera los faltantes con nombre "Presupuesto <Mes> <Año>"', async () => {
      const start = shiftMonth(currentYear + 8, 5, 0); // month 5 of that year
      const nextMonth = shiftMonth(start.year, start.month, 1);

      // Pre-create the budget for the first month manually.
      const preexisting = await api()
        .post('/api/v1/finances/budgets')
        .set('Cookie', authCookies)
        .send({ name: 'Presupuesto preexistente AC2', month: start.month, year: start.year })
        .expect(201);
      ownedBudgetIds.push(preexisting.body.data.id);

      const createResponse = await createDebt({
        description: '[E2E-026] AC2 — reutiliza y autogenera',
        totalInstallments: 2,
        startMonth: start.month,
        startYear: start.year,
      });
      expect(createResponse.status).toBe(201);

      // First month: still a single budget (no duplicate created).
      const firstMonthBudgets = await getBudgetsForMonth(start.year, start.month);
      expect(firstMonthBudgets.length).toBe(1);
      expect(firstMonthBudgets[0].id).toBe(preexisting.body.data.id);
      expect(
        firstMonthBudgets[0].items.some((i) =>
          i.description.includes('AC2 — reutiliza y autogenera'),
        ),
      ).toBe(true);

      // Second month: autogenerated, with the expected name.
      const secondMonthBudgets = await getBudgetsForMonth(nextMonth.year, nextMonth.month);
      expect(secondMonthBudgets.length).toBe(1);
      ownedBudgetIds.push(secondMonthBudgets[0].id);
      // NOTE: exact casing ("Presupuesto Marzo 2028") is an assumption taken
      // literally from the functional description — confirm against the
      // final spec wording before treating a mismatch here as a real bug.
      expect(secondMonthBudgets[0].name).toBe(
        `Presupuesto ${MONTH_NAMES_ES[nextMonth.month - 1]} ${nextMonth.year}`,
      );
    });

    it('AC-3: la creación es atómica — un payload inválido no deja deuda ni presupuestos huérfanos', async () => {
      const start = shiftMonth(currentYear + 9, 6, 0);
      const before = await getBudgetsForMonth(start.year, start.month);
      const beforeCount = before.length;

      const response = await createDebt({
        description: '[E2E-026] AC3 — payload inválido, no debe persistir nada',
        totalInstallments: 2,
        startMonth: 13, // invalid: out of 1-12 range
        startYear: start.year,
      });
      expect(response.status).toBe(400);

      const listResponse = await api()
        .get('/api/v1/finances/debts')
        .set('Cookie', authCookies)
        .expect(200);
      const found = (listResponse.body.data as Array<{ description: string }>).find((d) =>
        d.description.includes('AC3 — payload inválido'),
      );
      expect(found).toBeUndefined();

      const after = await getBudgetsForMonth(start.year, start.month);
      expect(after.length).toBe(beforeCount);
    });
  });

  describe('Derivación de progreso (AC-4, AC-5)', () => {
    it('AC-4: paidInstallments y remainingValue se derivan del calendario sin acción del usuario', async () => {
      const start = shiftMonth(currentYear, currentMonth, -1); // previous month
      const totalInstallments = 3; // previous + current = 2 elapsed, 1 future
      const installmentValue = 70000;

      const createResponse = await createDebt({
        description: '[E2E-026] AC4 — derivación automática',
        installmentValue,
        totalInstallments,
        startMonth: start.month,
        startYear: start.year,
      });
      expect(createResponse.status).toBe(201);
      const debtId = createResponse.body.data.id;

      // Track every item created by this debt for targeted cleanup,
      // regardless of whether the underlying budget is "owned" by this test.
      for (let k = 0; k < totalInstallments; k++) {
        const { year, month } = shiftMonth(start.year, start.month, k);
        const budgets = await getBudgetsForMonth(year, month);
        for (const budget of budgets) {
          const item = budget.items.find((i) => itemDebtId(i) === debtId);
          if (item) looseItemRefs.push({ budgetId: budget.id, itemId: item.id });
        }
      }

      const getResponse = await api()
        .get(`/api/v1/finances/debts/${debtId}`)
        .set('Cookie', authCookies)
        .expect(200);

      expect(getResponse.body.data.paidInstallments).toBe(2);
      expect(getResponse.body.data.remainingValue).toBe(installmentValue * 1);
    });

    it('AC-5: una deuda cuyo último mes ya pasó aparece "pagada" automáticamente, con remainingValue 0', async () => {
      const start = shiftMonth(currentYear, currentMonth, -6);
      const createResponse = await createDebt({
        description: '[E2E-026] AC5 — vencida por completo',
        installmentValue: 50000,
        totalInstallments: 3, // last installment 4 months ago
        startMonth: start.month,
        startYear: start.year,
      });
      expect(createResponse.status).toBe(201);
      const debtId = createResponse.body.data.id;

      for (let k = 0; k < 3; k++) {
        const { year, month } = shiftMonth(start.year, start.month, k);
        const budgets = await getBudgetsForMonth(year, month);
        for (const budget of budgets) {
          const item = budget.items.find((i) => itemDebtId(i) === debtId);
          if (item) looseItemRefs.push({ budgetId: budget.id, itemId: item.id });
        }
      }

      const getResponse = await api()
        .get(`/api/v1/finances/debts/${debtId}`)
        .set('Cookie', authCookies)
        .expect(200);

      expect(getResponse.body.data.status).toBe('pagada');
      expect(getResponse.body.data.remainingValue).toBe(0);
    });
  });

  describe('POST /api/v1/finances/debts/:id/pay-off (AC-6, AC-7)', () => {
    it('AC-6: borra solo ítems futuros, conserva el mes en curso, crea el Expense por el saldo, deja pagada + paidOffAt', async () => {
      const start = shiftMonth(currentYear, currentMonth, -1);
      const installmentValue = 80000;
      const totalInstallments = 4; // prev + current elapsed (2), 2 future

      const createResponse = await createDebt({
        description: '[E2E-026] AC6 — pay-off parcial',
        installmentValue,
        totalInstallments,
        startMonth: start.month,
        startYear: start.year,
      });
      expect(createResponse.status).toBe(201);
      const debtId = createResponse.body.data.id;

      for (let k = 0; k < totalInstallments; k++) {
        const { year, month } = shiftMonth(start.year, start.month, k);
        const budgets = await getBudgetsForMonth(year, month);
        for (const budget of budgets) {
          const item = budget.items.find((i) => itemDebtId(i) === debtId);
          if (item) looseItemRefs.push({ budgetId: budget.id, itemId: item.id });
        }
      }

      const payOffResponse = await api()
        .post(`/api/v1/finances/debts/${debtId}/pay-off`)
        .set('Cookie', authCookies)
        .send({});

      expect(payOffResponse.status).toBe(201);
      expect(payOffResponse.body.data.itemsRemoved).toBe(2);
      expect(payOffResponse.body.data.debt.status).toBe('pagada');
      expect(payOffResponse.body.data.debt.remainingValue).toBe(0);
      expect(payOffResponse.body.data.debt.paidOffAt).toBeTruthy();

      const expenseId = payOffResponse.body.data.expenseId;
      createdExpenseIds.push(expenseId);
      const expenseResponse = await api()
        .get(`/api/v1/finances/expenses/${expenseId}`)
        .set('Cookie', authCookies)
        .expect(200);
      expect(expenseResponse.body.data.description).toBe(
        'Pago total: [E2E-026] AC6 — pay-off parcial',
      );
      expect(Number(expenseResponse.body.data.amount)).toBe(installmentValue * 2);
      expect(expenseResponse.body.data.type).toBe('pago_deuda');

      // Past two months (previous + current) still have their item.
      for (let k = 0; k < 2; k++) {
        const { year, month } = shiftMonth(start.year, start.month, k);
        const budgets = await getBudgetsForMonth(year, month);
        const item = budgets.flatMap((b) => b.items).find((i) => itemDebtId(i) === debtId);
        expect(item).toBeDefined();
      }

      // Future two months no longer have the item.
      for (let k = 2; k < totalInstallments; k++) {
        const { year, month } = shiftMonth(start.year, start.month, k);
        const budgets = await getBudgetsForMonth(year, month);
        const item = budgets.flatMap((b) => b.items).find((i) => itemDebtId(i) === debtId);
        expect(item).toBeUndefined();
      }
    });

    it('AC-7: pay-off sobre una deuda ya pagada devuelve 400 y no crea un segundo gasto', async () => {
      const start = shiftMonth(currentYear, currentMonth, -6);
      const createResponse = await createDebt({
        description: '[E2E-026] AC7 — ya pagada, rechazo de pay-off',
        installmentValue: 50000,
        totalInstallments: 1,
        startMonth: start.month,
        startYear: start.year,
      });
      const debtId = createResponse.body.data.id;

      const budgets = await getBudgetsForMonth(start.year, start.month);
      for (const budget of budgets) {
        const item = budget.items.find((i) => itemDebtId(i) === debtId);
        if (item) looseItemRefs.push({ budgetId: budget.id, itemId: item.id });
      }

      const payOffResponse = await api()
        .post(`/api/v1/finances/debts/${debtId}/pay-off`)
        .set('Cookie', authCookies)
        .send({});

      expect(payOffResponse.status).toBe(400);
    });
  });

  describe('PATCH /api/v1/finances/debts/:id (AC-8, propagación de description)', () => {
    it('AC-8: editar installmentValue/totalInstallments regenera solo los ítems futuros', async () => {
      const start = shiftMonth(currentYear, currentMonth, -2);
      const totalInstallments = 5; // 3 elapsed (prev-2, prev-1, current), 2 future
      const originalValue = 90000;
      const newValue = 120000;

      const createResponse = await createDebt({
        description: '[E2E-026] AC8 — regeneración parcial',
        installmentValue: originalValue,
        totalInstallments,
        startMonth: start.month,
        startYear: start.year,
      });
      const debtId = createResponse.body.data.id;

      for (let k = 0; k < totalInstallments; k++) {
        const { year, month } = shiftMonth(start.year, start.month, k);
        const budgets = await getBudgetsForMonth(year, month);
        for (const budget of budgets) {
          const item = budget.items.find((i) => itemDebtId(i) === debtId);
          if (item) looseItemRefs.push({ budgetId: budget.id, itemId: item.id });
        }
      }

      const patchResponse = await api()
        .patch(`/api/v1/finances/debts/${debtId}`)
        .set('Cookie', authCookies)
        .send({ installmentValue: newValue })
        .expect(200);
      // installmentValue es una columna `decimal`: Postgres/TypeORM la
      // devuelven como string, igual que plannedAmount/amount en el resto
      // del proyecto (ver los `Number(...)` de este mismo archivo) — no es
      // un comportamiento nuevo de spec-026.
      expect(Number(patchResponse.body.data.installmentValue)).toBe(newValue);

      // Elapsed (past) months keep the original value.
      for (let k = 0; k < 3; k++) {
        const { year, month } = shiftMonth(start.year, start.month, k);
        const budgets = await getBudgetsForMonth(year, month);
        const item = budgets.flatMap((b) => b.items).find((i) => itemDebtId(i) === debtId);
        expect(Number(item?.plannedAmount)).toBe(originalValue);
      }

      // Future months are regenerated with the new value, still exactly one item.
      for (let k = 3; k < totalInstallments; k++) {
        const { year, month } = shiftMonth(start.year, start.month, k);
        const budgets = await getBudgetsForMonth(year, month);
        const items = budgets.flatMap((b) => b.items).filter((i) => itemDebtId(i) === debtId);
        expect(items.length).toBe(1);
        expect(Number(items[0].plannedAmount)).toBe(newValue);
        expect(items[0].installmentNumber).toBe(k + 1);
      }
    });

    it('editar description propaga el cambio a todos los ítems, vencidos y futuros', async () => {
      const start = shiftMonth(currentYear, currentMonth, -1);
      const totalInstallments = 3;

      const createResponse = await createDebt({
        description: '[E2E-026] Propagación de description (original)',
        totalInstallments,
        startMonth: start.month,
        startYear: start.year,
      });
      const debtId = createResponse.body.data.id;

      for (let k = 0; k < totalInstallments; k++) {
        const { year, month } = shiftMonth(start.year, start.month, k);
        const budgets = await getBudgetsForMonth(year, month);
        for (const budget of budgets) {
          const item = budget.items.find((i) => itemDebtId(i) === debtId);
          if (item) looseItemRefs.push({ budgetId: budget.id, itemId: item.id });
        }
      }

      await api()
        .patch(`/api/v1/finances/debts/${debtId}`)
        .set('Cookie', authCookies)
        .send({ description: '[E2E-026] Propagación de description (renombrada)' })
        .expect(200);

      for (let k = 0; k < totalInstallments; k++) {
        const { year, month } = shiftMonth(start.year, start.month, k);
        const budgets = await getBudgetsForMonth(year, month);
        const item = budgets.flatMap((b) => b.items).find((i) => itemDebtId(i) === debtId);
        expect(item?.description).toBe(
          `Cuota ${k + 1}/${totalInstallments} — [E2E-026] Propagación de description (renombrada)`,
        );
      }
    });
  });

  describe('DELETE /api/v1/finances/debts/:id (AC-9)', () => {
    it('borra los ítems futuros y desasocia (no elimina) los vencidos', async () => {
      const start = shiftMonth(currentYear, currentMonth, -1);
      const totalInstallments = 3; // 2 elapsed, 1 future

      const createResponse = await createDebt({
        description: '[E2E-026] AC9 — borrado de deuda',
        totalInstallments,
        startMonth: start.month,
        startYear: start.year,
      });
      const debtId = createResponse.body.data.id;
      // Remove from createdDebtIds cleanup list — this test deletes it itself.
      const idx = createdDebtIds.indexOf(debtId);
      if (idx >= 0) createdDebtIds.splice(idx, 1);

      const itemsByMonth: { year: number; month: number; budgetId: string; itemId: string }[] =
        [];
      for (let k = 0; k < totalInstallments; k++) {
        const { year, month } = shiftMonth(start.year, start.month, k);
        const budgets = await getBudgetsForMonth(year, month);
        for (const budget of budgets) {
          const item = budget.items.find((i) => itemDebtId(i) === debtId);
          if (item) itemsByMonth.push({ year, month, budgetId: budget.id, itemId: item.id });
        }
      }
      expect(itemsByMonth.length).toBe(totalInstallments);

      await api()
        .delete(`/api/v1/finances/debts/${debtId}`)
        .set('Cookie', authCookies)
        .expect(204);

      await api()
        .get(`/api/v1/finances/debts/${debtId}`)
        .set('Cookie', authCookies)
        .expect(404);

      // Past two months: item still exists but desassociated (debtId null).
      for (let k = 0; k < 2; k++) {
        const { budgetId, itemId } = itemsByMonth[k];
        const budgets = await getBudgetsForMonth(itemsByMonth[k].year, itemsByMonth[k].month);
        const budget = budgets.find((b) => b.id === budgetId);
        const item = budget?.items.find((i) => i.id === itemId);
        expect(item).toBeDefined();
        expect(itemDebtId(item!)).toBeNull();
        expect(item?.installmentNumber ?? null).toBeNull();
        looseItemRefs.push({ budgetId, itemId }); // clean up manually
      }

      // Future month: item was removed entirely.
      const futureRef = itemsByMonth[2];
      const futureBudgets = await getBudgetsForMonth(futureRef.year, futureRef.month);
      const futureItem = futureBudgets
        .flatMap((b) => b.items)
        .find((i) => i.id === futureRef.itemId);
      expect(futureItem).toBeUndefined();
    });
  });

  describe('POST /api/v1/finances/debts/:id/sync-budget-items (AC-10)', () => {
    it('recrea solo cuotas futuras faltantes, no toca vencidas, y es idempotente', async () => {
      const start = shiftMonth(currentYear, currentMonth, 0); // current month
      const totalInstallments = 3; // current elapsed, 2 future

      const createResponse = await createDebt({
        description: '[E2E-026] AC10 — sync-budget-items',
        totalInstallments,
        startMonth: start.month,
        startYear: start.year,
      });
      const debtId = createResponse.body.data.id;

      const nextMonth = shiftMonth(start.year, start.month, 1);
      const budgetsNext = await getBudgetsForMonth(nextMonth.year, nextMonth.month);
      const nextBudget = budgetsNext[0];
      const nextItem = nextBudget.items.find((i) => itemDebtId(i) === debtId)!;
      expect(nextItem).toBeDefined();

      // Track remaining items (current + the one two months out) for cleanup.
      const currentBudgets = await getBudgetsForMonth(start.year, start.month);
      for (const budget of currentBudgets) {
        const item = budget.items.find((i) => itemDebtId(i) === debtId);
        if (item) looseItemRefs.push({ budgetId: budget.id, itemId: item.id });
      }
      const monthPlus2 = shiftMonth(start.year, start.month, 2);
      const budgetsPlus2 = await getBudgetsForMonth(monthPlus2.year, monthPlus2.month);
      for (const budget of budgetsPlus2) {
        const item = budget.items.find((i) => itemDebtId(i) === debtId);
        if (item) looseItemRefs.push({ budgetId: budget.id, itemId: item.id });
      }

      // Manually delete the "next month" item, as if the user removed it
      // from the budget detail view.
      await api()
        .delete(`/api/v1/finances/budgets/${nextBudget.id}/items/${nextItem.id}`)
        .set('Cookie', authCookies)
        .expect(204);

      const syncResponse = await api()
        .post(`/api/v1/finances/debts/${debtId}/sync-budget-items`)
        .set('Cookie', authCookies)
        .send({});
      expect(syncResponse.status).toBe(201);
      expect(syncResponse.body.data.itemsCreated).toBe(1);

      const afterSync = await getBudgetsForMonth(nextMonth.year, nextMonth.month);
      const recreatedItems = afterSync
        .flatMap((b) => b.items)
        .filter((i) => itemDebtId(i) === debtId);
      expect(recreatedItems.length).toBe(1);
      expect(recreatedItems[0].installmentNumber).toBe(2);
      for (const budget of afterSync) looseItemRefs.push({ budgetId: budget.id, itemId: recreatedItems[0].id });

      // Idempotency: running sync again does not duplicate.
      const secondSync = await api()
        .post(`/api/v1/finances/debts/${debtId}/sync-budget-items`)
        .set('Cookie', authCookies)
        .send({});
      expect(secondSync.status).toBe(201);
      expect(secondSync.body.data.itemsCreated).toBe(0);

      const afterSecondSync = await getBudgetsForMonth(nextMonth.year, nextMonth.month);
      const itemsAfterSecondSync = afterSecondSync
        .flatMap((b) => b.items)
        .filter((i) => itemDebtId(i) === debtId);
      expect(itemsAfterSecondSync.length).toBe(1);
    });
  });

  describe('POST /api/v1/finances/budgets/:id/duplicate (AC-11)', () => {
    it('no copia los ítems de deuda al mes destino; itemsCopied refleja solo los ítems normales', async () => {
      const start = shiftMonth(currentYear + 9, 2, 0);
      const dest = shiftMonth(start.year, start.month, 1);

      const createResponse = await createDebt({
        description: '[E2E-026] AC11 — no se duplica al clonar mes',
        totalInstallments: 1,
        startMonth: start.month,
        startYear: start.year,
      });
      const debtId = createResponse.body.data.id;

      const sourceBudgets = await getBudgetsForMonth(start.year, start.month);
      const sourceBudget = sourceBudgets[0];
      ownedBudgetIds.push(sourceBudget.id);

      // Add a normal (non-debt) item to the source budget.
      await api()
        .post(`/api/v1/finances/budgets/${sourceBudget.id}/items`)
        .set('Cookie', authCookies)
        .send({ description: 'Ítem normal AC11', plannedAmount: 50000, type: 'basico' })
        .expect(201);

      const duplicateResponse = await api()
        .post(`/api/v1/finances/budgets/${sourceBudget.id}/duplicate`)
        .set('Cookie', authCookies)
        .send({ month: dest.month, year: dest.year })
        .expect(201);

      expect(duplicateResponse.body.data.itemsCopied).toBe(1);
      ownedBudgetIds.push(duplicateResponse.body.data.budget.id);

      const destItems = duplicateResponse.body.data.budget.items as Array<{
        debt?: { id: string } | null;
        debtId?: string | null;
        description: string;
      }>;
      expect(destItems.some((i) => itemDebtId(i) === debtId)).toBe(false);
      expect(destItems.length).toBe(1);
      expect(destItems[0].description).toBe('Ítem normal AC11');
    });
  });

  describe('POST /api/v1/finances/debts/:id/pay ya no existe (AC-12)', () => {
    it('devuelve 404 — el endpoint fue eliminado', async () => {
      const start = shiftMonth(currentYear, currentMonth, 0);
      const createResponse = await createDebt({
        description: '[E2E-026] AC12 — endpoint pay eliminado',
        totalInstallments: 1,
        startMonth: start.month,
        startYear: start.year,
      });
      const debtId = createResponse.body.data.id;

      const budgets = await getBudgetsForMonth(start.year, start.month);
      for (const budget of budgets) {
        const item = budget.items.find((i) => itemDebtId(i) === debtId);
        if (item) looseItemRefs.push({ budgetId: budget.id, itemId: item.id });
      }

      await api()
        .post(`/api/v1/finances/debts/${debtId}/pay`)
        .set('Cookie', authCookies)
        .expect(404);
    });
  });
});
