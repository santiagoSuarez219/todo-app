import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTestingToActivities1787000000006
  implements MigrationInterface
{
  name = 'AddTestingToActivities1787000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // spec-033: mismo patrón que spec-032 (AddWaitingToActivities) — `ALTER
    // TYPE ... ADD VALUE` no se puede usar dentro de la misma transacción de
    // migración (el valor nuevo no sería utilizable hasta el commit): se
    // crea el tipo nuevo, se migra la columna, se borra el viejo y se
    // renombra.
    await queryRunner.query(
      `CREATE TYPE "public"."activities_status_enum_new" AS ENUM('pending', 'in_progress', 'testing', 'completed', 'cancelled', 'on_hold', 'waiting')`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ALTER COLUMN "status" TYPE "public"."activities_status_enum_new" USING "status"::text::"public"."activities_status_enum_new"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ALTER COLUMN "status" SET DEFAULT 'pending'`,
    );
    await queryRunner.query(`DROP TYPE "public"."activities_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."activities_status_enum_new" RENAME TO "activities_status_enum"`,
    );

    // spec-033: sin columnas nuevas y sin backfill — ninguna actividad
    // cambia de estado por esta migración. `testing` no tiene campos
    // asociados, a diferencia de `waiting` (waitingFor/waitingSince).
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Atención: esta reversión degrada con pérdida de información — si
    // existen filas en 'testing', se convierten a 'in_progress' antes de
    // achicar el enum (si no, el USING de más abajo fallaría al no poder
    // mapear 'testing' al tipo reducido). Se elige 'in_progress' y no
    // 'on_hold': lo contrario de "pendiente de probar" es "todavía en
    // construcción", no "pausado".
    await queryRunner.query(
      `UPDATE "activities" SET "status" = 'in_progress' WHERE "status" = 'testing'`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."activities_status_enum_old" AS ENUM('pending', 'in_progress', 'completed', 'cancelled', 'on_hold', 'waiting')`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ALTER COLUMN "status" TYPE "public"."activities_status_enum_old" USING "status"::text::"public"."activities_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ALTER COLUMN "status" SET DEFAULT 'pending'`,
    );
    await queryRunner.query(`DROP TYPE "public"."activities_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."activities_status_enum_old" RENAME TO "activities_status_enum"`,
    );
  }
}
