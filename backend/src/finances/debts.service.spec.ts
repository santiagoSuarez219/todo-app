// spec-026 — Deudas: helpers puros de calendario y normalización perezosa.
//
// Redactado en modo test-first (@tester), ANTES de la implementación de
// spec-026, sin haber leído `spec/spec-026-deudas-cuotas-en-presupuesto.md`
// (instrucción explícita — el spec se está redactando en paralelo). Las
// firmas de las funciones puras esperadas abajo son una propuesta razonable
// derivada literalmente de la descripción funcional del encargo:
//
//   monthIndex(y, m) = y*12 + (m-1)
//   elapsed = monthIndex(hoy) - monthIndex(startYear, startMonth) + 1
//   paidInstallments = clamp(elapsed, 0, totalInstallments)
//   remainingValue = (totalInstallments - paidInstallments) * installmentValue
//
// Si `@architect`/la implementación nombran estos helpers distinto (o los
// dejan como métodos privados de la clase en vez de funciones exportadas),
// este archivo debe actualizarse junto con la implementación para reflejar
// los nombres reales — hasta entonces, se espera que falle incluso al
// importar (`Cannot find module`/`is not a function`), lo cual es el "rojo"
// esperado de este archivo.

import {
  monthIndex,
  computePaidInstallments,
  computeRemainingValue,
  isDebtEffectivelyPaid,
  buildInstallmentSchedule,
  isFutureMonth,
} from './debts.service';

describe('spec-026 — debts.service calendar helpers', () => {
  describe('monthIndex()', () => {
    it('is monotonically increasing across a year boundary', () => {
      const dec2026 = monthIndex(2026, 12);
      const jan2027 = monthIndex(2027, 1);
      expect(jan2027).toBe(dec2026 + 1);
    });

    it('produces a stable, comparable index for the same year/month', () => {
      expect(monthIndex(2026, 8)).toBe(monthIndex(2026, 8));
      expect(monthIndex(2026, 8)).toBeLessThan(monthIndex(2026, 9));
      expect(monthIndex(2026, 8)).toBeLessThan(monthIndex(2027, 1));
    });
  });

  describe('computePaidInstallments()', () => {
    const reference = new Date('2026-08-14T12:00:00.000Z');

    it('counts the current month as elapsed (vencida) — starts this month, 1 installment paid', () => {
      const paid = computePaidInstallments(2026, 8, 3, reference);
      expect(paid).toBe(1);
    });

    it('counts a debt starting in a previous month proportionally', () => {
      // Started June 2026 (3 months before reference's August 2026):
      // June, July, August all elapsed → 3.
      const paid = computePaidInstallments(2026, 6, 6, reference);
      expect(paid).toBe(3);
    });

    it('clamps at totalInstallments — never reports more paid than exist', () => {
      // Started well before the reference date, only 2 installments total.
      const paid = computePaidInstallments(2026, 1, 2, reference);
      expect(paid).toBe(2);
    });

    it('clamps at 0 — a debt starting after the reference date has 0 paid', () => {
      const paid = computePaidInstallments(2026, 12, 3, reference);
      expect(paid).toBe(0);
    });

    it('handles a debt spanning a year boundary correctly', () => {
      // Starts November 2026, reference is August 2026 → not started yet.
      const notStartedYet = computePaidInstallments(2026, 11, 5, reference);
      expect(notStartedYet).toBe(0);

      // With a reference date in the following year, elapsed grows across
      // the boundary without off-by-one errors.
      const laterReference = new Date('2027-02-14T12:00:00.000Z');
      // Nov 2026, Dec 2026, Jan 2027, Feb 2027 elapsed = 4.
      const paidAcrossYear = computePaidInstallments(2026, 11, 5, laterReference);
      expect(paidAcrossYear).toBe(4);
    });
  });

  describe('computeRemainingValue()', () => {
    it('is the product of remaining installments and the installment value', () => {
      expect(computeRemainingValue(2, 5, 100000)).toBe(300000);
    });

    it('is 0 once every installment has been paid, never negative', () => {
      expect(computeRemainingValue(5, 5, 100000)).toBe(0);
      expect(computeRemainingValue(6, 5, 100000)).toBe(0);
    });
  });

  describe('isDebtEffectivelyPaid()', () => {
    it('is true when the persisted status is already "pagada", regardless of the calendar', () => {
      expect(isDebtEffectivelyPaid('pagada', 1, 12)).toBe(true);
    });

    it('is true when the calendar has completed, even if status still says "activa"', () => {
      expect(isDebtEffectivelyPaid('activa', 3, 3)).toBe(true);
    });

    it('is false when status is "activa" and the calendar has installments left', () => {
      expect(isDebtEffectivelyPaid('activa', 2, 3)).toBe(false);
    });
  });

  describe('isFutureMonth()', () => {
    const reference = new Date('2026-08-14T12:00:00.000Z');

    it('the current month is NOT future (it counts as vencida)', () => {
      expect(isFutureMonth(2026, 8, reference)).toBe(false);
    });

    it('a strictly later month is future', () => {
      expect(isFutureMonth(2026, 9, reference)).toBe(true);
      expect(isFutureMonth(2027, 1, reference)).toBe(true);
    });

    it('a past month is not future', () => {
      expect(isFutureMonth(2026, 7, reference)).toBe(false);
    });
  });

  describe('buildInstallmentSchedule()', () => {
    it('builds one consecutive-month entry per installment, 1-indexed', () => {
      const schedule = buildInstallmentSchedule(2026, 8, 3);
      expect(schedule).toEqual([
        { year: 2026, month: 8, installmentNumber: 1 },
        { year: 2026, month: 9, installmentNumber: 2 },
        { year: 2026, month: 10, installmentNumber: 3 },
      ]);
    });

    it('crosses the year boundary correctly', () => {
      const schedule = buildInstallmentSchedule(2026, 11, 5);
      expect(schedule).toEqual([
        { year: 2026, month: 11, installmentNumber: 1 },
        { year: 2026, month: 12, installmentNumber: 2 },
        { year: 2027, month: 1, installmentNumber: 3 },
        { year: 2027, month: 2, installmentNumber: 4 },
        { year: 2027, month: 3, installmentNumber: 5 },
      ]);
    });

    it('handles a single-installment debt', () => {
      const schedule = buildInstallmentSchedule(2026, 9, 1);
      expect(schedule).toEqual([{ year: 2026, month: 9, installmentNumber: 1 }]);
    });
  });
});

// ─── Normalización perezosa del status en lectura ──────────────────────────
//
// findAll()/findOne() deben persistir `status: 'pagada'` cuando el calendario
// ya se completó pero la columna todavía dice `activa` (deuda vieja que nadie
// consultó desde que terminó su plazo), antes de aplicar cualquier filtro por
// status. Se verifica con un repositorio mockeado, sin tocar la base real.

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DebtsService } from './debts.service';
import { Debt } from './entities/debt.entity';
import { Expense } from './entities/expense.entity';
import { Budget } from './entities/budget.entity';
import { DataSource } from 'typeorm';

describe('spec-026 — DebtsService lazy status normalization', () => {
  let service: DebtsService;
  let mockDebtsRepository: any;
  let mockExpensesRepository: any;
  let mockBudgetsRepository: any;
  let mockDataSource: any;

  beforeEach(async () => {
    mockDebtsRepository = {
      findOneBy: jest.fn(),
      find: jest.fn(),
      save: jest.fn((debt: unknown) => Promise.resolve(debt)),
      create: jest.fn((dto: unknown) => dto),
    };
    mockExpensesRepository = {
      create: jest.fn((dto: unknown) => dto),
      save: jest.fn((expense: unknown) => Promise.resolve(expense)),
      findOneBy: jest.fn(),
    };
    mockBudgetsRepository = {
      create: jest.fn((dto: unknown) => dto),
      save: jest.fn((budget: unknown) => Promise.resolve(budget)),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
    };
    mockDataSource = {
      transaction: jest.fn((cb: (manager: unknown) => unknown) => cb(mockDataSource)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DebtsService,
        { provide: getRepositoryToken(Debt), useValue: mockDebtsRepository },
        { provide: getRepositoryToken(Expense), useValue: mockExpensesRepository },
        { provide: getRepositoryToken(Budget), useValue: mockBudgetsRepository },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<DebtsService>(DebtsService);
  });

  it('persists status "pagada" on findOne() when the calendar already completed, before returning', async () => {
    const debt = {
      id: 'debt-1',
      description: 'Deuda vieja sin consultar',
      installmentValue: 100000,
      totalInstallments: 2,
      status: 'activa', // stale — the DB was never touched after the calendar finished
      startMonth: 1,
      startYear: 2020, // long finished relative to "now"
      paidOffAt: null,
    };
    mockDebtsRepository.findOneBy.mockResolvedValue(debt);

    const result = await service.findOne('debt-1');

    expect(mockDebtsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pagada' }),
    );
    expect(result.status).toBe('pagada');
    expect(result.remainingValue).toBe(0);
  });

  it('does NOT persist/change status on findOne() when the calendar still has installments left', async () => {
    const now = new Date();
    const debt = {
      id: 'debt-2',
      description: 'Deuda activa real',
      installmentValue: 100000,
      totalInstallments: 24,
      status: 'activa',
      startMonth: now.getMonth() + 1,
      startYear: now.getFullYear(),
      paidOffAt: null,
    };
    mockDebtsRepository.findOneBy.mockResolvedValue(debt);

    const result = await service.findOne('debt-2');

    expect(mockDebtsRepository.save).not.toHaveBeenCalled();
    expect(result.status).toBe('activa');
  });
});
