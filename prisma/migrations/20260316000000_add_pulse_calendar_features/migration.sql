-- CreateEnum
CREATE TYPE "PulseStatus" AS ENUM ('OPEN', 'GRADUATED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PulseAnswer" AS ENUM ('YES', 'MAYBE', 'NO');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'PULSE_RESPONSE';
ALTER TYPE "NotificationType" ADD VALUE 'PULSE_GRADUATED';

-- CreateTable
CREATE TABLE "Pulse" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "message" TEXT,
    "status" "PulseStatus" NOT NULL DEFAULT 'OPEN',
    "targetTime" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "graduatedToId" TEXT,
    "graduateThreshold" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pulse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PulseResponse" (
    "id" TEXT NOT NULL,
    "pulseId" TEXT NOT NULL,
    "profileId" TEXT,
    "guestId" TEXT,
    "answer" "PulseAnswer" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PulseResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleCalendarToken" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "scope" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleCalendarToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Pulse_creatorId_idx" ON "Pulse"("creatorId");

-- CreateIndex
CREATE INDEX "Pulse_expiresAt_idx" ON "Pulse"("expiresAt");

-- CreateIndex
CREATE INDEX "Pulse_status_idx" ON "Pulse"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PulseResponse_pulseId_profileId_key" ON "PulseResponse"("pulseId", "profileId");

-- CreateIndex
CREATE UNIQUE INDEX "PulseResponse_pulseId_guestId_key" ON "PulseResponse"("pulseId", "guestId");

-- CreateIndex
CREATE INDEX "PulseResponse_pulseId_idx" ON "PulseResponse"("pulseId");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleCalendarToken_profileId_key" ON "GoogleCalendarToken"("profileId");

-- AddForeignKey
ALTER TABLE "Pulse" ADD CONSTRAINT "Pulse_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PulseResponse" ADD CONSTRAINT "PulseResponse_pulseId_fkey" FOREIGN KEY ("pulseId") REFERENCES "Pulse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PulseResponse" ADD CONSTRAINT "PulseResponse_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PulseResponse" ADD CONSTRAINT "PulseResponse_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "GuestProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleCalendarToken" ADD CONSTRAINT "GoogleCalendarToken_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
