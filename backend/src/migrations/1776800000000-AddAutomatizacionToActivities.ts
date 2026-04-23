import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAutomatizacionToActivities1776800000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."activities_automatizacion_enum" AS ENUM('fully_automatable', 'partially_automatable', 'not_automatable')`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ADD "automatizacion" "public"."activities_automatizacion_enum"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "activities" DROP COLUMN "automatizacion"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."activities_automatizacion_enum"`,
    );
  }
}
