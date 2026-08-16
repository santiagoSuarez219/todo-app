import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHorizonToProjects1787000000002 implements MigrationInterface {
  name = 'AddHorizonToProjects1787000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // spec-029: el DEFAULT hace de backfill — todos los proyectos existentes
    // quedan en 'next' sin necesidad de un UPDATE adicional.
    await queryRunner.query(
      `CREATE TYPE "public"."projects_horizon_enum" AS ENUM('now', 'next', 'later', 'someday')`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD COLUMN "horizon" "public"."projects_horizon_enum" NOT NULL DEFAULT 'next'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "horizon"`);
    await queryRunner.query(
      `DROP TYPE "public"."projects_horizon_enum"`,
    );
  }
}
