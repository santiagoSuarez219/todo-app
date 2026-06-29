import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTypeToBudgetItems1782743385300 implements MigrationInterface {
  name = 'AddTypeToBudgetItems1782743385300';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "budget_items" ADD "type" "public"."expenses_type_enum" NOT NULL DEFAULT 'basico'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "budget_items" DROP COLUMN "type"`);
  }
}
