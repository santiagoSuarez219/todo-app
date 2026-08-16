import { MigrationInterface, QueryRunner } from 'typeorm';

export class CleanupActivityModel1787000000000 implements MigrationInterface {
  name = 'CleanupActivityModel1787000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // spec-027: `notionUrl`, `isRecurring` y `type` ya no sostienen ninguna
    // decisión real del modelo — ver spec-027 para el detalle. El contenido
    // de `notionUrl` y el valor de `type` por fila NO se conservan.
    await queryRunner.query(
      `ALTER TABLE "activities" DROP COLUMN IF EXISTS "notionUrl"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" DROP COLUMN IF EXISTS "isRecurring"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" DROP COLUMN IF EXISTS "type"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."activities_type_enum"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restituye estructura, no datos: `notionUrl` vuelve nula para todas las
    // filas y `type`/`isRecurring` vuelven a sus defaults originales, no al
    // valor real que tenían antes del `up()`.
    await queryRunner.query(
      `CREATE TYPE "public"."activities_type_enum" AS ENUM('reminder', 'task')`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ADD COLUMN "type" "public"."activities_type_enum" NOT NULL DEFAULT 'task'`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ADD COLUMN "isRecurring" BOOLEAN NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ADD COLUMN "notionUrl" VARCHAR`,
    );
  }
}
