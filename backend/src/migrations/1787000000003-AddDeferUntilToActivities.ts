import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeferUntilToActivities1787000000003
  implements MigrationInterface
{
  name = 'AddDeferUntilToActivities1787000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // spec-030: sin backfill ni default — todas las actividades existentes
    // quedan en `null`, comportamiento idéntico al actual (compatibilidad total).
    await queryRunner.query(
      `ALTER TABLE "activities" ADD COLUMN "deferUntil" date`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "activities" DROP COLUMN "deferUntil"`,
    );
  }
}
