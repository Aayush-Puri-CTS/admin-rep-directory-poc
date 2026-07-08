-- CreateEnum
CREATE TYPE "RepStatus" AS ENUM ('PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'SOFT_DELETED');

-- CreateEnum
CREATE TYPE "RepType" AS ENUM ('AGENT', 'BROKER', 'GA', 'MGA', 'SUPER_GA');

-- CreateEnum
CREATE TYPE "RepPlatform" AS ENUM ('ENROLLPRIME', 'EXTRA_HEALTH', 'ASSURE_HEALTH');

-- CreateEnum
CREATE TYPE "PlatformAccessType" AS ENUM ('ENABLED', 'DISABLED');

-- CreateEnum
CREATE TYPE "RepAddressType" AS ENUM ('MAILING', 'BUSINESS', 'HOME', 'BILLING');

-- CreateEnum
CREATE TYPE "PartyRelationshipType" AS ENUM ('SERVICES_GROUP');

-- CreateTable
CREATE TABLE "reps" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "middleName" TEXT,
    "email" TEXT NOT NULL,
    "cellPhone" TEXT,
    "telephone" TEXT,
    "fax" TEXT,
    "num800" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "ssn" TEXT,
    "businessName" TEXT,
    "businessTaxId" TEXT,
    "businessEmail" TEXT,
    "status" "RepStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "repType" "RepType",
    "bio" TEXT,
    "isEliteBlue" BOOLEAN NOT NULL DEFAULT false,
    "uplineRepId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rep_platform_access" (
    "id" TEXT NOT NULL,
    "repId" TEXT NOT NULL,
    "platform" "RepPlatform" NOT NULL,
    "accessType" "PlatformAccessType" NOT NULL DEFAULT 'DISABLED',

    CONSTRAINT "rep_platform_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rep_addresses" (
    "id" TEXT NOT NULL,
    "repId" TEXT NOT NULL,
    "type" "RepAddressType" NOT NULL,
    "payeeName" TEXT,
    "address1" TEXT NOT NULL,
    "address2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "uspsVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rep_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rep_licenses" (
    "id" TEXT NOT NULL,
    "repId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "licenseResident" TEXT,
    "licenseFor" TEXT,
    "expiryDate" TIMESTAMP(3),
    "licenseDocUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rep_licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rep_documents" (
    "id" TEXT NOT NULL,
    "repId" TEXT NOT NULL,
    "fileTitle" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "docNotes" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rep_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rep_administrator_users" (
    "id" TEXT NOT NULL,
    "repId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "skipValidationEmail" BOOLEAN NOT NULL DEFAULT false,
    "skipValidationPhone" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rep_administrator_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "party_relationships" (
    "id" TEXT NOT NULL,
    "repId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "relationshipType" "PartyRelationshipType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "party_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reps_email_key" ON "reps"("email");

-- CreateIndex
CREATE UNIQUE INDEX "rep_platform_access_repId_platform_key" ON "rep_platform_access"("repId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "party_relationships_repId_groupId_relationshipType_key" ON "party_relationships"("repId", "groupId", "relationshipType");

-- CreateIndex
CREATE INDEX "outbox_events_publishedAt_retryCount_idx" ON "outbox_events"("publishedAt", "retryCount");

-- AddForeignKey
ALTER TABLE "reps" ADD CONSTRAINT "reps_uplineRepId_fkey" FOREIGN KEY ("uplineRepId") REFERENCES "reps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rep_platform_access" ADD CONSTRAINT "rep_platform_access_repId_fkey" FOREIGN KEY ("repId") REFERENCES "reps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rep_addresses" ADD CONSTRAINT "rep_addresses_repId_fkey" FOREIGN KEY ("repId") REFERENCES "reps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rep_licenses" ADD CONSTRAINT "rep_licenses_repId_fkey" FOREIGN KEY ("repId") REFERENCES "reps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rep_documents" ADD CONSTRAINT "rep_documents_repId_fkey" FOREIGN KEY ("repId") REFERENCES "reps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rep_administrator_users" ADD CONSTRAINT "rep_administrator_users_repId_fkey" FOREIGN KEY ("repId") REFERENCES "reps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "party_relationships" ADD CONSTRAINT "party_relationships_repId_fkey" FOREIGN KEY ("repId") REFERENCES "reps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
