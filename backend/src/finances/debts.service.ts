import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Debt } from './entities/debt.entity';
import { Expense } from './entities/expense.entity';
import { Budget } from './entities/budget.entity';
import { BudgetItem } from './entities/budget-item.entity';
import { CreateDebtDto } from './dto/create-debt.dto';
import { UpdateDebtDto } from './dto/update-debt.dto';
import { DebtStatus } from '../common/enums/debt-status.enum';
import { ExpenseType } from '../common/enums/expense-type.enum';

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

const CALENDAR_FIELDS = [
  'installmentValue',
  'totalInstallments',
  'startMonth',
  'startYear',
] as const;

export interface InstallmentScheduleEntry {
  year: number;
  month: number;
  installmentNumber: number;
}

export interface NextInstallment {
  number: number;
  month: number;
  year: number;
}

export interface DebtWithRemaining extends Omit<Debt, 'paidInstallments'> {
  paidInstallments: number;
  remainingValue: number;
  nextInstallment: NextInstallment | null;
}

export interface PayOffResult {
  debt: DebtWithRemaining;
  expenseId: string;
  itemsRemoved: number;
}

export interface SyncBudgetItemsResult {
  itemsCreated: number;
  budgetsCreated: number;
}

// ─── Helpers de calendario (funciones puras, sin estado) ───────────────────
// Ver spec-026, "Decisiones técnicas → 2. Cuota vencida vs. futura, y saldo
// restante" y "→ 8. Idempotencia y colisiones de presupuesto".

/** Índice absoluto de mes en base 0, comparable entre años (year*12 + (month-1)). */
export function monthIndex(year: number, month: number): number {
  return year * 12 + (month - 1);
}

/**
 * Cuotas vencidas de una deuda según su calendario, comparado contra
 * `referenceDate` (por defecto, hoy). La cuota del mes en curso cuenta como
 * vencida. Siempre acotado a [0, totalInstallments].
 */
export function computePaidInstallments(
  startYear: number,
  startMonth: number,
  totalInstallments: number,
  referenceDate: Date = new Date(),
): number {
  const elapsed =
    monthIndex(referenceDate.getFullYear(), referenceDate.getMonth() + 1) -
    monthIndex(startYear, startMonth) +
    1;
  return Math.min(Math.max(elapsed, 0), totalInstallments);
}

/** Saldo restante — nunca negativo. */
export function computeRemainingValue(
  paidInstallments: number,
  totalInstallments: number,
  installmentValue: number,
): number {
  const remaining = (totalInstallments - paidInstallments) * installmentValue;
  return Math.max(0, remaining);
}

/** `status === 'pagada'` persistido, O el calendario ya completó las cuotas. */
export function isDebtEffectivelyPaid(
  status: DebtStatus | string,
  paidInstallments: number,
  totalInstallments: number,
): boolean {
  return status === DebtStatus.PAID || paidInstallments >= totalInstallments;
}

/** Un mes es "futuro" si es estrictamente posterior al mes de `referenceDate`. */
export function isFutureMonth(
  year: number,
  month: number,
  referenceDate: Date = new Date(),
): boolean {
  return (
    monthIndex(year, month) >
    monthIndex(referenceDate.getFullYear(), referenceDate.getMonth() + 1)
  );
}

/** Calendario completo de cuotas, una por mes consecutivo desde el inicio. */
export function buildInstallmentSchedule(
  startYear: number,
  startMonth: number,
  totalInstallments: number,
): InstallmentScheduleEntry[] {
  const schedule: InstallmentScheduleEntry[] = [];
  const startIndex = monthIndex(startYear, startMonth);
  for (let i = 0; i < totalInstallments; i++) {
    const idx = startIndex + i;
    schedule.push({
      year: Math.floor(idx / 12),
      month: (idx % 12) + 1,
      installmentNumber: i + 1,
    });
  }
  return schedule;
}

@Injectable()
export class DebtsService {
  constructor(
    @InjectRepository(Debt)
    private readonly debtsRepository: Repository<Debt>,
    @InjectRepository(Expense)
    private readonly expensesRepository: Repository<Expense>,
    @InjectRepository(BudgetItem)
    private readonly budgetItemsRepository: Repository<BudgetItem>,
    @InjectRepository(Budget)
    private readonly budgetsRepository: Repository<Budget>,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Lectura ───────────────────────────────────────────────────────────

  async findAll(status?: DebtStatus): Promise<DebtWithRemaining[]> {
    const debts = await this.debtsRepository.find({
      order: { createdAt: 'DESC' },
    });
    const normalized = await Promise.all(
      debts.map((debt) => this.normalizeAndSerialize(debt)),
    );
    return status ? normalized.filter((d) => d.status === status) : normalized;
  }

  async findOne(id: string): Promise<DebtWithRemaining> {
    const debt = await this.debtsRepository.findOneBy({ id });
    if (!debt) throw new NotFoundException(`Debt ${id} not found`);
    return this.normalizeAndSerialize(debt);
  }

  /**
   * Deriva progreso/saldo desde el calendario y, si la deuda ya se completó
   * pero la columna `status` todavía dice `activa` (nadie la consultó desde
   * que terminó su plazo), la persiste como `pagada` antes de devolverla —
   * ver spec-026, decisión 3.
   */
  private async normalizeAndSerialize(debt: Debt): Promise<DebtWithRemaining> {
    const calendarPaid = computePaidInstallments(
      debt.startYear,
      debt.startMonth,
      debt.totalInstallments,
    );
    const effectivelyPaid = isDebtEffectivelyPaid(
      debt.status,
      calendarPaid,
      debt.totalInstallments,
    );

    if (effectivelyPaid && debt.status !== DebtStatus.PAID) {
      debt.status = DebtStatus.PAID;
      if (!debt.paidOffAt) debt.paidOffAt = new Date();
      await this.debtsRepository.save(debt);
    }

    const paidInstallments = effectivelyPaid ? debt.totalInstallments : calendarPaid;
    const remainingValue = computeRemainingValue(
      paidInstallments,
      debt.totalInstallments,
      debt.installmentValue,
    );

    return {
      ...debt,
      paidInstallments,
      remainingValue,
      nextInstallment: this.computeNextInstallment(debt, paidInstallments),
    };
  }

  private computeNextInstallment(
    debt: Debt,
    paidInstallments: number,
  ): NextInstallment | null {
    if (paidInstallments >= debt.totalInstallments) return null;
    const schedule = buildInstallmentSchedule(
      debt.startYear,
      debt.startMonth,
      debt.totalInstallments,
    );
    const entry = schedule[paidInstallments];
    if (!entry) return null;
    return {
      number: entry.installmentNumber,
      month: entry.month,
      year: entry.year,
    };
  }

  // ─── Escritura ─────────────────────────────────────────────────────────

  async create(dto: CreateDebtDto): Promise<DebtWithRemaining> {
    const debtId = await this.dataSource.transaction(async (manager) => {
      const debt = manager.create(Debt, dto);
      const savedDebt = await manager.save(debt);

      const schedule = buildInstallmentSchedule(
        savedDebt.startYear,
        savedDebt.startMonth,
        savedDebt.totalInstallments,
      );

      for (const entry of schedule) {
        const budget = await this.findOrCreateBudget(
          manager,
          entry.year,
          entry.month,
        );
        const item = manager.create(BudgetItem, {
          budget,
          description: this.installmentDescription(
            entry.installmentNumber,
            savedDebt.totalInstallments,
            savedDebt.description,
          ),
          plannedAmount: savedDebt.installmentValue,
          type: ExpenseType.PAGO_DEUDA,
          debt: savedDebt,
          installmentNumber: entry.installmentNumber,
        });
        await manager.save(item);
      }

      return savedDebt.id;
    });

    return this.findOne(debtId);
  }

  async update(id: string, dto: UpdateDebtDto): Promise<DebtWithRemaining> {
    const touchesCalendar = CALENDAR_FIELDS.some((key) => key in dto);

    await this.dataSource.transaction(async (manager) => {
      const debt = await manager.findOneBy(Debt, { id });
      if (!debt) throw new NotFoundException(`Debt ${id} not found`);
      if (debt.status === DebtStatus.PAID && touchesCalendar) {
        throw new BadRequestException(
          `Debt ${id} is already paid off; its calendar can no longer be edited`,
        );
      }

      if (touchesCalendar) {
        const items = await this.findDebtItems(manager, id);
        const futureItems = items.filter((item) =>
          isFutureMonth(item.budget.year, item.budget.month),
        );
        if (futureItems.length) await manager.remove(futureItems);
      }

      Object.assign(debt, dto);
      const savedDebt = await manager.save(debt);

      if (touchesCalendar) {
        const schedule = buildInstallmentSchedule(
          savedDebt.startYear,
          savedDebt.startMonth,
          savedDebt.totalInstallments,
        );
        const futureEntries = schedule.filter((entry) =>
          isFutureMonth(entry.year, entry.month),
        );
        for (const entry of futureEntries) {
          const budget = await this.findOrCreateBudget(
            manager,
            entry.year,
            entry.month,
          );
          const item = manager.create(BudgetItem, {
            budget,
            description: this.installmentDescription(
              entry.installmentNumber,
              savedDebt.totalInstallments,
              savedDebt.description,
            ),
            plannedAmount: savedDebt.installmentValue,
            type: ExpenseType.PAGO_DEUDA,
            debt: savedDebt,
            installmentNumber: entry.installmentNumber,
          });
          await manager.save(item);
        }
      }

      if ('description' in dto) {
        const items = await this.findDebtItems(manager, id);
        for (const item of items) {
          item.description = this.installmentDescription(
            item.installmentNumber!,
            savedDebt.totalInstallments,
            savedDebt.description,
          );
          await manager.save(item);
        }
      }
    });

    return this.findOne(id);
  }

  /**
   * Elimina una deuda: los ítems de cuota vencidos (incluido el del mes en
   * curso) quedan desasociados en el presupuesto histórico; los futuros se
   * eliminan. Ver spec-026, decisión 7.
   */
  async remove(id: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const debt = await manager.findOneBy(Debt, { id });
      if (!debt) throw new NotFoundException(`Debt ${id} not found`);

      const items = await this.findDebtItems(manager, id);
      const pastItems = items.filter(
        (item) => !isFutureMonth(item.budget.year, item.budget.month),
      );
      const futureItems = items.filter((item) =>
        isFutureMonth(item.budget.year, item.budget.month),
      );

      for (const item of pastItems) {
        item.debt = null;
        item.installmentNumber = null;
      }
      if (pastItems.length) await manager.save(pastItems);
      if (futureItems.length) await manager.remove(futureItems);

      await manager.remove(debt);
    });
  }

  /**
   * Pago total anticipado: borra los ítems de cuota de meses estrictamente
   * futuros, registra el saldo restante como gasto del mes en curso y marca
   * la deuda como `pagada`. Ver spec-026, decisión 2 y Fase 3.
   */
  async payOff(id: string): Promise<PayOffResult> {
    const { debtId, expenseId, itemsRemoved } = await this.dataSource.transaction(
      async (manager) => {
        const debt = await manager.findOneBy(Debt, { id });
        if (!debt) throw new NotFoundException(`Debt ${id} not found`);

        const calendarPaid = computePaidInstallments(
          debt.startYear,
          debt.startMonth,
          debt.totalInstallments,
        );
        const effectivelyPaid = isDebtEffectivelyPaid(
          debt.status,
          calendarPaid,
          debt.totalInstallments,
        );
        const remainingValue = computeRemainingValue(
          calendarPaid,
          debt.totalInstallments,
          debt.installmentValue,
        );
        if (effectivelyPaid || remainingValue <= 0) {
          throw new BadRequestException(
            `Debt ${id} has no remaining balance to pay off`,
          );
        }

        const items = await this.findDebtItems(manager, id);
        const futureItems = items.filter((item) =>
          isFutureMonth(item.budget.year, item.budget.month),
        );
        if (futureItems.length) await manager.remove(futureItems);

        const expense = manager.create(Expense, {
          description: `Pago total: ${debt.description}`,
          amount: remainingValue,
          date: this.todayDateOnly(),
          type: ExpenseType.PAGO_DEUDA,
        });
        const savedExpense = await manager.save(expense);

        debt.status = DebtStatus.PAID;
        debt.paidOffAt = new Date();
        const savedDebt = await manager.save(debt);

        return {
          debtId: savedDebt.id,
          expenseId: savedExpense.id,
          itemsRemoved: futureItems.length,
        };
      },
    );

    const debt = await this.findOne(debtId);
    return { debt, expenseId, itemsRemoved };
  }

  /**
   * Idempotente: recrea únicamente las cuotas futuras que falten (creando
   * presupuestos si hace falta). No toca cuotas vencidas ni deudas `pagada`.
   * Ver spec-026, decisión 8 y Fase 3 — usado para deudas heredadas.
   */
  async syncBudgetItems(id: string): Promise<SyncBudgetItemsResult> {
    return this.dataSource.transaction(async (manager) => {
      const debt = await manager.findOneBy(Debt, { id });
      if (!debt) throw new NotFoundException(`Debt ${id} not found`);

      const calendarPaid = computePaidInstallments(
        debt.startYear,
        debt.startMonth,
        debt.totalInstallments,
      );
      const effectivelyPaid = isDebtEffectivelyPaid(
        debt.status,
        calendarPaid,
        debt.totalInstallments,
      );
      if (effectivelyPaid) {
        return { itemsCreated: 0, budgetsCreated: 0 };
      }

      const schedule = buildInstallmentSchedule(
        debt.startYear,
        debt.startMonth,
        debt.totalInstallments,
      );
      const futureEntries = schedule.filter((entry) =>
        isFutureMonth(entry.year, entry.month),
      );

      const existingItems = await this.findDebtItems(manager, id);
      const existingNumbers = new Set(
        existingItems.map((item) => item.installmentNumber),
      );

      let itemsCreated = 0;
      let budgetsCreated = 0;
      for (const entry of futureEntries) {
        if (existingNumbers.has(entry.installmentNumber)) continue;

        const existingBudget = await manager.findOne(Budget, {
          where: { month: entry.month, year: entry.year },
        });
        const budget =
          existingBudget ??
          (await (async () => {
            budgetsCreated++;
            const created = manager.create(Budget, {
              name: this.autoBudgetName(entry.month, entry.year),
              month: entry.month,
              year: entry.year,
            });
            return manager.save(created);
          })());

        const item = manager.create(BudgetItem, {
          budget,
          description: this.installmentDescription(
            entry.installmentNumber,
            debt.totalInstallments,
            debt.description,
          ),
          plannedAmount: debt.installmentValue,
          type: ExpenseType.PAGO_DEUDA,
          debt,
          installmentNumber: entry.installmentNumber,
        });
        await manager.save(item);
        itemsCreated++;
      }

      return { itemsCreated, budgetsCreated };
    });
  }

  // ─── Helpers privados ────────────────────────────────────────────────────

  private async findOrCreateBudget(
    manager: EntityManager,
    year: number,
    month: number,
  ): Promise<Budget> {
    const existing = await manager.findOne(Budget, { where: { month, year } });
    if (existing) return existing;
    const created = manager.create(Budget, {
      name: this.autoBudgetName(month, year),
      month,
      year,
    });
    return manager.save(created);
  }

  private async findDebtItems(
    manager: EntityManager,
    debtId: string,
  ): Promise<BudgetItem[]> {
    return manager
      .createQueryBuilder(BudgetItem, 'item')
      .innerJoinAndSelect('item.budget', 'budget')
      .where('item."debtId" = :debtId', { debtId })
      .getMany();
  }

  private autoBudgetName(month: number, year: number): string {
    return `Presupuesto ${MONTH_NAMES_ES[month - 1]} ${year}`;
  }

  private installmentDescription(
    installmentNumber: number,
    totalInstallments: number,
    description: string,
  ): string {
    return `Cuota ${installmentNumber}/${totalInstallments} — ${description}`;
  }

  private todayDateOnly(): string {
    return new Date().toISOString().split('T')[0];
  }
}
