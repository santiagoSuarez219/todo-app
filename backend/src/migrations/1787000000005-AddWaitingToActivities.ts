import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWaitingToActivities1787000000005
  implements MigrationInterface
{
  name = 'AddWaitingToActivities1787000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // spec-032: `ALTER TYPE ... ADD VALUE` no se puede usar dentro de la
    // misma transacción de migración (el valor nuevo no sería utilizable
    // hasta el commit) — se usa el patrón estándar que genera TypeORM para
    // ampliar un enum: crear el tipo nuevo, migrar la columna, borrar el
    // viejo y renombrar.
    await queryRunner.query(
      `CREATE TYPE "public"."activities_status_enum_new" AS ENUM('pending', 'in_progress', 'completed', 'cancelled', 'on_hold', 'waiting')`,
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

    // spec-032: sin backfill — ninguna actividad cambia de estado por esta
    // migración. waitingFor/waitingSince solo tienen sentido junto a
    // status = 'waiting', que ninguna fila tiene todavía.
    await queryRunner.query(
      `ALTER TABLE "activities" ADD COLUMN "waitingFor" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ADD COLUMN "waitingSince" date`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Atención: esta reversión degrada con pérdida de información — si
    // existen filas en 'waiting', se convierten a 'on_hold' antes de
    // achicar el enum (si no, el USING de más abajo fallaría al no poder
    // mapear 'waiting' al tipo reducido). El dato de "estaba esperando a
    // alguien desde tal fecha" no se recupera.
    await queryRunner.query(
      `UPDATE "activities" SET "status" = 'on_hold' WHERE "status" = 'waiting'`,
    );

    await queryRunner.query(
      `ALTER TABLE "activities" DROP COLUMN "waitingSince"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" DROP COLUMN "waitingFor"`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."activities_status_enum_old" AS ENUM('pending', 'in_progress', 'completed', 'cancelled', 'on_hold')`,
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
