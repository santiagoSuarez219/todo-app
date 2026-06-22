import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRecurrenceToActivities1782000000002 implements MigrationInterface {
  name = 'AddRecurrenceToActivities1782000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "activities"
        ADD COLUMN "isTemplate" boolean NOT NULL DEFAULT false,
        ADD COLUMN "templateId" uuid NULL,
        ADD COLUMN "isRecurring" boolean NOT NULL DEFAULT false,
        ADD COLUMN "recurrenceFrequency" varchar NULL,
        ADD COLUMN "recurrenceDays" integer[] NULL,
        ADD COLUMN "recurrenceDayOfMonth" integer NULL,
        ADD COLUMN "recurrenceEndDate" timestamptz NULL,
        ADD COLUMN "instanceDate" date NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "activities"
        ADD CONSTRAINT "FK_activities_template"
        FOREIGN KEY ("templateId")
        REFERENCES "activities"("id")
        ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_activities_templateId" ON "activities" ("templateId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_activities_isTemplate_isRecurring"
        ON "activities" ("isTemplate", "isRecurring")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_activities_isTemplate_isRecurring"`);
    await queryRunner.query(`DROP INDEX "IDX_activities_templateId"`);
    await queryRunner.query(`
      ALTER TABLE "activities"
        DROP CONSTRAINT "FK_activities_template"
    `);
    await queryRunner.query(`
      ALTER TABLE "activities"
        DROP COLUMN "isTemplate",
        DROP COLUMN "templateId",
        DROP COLUMN "isRecurring",
        DROP COLUMN "recurrenceFrequency",
        DROP COLUMN "recurrenceDays",
        DROP COLUMN "recurrenceDayOfMonth",
        DROP COLUMN "recurrenceEndDate",
        DROP COLUMN "instanceDate"
    `);
  }
}
