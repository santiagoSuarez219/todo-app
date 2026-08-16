import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompletedAtAndPostponementCountToActivities1787000000001
  implements MigrationInterface
{
  name = 'AddCompletedAtAndPostponementCountToActivities1787000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // spec-028: sin backfill — las actividades ya `completed` quedan con
    // `completedAt: null` (un dato ausente es más honesto que aproximarlo
    // con `updatedAt`, ver "Decisiones ya resueltas" del spec).
    await queryRunner.query(
      `ALTER TABLE "activities" ADD COLUMN "completedAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ADD COLUMN "postponementCount" integer NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "activities" DROP COLUMN "postponementCount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" DROP COLUMN "completedAt"`,
    );
  }
}
