import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDebts1782749715235 implements MigrationInterface {
  name = 'CreateDebts1782749715235';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."debts_status_enum" AS ENUM('activa', 'pagada')`,
    );
    await queryRunner.query(
      `CREATE TABLE "debts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "description" character varying(255) NOT NULL,
        "productValue" numeric(12,2) NOT NULL,
        "installmentValue" numeric(12,2) NOT NULL,
        "totalInstallments" integer NOT NULL,
        "initialPayment" numeric(12,2),
        "paidInstallments" integer NOT NULL DEFAULT '0',
        "status" "public"."debts_status_enum" NOT NULL DEFAULT 'activa',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_4bd9f54aab9e59628a3a2657fa1" PRIMARY KEY ("id")
      )`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "debts"`);
    await queryRunner.query(`DROP TYPE "public"."debts_status_enum"`);
  }
}
