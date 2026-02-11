-- CreateEnum
CREATE TYPE "HangoutType" AS ENUM ('DATE', 'GROUP_DINNER', 'ACTIVITY', 'TRIP', 'PARTY', 'CASUAL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "HangoutStatus" AS ENUM ('PLANNING', 'VOTING', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('CREATOR', 'ORGANIZER', 'MEMBER');

-- CreateEnum
CREATE TYPE "RsvpStatus" AS ENUM ('PENDING', 'GOING', 'MAYBE', 'NOT_GOING');

-- CreateEnum
CREATE TYPE "EventSource" AS ENUM ('GOOGLE_PLACES', 'GOOGLE_EVENTS', 'EVENTBRITE', 'YELP', 'USER_SUBMITTED', 'AI_GENERATED');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'SYSTEM', 'AI');

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "phone" TEXT,
    "homeLatitude" DOUBLE PRECISION,
    "homeLongitude" DOUBLE PRECISION,
    "homeCity" TEXT,
    "homeState" TEXT,
    "travelRadiusMiles" INTEGER NOT NULL DEFAULT 25,
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "vibeHistory" JSONB NOT NULL DEFAULT '[]',
    "trustScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "hangoutCount" INTEGER NOT NULL DEFAULT 0,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestProfile" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "convertedToProfileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuestProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Friendship" (
    "id" TEXT NOT NULL,
    "profileAId" TEXT NOT NULL,
    "profileBId" TEXT NOT NULL,
    "sharedHangoutCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hangout" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "HangoutType" NOT NULL DEFAULT 'CASUAL',
    "status" "HangoutStatus" NOT NULL DEFAULT 'PLANNING',
    "creatorId" TEXT NOT NULL,
    "finalActivityId" TEXT,
    "finalDateTime" TIMESTAMP(3),
    "midpointLat" DOUBLE PRECISION,
    "midpointLng" DOUBLE PRECISION,
    "searchRadiusMiles" INTEGER NOT NULL DEFAULT 10,
    "summary" TEXT,
    "vibeScore" TEXT,
    "votingEndsAt" TIMESTAMP(3),
    "allowGuestVotes" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "scheduledFor" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Hangout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HangoutParticipant" (
    "id" TEXT NOT NULL,
    "hangoutId" TEXT NOT NULL,
    "profileId" TEXT,
    "guestId" TEXT,
    "role" "ParticipantRole" NOT NULL DEFAULT 'MEMBER',
    "rsvpStatus" "RsvpStatus" NOT NULL DEFAULT 'PENDING',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "HangoutParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CachedEvent" (
    "id" TEXT NOT NULL,
    "googlePlaceId" TEXT,
    "externalId" TEXT,
    "source" "EventSource" NOT NULL DEFAULT 'GOOGLE_PLACES',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "priceLevel" INTEGER,
    "rating" DOUBLE PRECISION,
    "reviewCount" INTEGER,
    "imageUrl" TEXT,
    "websiteUrl" TEXT,
    "phoneNumber" TEXT,
    "isTimeBound" BOOLEAN NOT NULL DEFAULT false,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "operatingHours" JSONB,
    "vibes" TEXT[],
    "suitableFor" TEXT[],
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "staleAt" TIMESTAMP(3) NOT NULL,
    "localTrustScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "timesSelected" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CachedEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HangoutActivityOption" (
    "id" TEXT NOT NULL,
    "hangoutId" TEXT NOT NULL,
    "cachedEventId" TEXT NOT NULL,
    "groupTrustScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HangoutActivityOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HangoutTimeOption" (
    "id" TEXT NOT NULL,
    "hangoutId" TEXT NOT NULL,
    "proposedAt" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HangoutTimeOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "hangoutId" TEXT NOT NULL,
    "profileId" TEXT,
    "guestId" TEXT,
    "activityOptionId" TEXT,
    "timeOptionId" TEXT,
    "value" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "hangoutId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HangoutPhoto" (
    "id" TEXT NOT NULL,
    "hangoutId" TEXT NOT NULL,
    "uploaderId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HangoutPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscoverableHangout" (
    "id" TEXT NOT NULL,
    "hangoutId" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "maxGuests" INTEGER,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "city" TEXT NOT NULL,
    "happeningAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscoverableHangout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Profile_clerkId_key" ON "Profile"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_email_key" ON "Profile"("email");

-- CreateIndex
CREATE INDEX "Profile_clerkId_idx" ON "Profile"("clerkId");

-- CreateIndex
CREATE INDEX "Profile_homeLatitude_homeLongitude_idx" ON "Profile"("homeLatitude", "homeLongitude");

-- CreateIndex
CREATE UNIQUE INDEX "GuestProfile_token_key" ON "GuestProfile"("token");

-- CreateIndex
CREATE INDEX "GuestProfile_token_idx" ON "GuestProfile"("token");

-- CreateIndex
CREATE INDEX "GuestProfile_expiresAt_idx" ON "GuestProfile"("expiresAt");

-- CreateIndex
CREATE INDEX "Friendship_profileAId_idx" ON "Friendship"("profileAId");

-- CreateIndex
CREATE INDEX "Friendship_profileBId_idx" ON "Friendship"("profileBId");

-- CreateIndex
CREATE UNIQUE INDEX "Friendship_profileAId_profileBId_key" ON "Friendship"("profileAId", "profileBId");

-- CreateIndex
CREATE UNIQUE INDEX "Hangout_slug_key" ON "Hangout"("slug");

-- CreateIndex
CREATE INDEX "Hangout_creatorId_idx" ON "Hangout"("creatorId");

-- CreateIndex
CREATE INDEX "Hangout_status_idx" ON "Hangout"("status");

-- CreateIndex
CREATE INDEX "Hangout_scheduledFor_idx" ON "Hangout"("scheduledFor");

-- CreateIndex
CREATE INDEX "Hangout_slug_idx" ON "Hangout"("slug");

-- CreateIndex
CREATE INDEX "Hangout_midpointLat_midpointLng_idx" ON "Hangout"("midpointLat", "midpointLng");

-- CreateIndex
CREATE INDEX "HangoutParticipant_hangoutId_idx" ON "HangoutParticipant"("hangoutId");

-- CreateIndex
CREATE INDEX "HangoutParticipant_profileId_idx" ON "HangoutParticipant"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "HangoutParticipant_hangoutId_profileId_key" ON "HangoutParticipant"("hangoutId", "profileId");

-- CreateIndex
CREATE UNIQUE INDEX "HangoutParticipant_hangoutId_guestId_key" ON "HangoutParticipant"("hangoutId", "guestId");

-- CreateIndex
CREATE UNIQUE INDEX "CachedEvent_googlePlaceId_key" ON "CachedEvent"("googlePlaceId");

-- CreateIndex
CREATE INDEX "CachedEvent_latitude_longitude_idx" ON "CachedEvent"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "CachedEvent_category_idx" ON "CachedEvent"("category");

-- CreateIndex
CREATE INDEX "CachedEvent_expiresAt_idx" ON "CachedEvent"("expiresAt");

-- CreateIndex
CREATE INDEX "CachedEvent_city_state_idx" ON "CachedEvent"("city", "state");

-- CreateIndex
CREATE INDEX "CachedEvent_vibes_idx" ON "CachedEvent"("vibes");

-- CreateIndex
CREATE INDEX "HangoutActivityOption_hangoutId_idx" ON "HangoutActivityOption"("hangoutId");

-- CreateIndex
CREATE UNIQUE INDEX "HangoutActivityOption_hangoutId_cachedEventId_key" ON "HangoutActivityOption"("hangoutId", "cachedEventId");

-- CreateIndex
CREATE INDEX "HangoutTimeOption_hangoutId_idx" ON "HangoutTimeOption"("hangoutId");

-- CreateIndex
CREATE INDEX "Vote_hangoutId_idx" ON "Vote"("hangoutId");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_hangoutId_profileId_activityOptionId_key" ON "Vote"("hangoutId", "profileId", "activityOptionId");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_hangoutId_profileId_timeOptionId_key" ON "Vote"("hangoutId", "profileId", "timeOptionId");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_hangoutId_guestId_activityOptionId_key" ON "Vote"("hangoutId", "guestId", "activityOptionId");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_hangoutId_guestId_timeOptionId_key" ON "Vote"("hangoutId", "guestId", "timeOptionId");

-- CreateIndex
CREATE INDEX "Message_hangoutId_createdAt_idx" ON "Message"("hangoutId", "createdAt");

-- CreateIndex
CREATE INDEX "HangoutPhoto_hangoutId_idx" ON "HangoutPhoto"("hangoutId");

-- CreateIndex
CREATE UNIQUE INDEX "DiscoverableHangout_hangoutId_key" ON "DiscoverableHangout"("hangoutId");

-- CreateIndex
CREATE INDEX "DiscoverableHangout_latitude_longitude_idx" ON "DiscoverableHangout"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "DiscoverableHangout_city_idx" ON "DiscoverableHangout"("city");

-- CreateIndex
CREATE INDEX "DiscoverableHangout_happeningAt_idx" ON "DiscoverableHangout"("happeningAt");

-- CreateIndex
CREATE INDEX "DiscoverableHangout_expiresAt_idx" ON "DiscoverableHangout"("expiresAt");

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_profileAId_fkey" FOREIGN KEY ("profileAId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_profileBId_fkey" FOREIGN KEY ("profileBId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hangout" ADD CONSTRAINT "Hangout_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hangout" ADD CONSTRAINT "Hangout_finalActivityId_fkey" FOREIGN KEY ("finalActivityId") REFERENCES "CachedEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HangoutParticipant" ADD CONSTRAINT "HangoutParticipant_hangoutId_fkey" FOREIGN KEY ("hangoutId") REFERENCES "Hangout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HangoutParticipant" ADD CONSTRAINT "HangoutParticipant_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HangoutParticipant" ADD CONSTRAINT "HangoutParticipant_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "GuestProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HangoutActivityOption" ADD CONSTRAINT "HangoutActivityOption_hangoutId_fkey" FOREIGN KEY ("hangoutId") REFERENCES "Hangout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HangoutActivityOption" ADD CONSTRAINT "HangoutActivityOption_cachedEventId_fkey" FOREIGN KEY ("cachedEventId") REFERENCES "CachedEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HangoutTimeOption" ADD CONSTRAINT "HangoutTimeOption_hangoutId_fkey" FOREIGN KEY ("hangoutId") REFERENCES "Hangout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_hangoutId_fkey" FOREIGN KEY ("hangoutId") REFERENCES "Hangout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "GuestProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_activityOptionId_fkey" FOREIGN KEY ("activityOptionId") REFERENCES "HangoutActivityOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_timeOptionId_fkey" FOREIGN KEY ("timeOptionId") REFERENCES "HangoutTimeOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_hangoutId_fkey" FOREIGN KEY ("hangoutId") REFERENCES "Hangout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HangoutPhoto" ADD CONSTRAINT "HangoutPhoto_hangoutId_fkey" FOREIGN KEY ("hangoutId") REFERENCES "Hangout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HangoutPhoto" ADD CONSTRAINT "HangoutPhoto_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoverableHangout" ADD CONSTRAINT "DiscoverableHangout_hangoutId_fkey" FOREIGN KEY ("hangoutId") REFERENCES "Hangout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
