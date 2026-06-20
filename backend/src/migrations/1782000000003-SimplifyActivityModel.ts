import { MigrationInterface, QueryRunner } from 'typeorm';

export class SimplifyActivityModel1782000000003 implements MigrationInterface {
  name = 'SimplifyActivityModel1782000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop columns
    await queryRunner.query(`ALTER TABLE "activities" DROP COLUMN IF EXISTS "actionDate"`);
    await queryRunner.query(`ALTER TABLE "activities" DROP COLUMN IF EXISTS "duration"`);
    await queryRunner.query(`ALTER TABLE "activities" DROP COLUMN IF EXISTS "durationUnit"`);
    await queryRunner.query(`ALTER TABLE "activities" DROP COLUMN IF EXISTS "device"`);
    await queryRunner.query(`ALTER TABLE "activities" DROP COLUMN IF EXISTS "location"`);
    await queryRunner.query(`ALTER TABLE "activities" DROP COLUMN IF EXISTS "automatizacion"`);

    // Update activity_type enum: remove 'event'
    await queryRunner.query(`ALTER TABLE "activities" ALTER COLUMN "type" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "activities" ALTER COLUMN "type" TYPE varchar USING "type"::text`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."activities_type_enum"`);
    await queryRunner.query(`CREATE TYPE "public"."activities_type_enum" AS ENUM('reminder', 'task')`);
    await queryRunner.query(`ALTER TABLE "activities" ALTER COLUMN "type" TYPE "public"."activities_type_enum" USING "type"::"public"."activities_type_enum"`);
    await queryRunner.query(`ALTER TABLE "activities" ALTER COLUMN "type" SET DEFAULT 'task'`);

    // Drop unused enum types
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."activities_durationunit_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."activities_device_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."activities_automatizacion_enum"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate removed enum types
    await queryRunner.query(`CREATE TYPE "public"."activities_device_enum" AS ENUM('phone', 'computer', 'tablet')`);
    await queryRunner.query(`CREATE TYPE "public"."activities_durationunit_enum" AS ENUM('hours', 'days')`);
    await queryRunner.query(`CREATE TYPE "public"."activities_automatizacion_enum" AS ENUM('fully_automatable', 'partially_automatable', 'not_automatable')`);

    // Restore activity_type enum with 'event'
    await queryRunner.query(`ALTER TABLE "activities" ALTER COLUMN "type" TYPE varchar USING "type"::text`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."activities_type_enum"`);
    await queryRunner.query(`CREATE TYPE "public"."activities_type_enum" AS ENUM('reminder', 'event', 'task')`);
    await queryRunner.query(`ALTER TABLE "activities" ALTER COLUMN "type" TYPE "public"."activities_type_enum" USING "type"::"public"."activities_type_enum"`);
    await queryRunner.query(`ALTER TABLE "activities" ALTER COLUMN "type" SET DEFAULT 'task'`);

    // Restore columns
    await queryRunner.query(`ALTER TABLE "activities" ADD COLUMN "actionDate" TIMESTAMPTZ`);
    await queryRunner.query(`ALTER TABLE "activities" ADD COLUMN "duration" NUMERIC`);
    await queryRunner.query(`ALTER TABLE "activities" ADD COLUMN "durationUnit" "public"."activities_durationunit_enum"`);
    await queryRunner.query(`ALTER TABLE "activities" ADD COLUMN "device" "public"."activities_device_enum"`);
    await queryRunner.query(`ALTER TABLE "activities" ADD COLUMN "location" VARCHAR(255)`);
    await queryRunner.query(`ALTER TABLE "activities" ADD COLUMN "automatizacion" "public"."activities_automatizacion_enum"`);
  }
}
