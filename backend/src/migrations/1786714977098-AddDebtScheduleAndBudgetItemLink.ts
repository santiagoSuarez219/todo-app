import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * spec-026 — Fase 1: agrega el calendario de cuotas a `debts` y el vínculo
 * `budget_items.debtId` + `installmentNumber`, con backfill de las deudas
 * existentes (ver spec, "Decisiones técnicas → 4. Migración de las deudas
 * existentes").
 *
 * `paidInstallments` se mantiene en esta migración (se elimina en una
 * migración posterior, tras verificar el backfill — spec-026 Fase 7).
 */
export class AddDebtScheduleAndBudgetItemLink1786714977098
  implements MigrationInterface
{
  name = 'AddDebtScheduleAndBudgetItemLink1786714977098';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Guard: abortar si ya existen meses de presupuesto duplicados —
    //    budgets.service.ts:duplicate() asume unicidad de (month, year) pero
    //    hoy no hay ningún índice que la garantice.
    const duplicateBudgets: { month: number; year: number; ids: string }[] =
      await queryRunner.query(`
        SELECT "month", "year", string_agg("id"::text, ', ') AS ids
        FROM "budgets"
        GROUP BY "month", "year"
        HAVING count(*) > 1
      `);
    if (duplicateBudgets.length > 0) {
      const detail = duplicateBudgets
        .map((d) => `(${d.month}/${d.year}): ${d.ids}`)
        .join(' | ');
      throw new Error(
        `AddDebtScheduleAndBudgetItemLink: existen presupuestos duplicados para el mismo mes/año, consolídalos manualmente antes de migrar. Duplicados: ${detail}`,
      );
    }

    // 2. Columnas nuevas en `debts` — nullable primero para poder hacer
    //    backfill antes de forzar NOT NULL.
    await queryRunner.query(
      `ALTER TABLE "debts" ADD "startMonth" integer`,
    );
    await queryRunner.query(`ALTER TABLE "debts" ADD "startYear" integer`);
    await queryRunner.query(
      `ALTER TABLE "debts" ADD "paidOffAt" TIMESTAMP WITH TIME ZONE`,
    );

    // 3. Backfill: preserva el progreso actual de cada deuda.
    //    start = mesActual - paidInstallments + 1 (deudas con
    //    paidInstallments = 0 quedan con inicio el mes siguiente al actual).
    //    Aritmética de meses via (year*12 + month) para manejar el acarreo
    //    de año sin depender de funciones de fecha de Postgres.
    // `start_index` es un índice absoluto de mes en base 0 (año*12 + mes-1).
    // Para cualquier año calendario razonable (> año 0) es siempre positivo,
    // así que floor-division e integer-modulo de Postgres coinciden con la
    // aritmética matemática esperada sin necesidad de manejar signo.
    await queryRunner.query(`
      WITH current_month AS (
        SELECT EXTRACT(YEAR FROM now())::int AS year, EXTRACT(MONTH FROM now())::int AS month
      ),
      computed AS (
        SELECT
          d."id",
          GREATEST(
            (cm.year * 12 + (cm.month - 1)) - d."paidInstallments" + 1,
            0
          ) AS start_index
        FROM "debts" d, current_month cm
      )
      UPDATE "debts" d
      SET
        "startYear" = c.start_index / 12,
        "startMonth" = (c.start_index % 12) + 1
      FROM computed c
      WHERE d."id" = c."id"
    `);
    // `paidOffAt` para deudas ya `pagada`: se aproxima con `updatedAt`.
    await queryRunner.query(`
      UPDATE "debts" SET "paidOffAt" = "updatedAt" WHERE "status" = 'pagada'
    `);

    await queryRunner.query(
      `ALTER TABLE "debts" ALTER COLUMN "startMonth" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "debts" ALTER COLUMN "startYear" SET NOT NULL`,
    );

    // 4. Vínculo `budget_items` → `debts`.
    await queryRunner.query(
      `ALTER TABLE "budget_items" ADD "debtId" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_items" ADD "installmentNumber" integer`,
    );
    await queryRunner.query(`
      ALTER TABLE "budget_items"
      ADD CONSTRAINT "FK_budget_items_debt"
      FOREIGN KEY ("debtId") REFERENCES "debts"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_budget_items_debt_installment"
      ON "budget_items" ("debtId", "installmentNumber")
      WHERE "debtId" IS NOT NULL
    `);

    // 5. Índice único (month, year) en `budgets` — ya verificado sin
    //    duplicados por el guard del paso 1.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_budgets_month_year" ON "budgets" ("month", "year")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_budgets_month_year"`);
    await queryRunner.query(
      `DROP INDEX "public"."UQ_budget_items_debt_installment"`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_items" DROP CONSTRAINT "FK_budget_items_debt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_items" DROP COLUMN "installmentNumber"`,
    );
    await queryRunner.query(`ALTER TABLE "budget_items" DROP COLUMN "debtId"`);
    await queryRunner.query(`ALTER TABLE "debts" DROP COLUMN "paidOffAt"`);
    await queryRunner.query(`ALTER TABLE "debts" DROP COLUMN "startYear"`);
    await queryRunner.query(`ALTER TABLE "debts" DROP COLUMN "startMonth"`);
  }
}
