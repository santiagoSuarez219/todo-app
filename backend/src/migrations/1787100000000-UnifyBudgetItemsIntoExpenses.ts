import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * spec-035 — Fase 1: fusiona `budget_items` en `expenses`. A partir de aquí
 * un gasto planeado y uno ejecutado son la misma fila (ver spec-035,
 * "Semántica derivada"): `amount`/`date` pasan a nullable, se agregan
 * `plannedAmount`, `budgetId`, `debtId` e `installmentNumber` (heredados de
 * `BudgetItem`), y la tabla `budget_items` desaparece.
 *
 * Orden de la migración:
 *   1. Columnas nuevas en `expenses` (nullable) + `amount`/`date` a nullable.
 *   2. Copia de `budget_items` → `expenses`, preservando el `id` original
 *      (ambas PK son uuid — conservarlo mantiene estables los IDs que ya
 *      circulan por la UI y por el MCP).
 *   3. Backfill de `budgetId` en los gastos preexistentes, por el mes de su
 *      `date` (los de meses sin presupuesto quedan sueltos, por diseño).
 *   4. Índices y CHECKs.
 *   5. Drop de `budget_items`.
 *
 * `down()` es una reconstrucción best-effort y **con pérdida**: los gastos
 * "solo plan" (`amount IS NULL`) no tienen representación en el esquema
 * anterior y se eliminan al revertir. Es un recurso de emergencia local, no
 * un camino soportado en producción — ver spec-035, riesgo 1.
 */
export class UnifyBudgetItemsIntoExpenses1787100000000 implements MigrationInterface {
  name = 'UnifyBudgetItemsIntoExpenses1787100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Columnas nuevas en `expenses` — nullable para permitir la copia
    //    antes de tocar las restricciones NOT NULL existentes.
    await queryRunner.query(
      `ALTER TABLE "expenses" ADD "plannedAmount" numeric(12,2)`,
    );
    await queryRunner.query(`ALTER TABLE "expenses" ADD "budgetId" uuid`);
    await queryRunner.query(`ALTER TABLE "expenses" ADD "debtId" uuid`);
    await queryRunner.query(
      `ALTER TABLE "expenses" ADD "installmentNumber" integer`,
    );

    await queryRunner.query(`
      ALTER TABLE "expenses"
      ADD CONSTRAINT "FK_expenses_budgetId"
      FOREIGN KEY ("budgetId") REFERENCES "budgets"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "expenses"
      ADD CONSTRAINT "FK_expenses_debtId"
      FOREIGN KEY ("debtId") REFERENCES "debts"("id") ON DELETE CASCADE
    `);

    // `amount`/`date` pasan a nullable: un gasto puede ser solo planeado.
    await queryRunner.query(
      `ALTER TABLE "expenses" ALTER COLUMN "amount" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "expenses" ALTER COLUMN "date" DROP NOT NULL`,
    );

    // 2. Copia de budget_items → expenses, preservando el id original.
    //    amount/date quedan NULL: en el esquema viejo un BudgetItem nunca
    //    tenía ejecución real asociada.
    await queryRunner.query(`
      INSERT INTO "expenses"
        ("id", "description", "plannedAmount", "type", "budgetId", "debtId",
         "installmentNumber", "amount", "date", "createdAt", "updatedAt")
      SELECT
        "id", "description", "plannedAmount", "type", "budgetId", "debtId",
        "installmentNumber", NULL, NULL, "createdAt", "updatedAt"
      FROM "budget_items"
    `);

    // 3. Backfill de budgetId en los gastos preexistentes, por el mes de su
    //    date. El guard `budgetId IS NULL` deja intactas las filas recién
    //    insertadas en el paso 2 (que ya traen su budgetId real o NULL a
    //    propósito). Los gastos de meses sin presupuesto quedan sueltos.
    await queryRunner.query(`
      UPDATE "expenses" e
      SET "budgetId" = b."id"
      FROM "budgets" b
      WHERE e."budgetId" IS NULL
        AND e."date" IS NOT NULL
        AND EXTRACT(MONTH FROM e."date") = b."month"
        AND EXTRACT(YEAR FROM e."date") = b."year"
    `);

    // 4. Índices — portados 1:1 desde budget_items, más el índice de
    //    budgetId que usan los agregados mensuales.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_expenses_debt_installment"
      ON "expenses" ("debtId", "installmentNumber")
      WHERE "debtId" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_expenses_budgetId" ON "expenses" ("budgetId")
    `);

    // CHECKs: ni una fila vacía (sin plan ni monto), ni un "ejecutado sin
    // fecha" (amount y date siempre van juntos).
    await queryRunner.query(`
      ALTER TABLE "expenses"
      ADD CONSTRAINT "CHK_expenses_has_amount"
      CHECK ("amount" IS NOT NULL OR "plannedAmount" IS NOT NULL)
    `);
    await queryRunner.query(`
      ALTER TABLE "expenses"
      ADD CONSTRAINT "CHK_expenses_amount_date_together"
      CHECK (("amount" IS NULL) = ("date" IS NULL))
    `);

    // 5. Ya no existe el concepto de ítem de presupuesto como entidad propia.
    await queryRunner.query(
      `ALTER TABLE "budget_items" DROP CONSTRAINT "FK_budget_items_debt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_items" DROP CONSTRAINT "FK_budget_items_budget"`,
    );
    await queryRunner.query(`DROP TABLE "budget_items"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reconstrucción best-effort — ver advertencia de pérdida en el
    // encabezado del archivo.
    await queryRunner.query(`
      CREATE TABLE "budget_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "description" character varying(255) NOT NULL,
        "plannedAmount" numeric(12,2) NOT NULL,
        "type" "public"."expenses_type_enum" NOT NULL DEFAULT 'basico',
        "budgetId" uuid,
        "debtId" uuid,
        "installmentNumber" integer,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_budget_items" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "budget_items"
      ADD CONSTRAINT "FK_budget_items_budget"
      FOREIGN KEY ("budgetId") REFERENCES "budgets"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "budget_items"
      ADD CONSTRAINT "FK_budget_items_debt"
      FOREIGN KEY ("debtId") REFERENCES "debts"("id") ON DELETE CASCADE
    `);

    // Solo las filas que eran ítems de presupuesto tienen representación en
    // el esquema anterior (tenían plannedAmount y pertenecían a un budget).
    await queryRunner.query(`
      INSERT INTO "budget_items"
        ("id", "description", "plannedAmount", "type", "budgetId", "debtId",
         "installmentNumber", "createdAt", "updatedAt")
      SELECT
        "id", "description", "plannedAmount", "type", "budgetId", "debtId",
        "installmentNumber", "createdAt", "updatedAt"
      FROM "expenses"
      WHERE "plannedAmount" IS NOT NULL AND "budgetId" IS NOT NULL
    `);

    // Los gastos "solo plan" no pueden coexistir con el esquema viejo:
    // se pierden. Los "planeado y ejecutado" (settled) sobreviven como
    // expense y además quedan duplicados como budget_item — mismo estado
    // que existía antes de este spec.
    await queryRunner.query(`DELETE FROM "expenses" WHERE "amount" IS NULL`);

    await queryRunner.query(
      `ALTER TABLE "expenses" DROP CONSTRAINT "CHK_expenses_amount_date_together"`,
    );
    await queryRunner.query(
      `ALTER TABLE "expenses" DROP CONSTRAINT "CHK_expenses_has_amount"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_expenses_budgetId"`);
    await queryRunner.query(
      `DROP INDEX "public"."UQ_expenses_debt_installment"`,
    );

    await queryRunner.query(
      `ALTER TABLE "expenses" ALTER COLUMN "date" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "expenses" ALTER COLUMN "amount" SET NOT NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "expenses" DROP CONSTRAINT "FK_expenses_debtId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "expenses" DROP CONSTRAINT "FK_expenses_budgetId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "expenses" DROP COLUMN "installmentNumber"`,
    );
    await queryRunner.query(`ALTER TABLE "expenses" DROP COLUMN "debtId"`);
    await queryRunner.query(`ALTER TABLE "expenses" DROP COLUMN "budgetId"`);
    await queryRunner.query(
      `ALTER TABLE "expenses" DROP COLUMN "plannedAmount"`,
    );
  }
}
