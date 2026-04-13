import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1776080084318 implements MigrationInterface {
    name = 'InitialSchema1776080084318'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."activities_priority_enum" AS ENUM('high', 'medium', 'low')`);
        await queryRunner.query(`CREATE TYPE "public"."activities_status_enum" AS ENUM('pending', 'in_progress', 'completed', 'cancelled', 'on_hold')`);
        await queryRunner.query(`CREATE TYPE "public"."activities_energy_enum" AS ENUM('high', 'medium', 'low')`);
        await queryRunner.query(`CREATE TYPE "public"."activities_durationunit_enum" AS ENUM('hours', 'days')`);
        await queryRunner.query(`CREATE TYPE "public"."activities_device_enum" AS ENUM('phone', 'computer', 'tablet')`);
        await queryRunner.query(`CREATE TYPE "public"."activities_type_enum" AS ENUM('reminder', 'event', 'task')`);
        await queryRunner.query(`CREATE TABLE "activities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "actionDate" TIMESTAMP WITH TIME ZONE, "dueDate" TIMESTAMP WITH TIME ZONE, "priority" "public"."activities_priority_enum" NOT NULL DEFAULT 'medium', "status" "public"."activities_status_enum" NOT NULL DEFAULT 'pending', "energy" "public"."activities_energy_enum" NOT NULL DEFAULT 'medium', "duration" numeric, "durationUnit" "public"."activities_durationunit_enum", "device" "public"."activities_device_enum", "type" "public"."activities_type_enum" NOT NULL DEFAULT 'task', "location" character varying(255), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "projectId" uuid, "parentId" uuid, CONSTRAINT "PK_7f4004429f731ffb9c88eb486a8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."projects_status_enum" AS ENUM('active', 'inactive', 'paused', 'completed')`);
        await queryRunner.query(`CREATE TABLE "projects" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "status" "public"."projects_status_enum" NOT NULL DEFAULT 'active', "startDate" date NOT NULL, "endDate" date, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6271df0a7aed1d6c0691ce6ac50" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "activities" ADD CONSTRAINT "FK_e67cee936823900fc4d5f3feb14" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "activities" ADD CONSTRAINT "FK_477cf498e3c7c18dd428e821022" FOREIGN KEY ("parentId") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "activities" DROP CONSTRAINT "FK_477cf498e3c7c18dd428e821022"`);
        await queryRunner.query(`ALTER TABLE "activities" DROP CONSTRAINT "FK_e67cee936823900fc4d5f3feb14"`);
        await queryRunner.query(`DROP TABLE "projects"`);
        await queryRunner.query(`DROP TYPE "public"."projects_status_enum"`);
        await queryRunner.query(`DROP TABLE "activities"`);
        await queryRunner.query(`DROP TYPE "public"."activities_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."activities_device_enum"`);
        await queryRunner.query(`DROP TYPE "public"."activities_durationunit_enum"`);
        await queryRunner.query(`DROP TYPE "public"."activities_energy_enum"`);
        await queryRunner.query(`DROP TYPE "public"."activities_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."activities_priority_enum"`);
    }

}
