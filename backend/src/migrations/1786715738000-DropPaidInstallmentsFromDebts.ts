import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * spec-026 — Fase 7: elimina la columna `paidInstallments` de `debts`, ya
 * reemplazada por el cálculo derivado del calendario de cuotas
 * (`startMonth`/`startYear` + hoy — ver `debts.service.ts`). Se ejecuta en
 * una migración separada de `AddDebtScheduleAndBudgetItemLink`, después de
 * verificar en local que el backfill de `startMonth`/`startYear` preserva
 * exactamente el progreso previo de cada deuda.
 */
export class DropPaidInstallmentsFromDebts1786715738000
  implements MigrationInterface
{
  name = 'DropPaidInstallmentsFromDebts1786715738000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "debts" DROP COLUMN "paidInstallments"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // El valor no se puede reconstruir exactamente (era un contador
    // acumulado independiente del calendario); se restaura en 0 y queda
    // desincronizado hasta que se recalcule manualmente si algún día se
    // revierte esta migración.
    await queryRunner.query(
      `ALTER TABLE "debts" ADD "paidInstallments" integer NOT NULL DEFAULT 0`,
    );
  }
}
