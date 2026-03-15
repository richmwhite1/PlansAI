-- AlterTable
ALTER TABLE "HangoutParticipant" ADD COLUMN IF NOT EXISTS "isMandatory" BOOLEAN NOT NULL DEFAULT false;
