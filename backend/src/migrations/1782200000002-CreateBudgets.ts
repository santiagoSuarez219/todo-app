import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateBudgets1782200000002 implements MigrationInterface {
    name = 'CreateBudgets1782200000002'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "budgets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "month" integer NOT NULL, "year" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_budgets" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "budget_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "description" character varying(255) NOT NULL, "plannedAmount" numeric(12,2) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "budgetId" uuid, CONSTRAINT "PK_budget_items" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "budget_items" ADD CONSTRAINT "FK_budget_items_budget" FOREIGN KEY ("budgetId") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "budget_items" DROP CONSTRAINT "FK_budget_items_budget"`);
        await queryRunner.query(`DROP TABLE "budget_items"`);
        await queryRunner.query(`DROP TABLE "budgets"`);
    }
}
