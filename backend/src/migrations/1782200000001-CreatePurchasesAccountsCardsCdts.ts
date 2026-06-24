import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePurchasesAccountsCardsCdts1782200000001 implements MigrationInterface {
    name = 'CreatePurchasesAccountsCardsCdts1782200000001'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."purchases_priority_enum" AS ENUM('alta', 'media', 'baja')`);
        await queryRunner.query(`CREATE TYPE "public"."purchases_store_enum" AS ENUM('amazon', 'temu', 'mercadolibre', 'otra')`);
        await queryRunner.query(`CREATE TYPE "public"."purchases_status_enum" AS ENUM('pendiente', 'comprado', 'descartado')`);
        await queryRunner.query(`CREATE TABLE "purchases" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "description" character varying(255) NOT NULL, "estimatedPrice" numeric(12,2), "priority" "public"."purchases_priority_enum" NOT NULL DEFAULT 'media', "store" "public"."purchases_store_enum" NOT NULL DEFAULT 'otra', "status" "public"."purchases_status_enum" NOT NULL DEFAULT 'pendiente', "url" character varying, "notes" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_purchases" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."accounts_type_enum" AS ENUM('corriente', 'ahorros', 'digital')`);
        await queryRunner.query(`CREATE TABLE "accounts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "type" "public"."accounts_type_enum" NOT NULL, "bank" character varying(255) NOT NULL, "currentBalance" numeric(15,2) NOT NULL, "interestRate" numeric(5,4), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_accounts" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "credit_cards" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "bank" character varying(255) NOT NULL, "interestRate" numeric(5,4) NOT NULL, "monthlyFee" numeric(10,2) NOT NULL, "totalLimit" numeric(15,2) NOT NULL, "availableLimit" numeric(15,2) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_credit_cards" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "cdts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "bank" character varying(255) NOT NULL, "investedAmount" numeric(15,2) NOT NULL, "interestRate" numeric(5,4) NOT NULL, "startDate" date NOT NULL, "endDate" date NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_cdts" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "cdts"`);
        await queryRunner.query(`DROP TABLE "credit_cards"`);
        await queryRunner.query(`DROP TABLE "accounts"`);
        await queryRunner.query(`DROP TYPE "public"."accounts_type_enum"`);
        await queryRunner.query(`DROP TABLE "purchases"`);
        await queryRunner.query(`DROP TYPE "public"."purchases_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."purchases_store_enum"`);
        await queryRunner.query(`DROP TYPE "public"."purchases_priority_enum"`);
    }
}
