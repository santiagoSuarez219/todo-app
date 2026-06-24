import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateExpensesAndIncomes1782200000000 implements MigrationInterface {
    name = 'CreateExpensesAndIncomes1782200000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."expenses_type_enum" AS ENUM('basico', 'lujo', 'ahorro', 'pago_deuda')`);
        await queryRunner.query(`CREATE TABLE "expenses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "description" character varying(255) NOT NULL, "amount" numeric(12,2) NOT NULL, "date" date NOT NULL, "type" "public"."expenses_type_enum" NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_expenses" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."incomes_type_enum" AS ENUM('sueldo', 'freelance', 'intereses', 'dividendos', 'otro')`);
        await queryRunner.query(`CREATE TABLE "incomes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "description" character varying(255) NOT NULL, "amount" numeric(12,2) NOT NULL, "date" date NOT NULL, "type" "public"."incomes_type_enum" NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_incomes" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "incomes"`);
        await queryRunner.query(`DROP TYPE "public"."incomes_type_enum"`);
        await queryRunner.query(`DROP TABLE "expenses"`);
        await queryRunner.query(`DROP TYPE "public"."expenses_type_enum"`);
    }
}
