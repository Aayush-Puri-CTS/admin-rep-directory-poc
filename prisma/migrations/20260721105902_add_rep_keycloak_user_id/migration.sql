/*
  Warnings:

  - A unique constraint covering the columns `[tenantId,keycloakUserId]` on the table `reps` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "reps" ADD COLUMN     "keycloakUserId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "reps_tenantId_keycloakUserId_key" ON "reps"("tenantId", "keycloakUserId");
