import { MigrationInterface, QueryRunner } from "typeorm";

export class CascadeDeleteActivitiesOnProjectDelete1781021538497 implements MigrationInterface {
    name = 'CascadeDeleteActivitiesOnProjectDelete1781021538497'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "activities" DROP CONSTRAINT "FK_e67cee936823900fc4d5f3feb14"`);
        await queryRunner.query(`ALTER TABLE "activities" ADD CONSTRAINT "FK_e67cee936823900fc4d5f3feb14" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "activities" DROP CONSTRAINT "FK_e67cee936823900fc4d5f3feb14"`);
        await queryRunner.query(`ALTER TABLE "activities" ADD CONSTRAINT "FK_e67cee936823900fc4d5f3feb14" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

}
