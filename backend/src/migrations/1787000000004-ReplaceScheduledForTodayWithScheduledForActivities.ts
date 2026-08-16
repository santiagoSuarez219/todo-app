import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReplaceScheduledForTodayWithScheduledForActivities1787000000004
  implements MigrationInterface
{
  name = 'ReplaceScheduledForTodayWithScheduledForActivities1787000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // spec-031: no se puede castear boolean -> date, así que se hace
    // explícito en tres pasos: add, backfill, drop.
    await queryRunner.query(
      `ALTER TABLE "activities" ADD COLUMN "scheduledFor" date`,
    );

    // Backfill: el flag `true` significa hoy "quiero ver esto en Hoy" — se
    // traduce a CURRENT_DATE para conservar esa intención el día de la
    // migración y dejar que caduque sola al día siguiente. Las completadas
    // ya estaban excluidas de la vista Hoy por status != completed; no se
    // les inventa una fecha que nunca se usó.
    await queryRunner.query(
      `UPDATE "activities" SET "scheduledFor" = CURRENT_DATE WHERE "scheduledForToday" = true AND "status" <> 'completed'`,
    );

    await queryRunner.query(
      `ALTER TABLE "activities" DROP COLUMN "scheduledForToday"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Lossy: la fecha exacta de scheduledFor no se recupera. Una
    // programación futura se degrada a `true` (que en el modelo anterior
    // solo podía significar "hoy").
    await queryRunner.query(
      `ALTER TABLE "activities" ADD COLUMN "scheduledForToday" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `UPDATE "activities" SET "scheduledForToday" = ("scheduledFor" IS NOT NULL)`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" DROP COLUMN "scheduledFor"`,
    );
  }
}
