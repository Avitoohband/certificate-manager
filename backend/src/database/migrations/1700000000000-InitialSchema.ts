import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create users table
    await queryRunner.query(`
      CREATE TYPE "user_role_enum" AS ENUM ('admin', 'user', 'viewer');
      
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "password" character varying NOT NULL,
        "firstName" character varying,
        "lastName" character varying,
        "role" "user_role_enum" NOT NULL DEFAULT 'user',
        "isActive" boolean NOT NULL DEFAULT true,
        "refreshToken" character varying,
        "lastLoginAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      );
      
      CREATE INDEX "IDX_users_email" ON "users" ("email");
    `);

    // Create oauth_providers table
    await queryRunner.query(`
      CREATE TYPE "oauth_provider_type_enum" AS ENUM ('google', 'github');
      
      CREATE TABLE "oauth_providers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "provider" "oauth_provider_type_enum" NOT NULL,
        "providerId" character varying NOT NULL,
        "email" character varying,
        "profile" jsonb,
        "userId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_oauth_providers_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_oauth_providers_userId" FOREIGN KEY ("userId") 
          REFERENCES "users"("id") ON DELETE CASCADE
      );
      
      CREATE INDEX "IDX_oauth_providers_provider_providerId" 
        ON "oauth_providers" ("provider", "providerId");
    `);

    // Create certificates table
    await queryRunner.query(`
      CREATE TYPE "certificate_status_enum" AS ENUM ('active', 'expiring', 'expired', 'revoked');
      CREATE TYPE "certificate_type_enum" AS ENUM ('rsa_2048', 'rsa_4096', 'ec_p256', 'ec_p384');
      
      CREATE TABLE "certificates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "commonName" character varying NOT NULL,
        "organization" character varying,
        "organizationUnit" character varying,
        "country" character varying,
        "state" character varying,
        "locality" character varying,
        "subjectAltNames" text array NOT NULL DEFAULT '{}',
        "type" "certificate_type_enum" NOT NULL DEFAULT 'rsa_2048',
        "status" "certificate_status_enum" NOT NULL DEFAULT 'active',
        "serialNumber" character varying NOT NULL,
        "certificate" text NOT NULL,
        "encryptedPrivateKey" text NOT NULL,
        "privateKeyIV" character varying NOT NULL,
        "privateKeyTag" character varying NOT NULL,
        "validFrom" date NOT NULL,
        "validTo" date NOT NULL,
        "revokedAt" TIMESTAMP,
        "revocationReason" character varying,
        "metadata" jsonb,
        "ownerId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_certificates_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_certificates_ownerId" FOREIGN KEY ("ownerId") 
          REFERENCES "users"("id") ON DELETE CASCADE
      );
      
      CREATE INDEX "IDX_certificates_ownerId" ON "certificates" ("ownerId");
      CREATE INDEX "IDX_certificates_status" ON "certificates" ("status");
      CREATE INDEX "IDX_certificates_validTo" ON "certificates" ("validTo");
    `);

    // Create audit_logs table
    await queryRunner.query(`
      CREATE TYPE "audit_action_enum" AS ENUM (
        'user_created', 'user_updated', 'user_deleted', 'user_login', 'user_logout',
        'cert_created', 'cert_viewed', 'cert_updated', 'cert_renewed', 
        'cert_revoked', 'cert_downloaded', 'private_key_accessed'
      );
      
      CREATE TABLE "audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "action" "audit_action_enum" NOT NULL,
        "userId" uuid,
        "resourceType" character varying,
        "resourceId" character varying,
        "ipAddress" character varying,
        "userAgent" character varying,
        "metadata" jsonb,
        "errorMessage" text,
        "success" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_audit_logs_userId" FOREIGN KEY ("userId") 
          REFERENCES "users"("id") ON DELETE SET NULL
      );
      
      CREATE INDEX "IDX_audit_logs_userId_createdAt" ON "audit_logs" ("userId", "createdAt");
      CREATE INDEX "IDX_audit_logs_action_createdAt" ON "audit_logs" ("action", "createdAt");
      CREATE INDEX "IDX_audit_logs_createdAt" ON "audit_logs" ("createdAt");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP TYPE "audit_action_enum"`);
    await queryRunner.query(`DROP TABLE "certificates"`);
    await queryRunner.query(`DROP TYPE "certificate_type_enum"`);
    await queryRunner.query(`DROP TYPE "certificate_status_enum"`);
    await queryRunner.query(`DROP TABLE "oauth_providers"`);
    await queryRunner.query(`DROP TYPE "oauth_provider_type_enum"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "user_role_enum"`);
  }
}
