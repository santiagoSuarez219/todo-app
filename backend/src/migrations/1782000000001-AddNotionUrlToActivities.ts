import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotionUrlToActivities1782000000001
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "activities" ADD COLUMN "notionUrl" varchar NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "activities" DROP COLUMN "notionUrl"`,
    );
  }
}
