/*
  Warnings:

  - You are about to drop the column `duration` on the `HangoutTimeOption` table. All the data in the column will be lost.
  - You are about to drop the column `proposedAt` on the `HangoutTimeOption` table. All the data in the column will be lost.
  - You are about to drop the column `timeOptionId` on the `Vote` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[inviteToken]` on the table `Hangout` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `startTime` to the `HangoutTimeOption` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "HangoutVisibility" AS ENUM ('PRIVATE', 'FRIENDS_ONLY', 'PUBLIC');

-- CreateEnum
CREATE TYPE "FriendshipStatus" AS ENUM ('PENDING', 'ACCEPTED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('FRIEND_REQUEST', 'HANGOUT_INVITE', 'HANGOUT_UPDATE', 'HANGOUT_REMINDER', 'SYSTEM');

-- DropForeignKey
ALTER TABLE "Vote" DROP CONSTRAINT "Vote_timeOptionId_fkey";

-- DropIndex
DROP INDEX "Vote_hangoutId_guestId_timeOptionId_key";

-- DropIndex
DROP INDEX "Vote_hangoutId_profileId_timeOptionId_key";

-- AlterTable
ALTER TABLE "CachedEvent" ADD COLUMN     "locationUrl" TEXT;

-- AlterTable
ALTER TABLE "Friendship" ADD COLUMN     "status" "FriendshipStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Hangout" ADD COLUMN     "allowParticipantSuggestions" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "consensusThreshold" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "inviteToken" TEXT,
ADD COLUMN     "isVotingEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "visibility" "HangoutVisibility" NOT NULL DEFAULT 'PRIVATE';

-- AlterTable
ALTER TABLE "HangoutParticipant" ADD COLUMN     "isMandatory" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "HangoutTimeOption" DROP COLUMN "duration",
DROP COLUMN "proposedAt",
ADD COLUMN     "endTime" TIMESTAMP(3),
ADD COLUMN     "startTime" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "bigFive" JSONB,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "customPersonality" TEXT,
ADD COLUMN     "dietaryPreferences" TEXT[],
ADD COLUMN     "enneagram" TEXT,
ADD COLUMN     "homeZipcode" TEXT,
ADD COLUMN     "interests" TEXT[],
ADD COLUMN     "locationUrl" TEXT,
ADD COLUMN     "mbti" TEXT,
ADD COLUMN     "scheduleFlexibility" TEXT,
ADD COLUMN     "websiteUrl" TEXT,
ADD COLUMN     "zodiac" TEXT;

-- AlterTable
ALTER TABLE "Vote" DROP COLUMN "timeOptionId";

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM',
    "content" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HangoutFeedback" (
    "id" TEXT NOT NULL,
    "hangoutId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "reflection" TEXT NOT NULL,
    "rating" INTEGER,
    "extractedVibes" JSONB,
    "extractedKeywords" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HangoutFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HangoutTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "HangoutType" NOT NULL DEFAULT 'CASUAL',
    "creatorId" TEXT NOT NULL,
    "activityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HangoutTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeVote" (
    "id" TEXT NOT NULL,
    "timeOptionId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "TimeVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "HangoutFeedback_hangoutId_idx" ON "HangoutFeedback"("hangoutId");

-- CreateIndex
CREATE INDEX "HangoutFeedback_profileId_idx" ON "HangoutFeedback"("profileId");

-- CreateIndex
CREATE INDEX "HangoutTemplate_creatorId_idx" ON "HangoutTemplate"("creatorId");

-- CreateIndex
CREATE INDEX "TimeVote_profileId_idx" ON "TimeVote"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "TimeVote_timeOptionId_profileId_key" ON "TimeVote"("timeOptionId", "profileId");

-- CreateIndex
CREATE UNIQUE INDEX "Hangout_inviteToken_key" ON "Hangout"("inviteToken");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HangoutFeedback" ADD CONSTRAINT "HangoutFeedback_hangoutId_fkey" FOREIGN KEY ("hangoutId") REFERENCES "Hangout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HangoutFeedback" ADD CONSTRAINT "HangoutFeedback_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HangoutTemplate" ADD CONSTRAINT "HangoutTemplate_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "CachedEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HangoutTemplate" ADD CONSTRAINT "HangoutTemplate_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeVote" ADD CONSTRAINT "TimeVote_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeVote" ADD CONSTRAINT "TimeVote_timeOptionId_fkey" FOREIGN KEY ("timeOptionId") REFERENCES "HangoutTimeOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
