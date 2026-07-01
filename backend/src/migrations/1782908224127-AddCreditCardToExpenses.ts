import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCreditCardToExpenses1782908224127 implements MigrationInterface {
    name = 'AddCreditCardToExpenses1782908224127';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "expenses" ADD "creditCardId" uuid`);
        await queryRunner.query(`ALTER TABLE "expenses" ADD CONSTRAINT "FK_expenses_creditCardId" FOREIGN KEY ("creditCardId") REFERENCES "credit_cards"("id") ON DELETE SET NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "expenses" DROP CONSTRAINT "FK_expenses_creditCardId"`);
        await queryRunner.query(`ALTER TABLE "expenses" DROP COLUMN "creditCardId"`);
    }

}
