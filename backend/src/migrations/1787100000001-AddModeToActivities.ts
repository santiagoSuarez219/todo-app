import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddModeToActivities1787100000001 implements MigrationInterface {
  name = 'AddModeToActivities1787100000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // spec-036: columna nullable, sin default ni backfill — null = sin Claude
    // (trabajo propio). Las etiquetas [A]/[CA]/[C] de los títulos las migra el
    // asistente con un script único, fuera de esta migración.
    await queryRunner.query(
      `CREATE TYPE "public"."activities_mode_enum" AS ENUM('autonomous', 'cowork_async', 'cowork')`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ADD COLUMN "mode" "public"."activities_mode_enum"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "activities" DROP COLUMN "mode"`);
    await queryRunner.query(`DROP TYPE "public"."activities_mode_enum"`);
  }
}
