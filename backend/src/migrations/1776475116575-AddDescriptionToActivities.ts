import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDescriptionToActivities1776475116575 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "activities" ADD "description" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "activities" DROP COLUMN "description"`);
    }

}
