-- AlterEnum
ALTER TYPE "ParticipantRole" ADD VALUE 'GUEST';

-- AlterTable
ALTER TABLE "Hangout" ADD COLUMN     "allowGuestsToInvite" BOOLEAN NOT NULL DEFAULT false;
