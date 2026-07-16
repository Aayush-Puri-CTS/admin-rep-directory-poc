/*
  Warnings:

  - Added the required column `tenantId` to the `outbox_events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `party_relationships` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `rep_addresses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `rep_administrator_users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `rep_documents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `rep_licenses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `rep_platform_access` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `reps` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "outbox_events_publishedAt_retryCount_idx";

-- AlterTable
-- tenantId is added nullable, backfilled, then locked to NOT NULL — a bare
-- `ADD COLUMN ... NOT NULL` (Prisma's naive default) fails on any table that
-- already has rows, since those rows predate the tenant model. Pre-existing
-- rows are assigned to a synthetic 'default-tenant'; this value is dev-only
-- and never valid input from TenantContext, which always resolves the real
-- tenant from the platform-injected JWT claim.
ALTER TABLE "outbox_events" ADD COLUMN     "tenantId" TEXT;
ALTER TABLE "party_relationships" ADD COLUMN     "tenantId" TEXT;
ALTER TABLE "rep_addresses" ADD COLUMN     "tenantId" TEXT;
ALTER TABLE "rep_administrator_users" ADD COLUMN     "tenantId" TEXT;
ALTER TABLE "rep_documents" ADD COLUMN     "tenantId" TEXT;
ALTER TABLE "rep_licenses" ADD COLUMN     "tenantId" TEXT;
ALTER TABLE "rep_platform_access" ADD COLUMN     "tenantId" TEXT;
ALTER TABLE "reps" ADD COLUMN     "tenantId" TEXT;

-- Backfill: assign pre-existing rows to a synthetic default tenant
UPDATE "outbox_events" SET "tenantId" = 'default-tenant' WHERE "tenantId" IS NULL;
UPDATE "party_relationships" SET "tenantId" = 'default-tenant' WHERE "tenantId" IS NULL;
UPDATE "rep_addresses" SET "tenantId" = 'default-tenant' WHERE "tenantId" IS NULL;
UPDATE "rep_administrator_users" SET "tenantId" = 'default-tenant' WHERE "tenantId" IS NULL;
UPDATE "rep_documents" SET "tenantId" = 'default-tenant' WHERE "tenantId" IS NULL;
UPDATE "rep_licenses" SET "tenantId" = 'default-tenant' WHERE "tenantId" IS NULL;
UPDATE "rep_platform_access" SET "tenantId" = 'default-tenant' WHERE "tenantId" IS NULL;
UPDATE "reps" SET "tenantId" = 'default-tenant' WHERE "tenantId" IS NULL;

-- Enforce NOT NULL now that every row has a value
ALTER TABLE "outbox_events" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "party_relationships" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "rep_addresses" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "rep_administrator_users" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "rep_documents" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "rep_licenses" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "rep_platform_access" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "reps" ALTER COLUMN "tenantId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "outbox_events_tenantId_publishedAt_retryCount_idx" ON "outbox_events"("tenantId", "publishedAt", "retryCount");

-- CreateIndex
CREATE INDEX "party_relationships_tenantId_idx" ON "party_relationships"("tenantId");

-- CreateIndex
CREATE INDEX "rep_addresses_tenantId_idx" ON "rep_addresses"("tenantId");

-- CreateIndex
CREATE INDEX "rep_administrator_users_tenantId_idx" ON "rep_administrator_users"("tenantId");

-- CreateIndex
CREATE INDEX "rep_documents_tenantId_idx" ON "rep_documents"("tenantId");

-- CreateIndex
CREATE INDEX "rep_licenses_tenantId_idx" ON "rep_licenses"("tenantId");

-- CreateIndex
CREATE INDEX "rep_platform_access_tenantId_idx" ON "rep_platform_access"("tenantId");

-- CreateIndex
CREATE INDEX "reps_tenantId_idx" ON "reps"("tenantId");

-- RowLevelSecurity: see ADR-002 (shared tables + PostgreSQL RLS for tenant isolation).
-- PrismaService.withTenantTransaction() issues `SET LOCAL app.current_tenant_id` at the
-- start of every transaction; these policies are the enforcement point that makes
-- cross-tenant reads/writes fail closed if that ever isn't set.
ALTER TABLE "reps" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reps" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "reps"
  USING ("tenantId" = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "rep_platform_access" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rep_platform_access" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "rep_platform_access"
  USING ("tenantId" = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "rep_addresses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rep_addresses" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "rep_addresses"
  USING ("tenantId" = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "rep_licenses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rep_licenses" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "rep_licenses"
  USING ("tenantId" = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "rep_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rep_documents" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "rep_documents"
  USING ("tenantId" = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "rep_administrator_users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rep_administrator_users" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "rep_administrator_users"
  USING ("tenantId" = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "party_relationships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "party_relationships" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "party_relationships"
  USING ("tenantId" = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "outbox_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "outbox_events" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "outbox_events"
  USING ("tenantId" = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));
