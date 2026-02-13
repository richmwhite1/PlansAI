import { prisma } from "@/lib/prisma";
import { createClerkClient } from "@clerk/nextjs/server";
import { Profile, RsvpStatus } from "@prisma/client";

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

const profileInclude = {
    _count: {
        select: {
            friendshipsA: true,
            friendshipsB: true,
            hangoutsCreated: true,
            participants: {
                where: { rsvpStatus: RsvpStatus.GOING }
            }
        }
    }
};

export type ExtendedProfile = Profile & {
    // Polyfill for fields potentially missing in outdated types
    transportMode?: string | null;
    cuisinePreferences?: string[];
    drinkPreferences?: string[];

    _count: {
        friendshipsA: number;
        friendshipsB: number;
        hangoutsCreated: number;
        participants: number;
    }
};

/**
 * Ensures a local Profile exists for a given Clerk User ID.
 * If not, fetches user info from Clerk and creates the profile.
 */
export async function getOrCreateProfile(clerkUserId: string): Promise<ExtendedProfile | null> {
    if (!clerkUserId) return null;

    // 1. Try to find existing profile
    let profile = await prisma.profile.findUnique({
        where: { clerkId: clerkUserId },
        include: profileInclude
    });

    if (profile) return profile as ExtendedProfile;

    // 2. Fetch user from Clerk
    try {
        const user = await clerkClient.users.getUser(clerkUserId);
        const email = user.emailAddresses[0]?.emailAddress;

        // 3. Upsert profile (to handle race conditions)
        profile = await prisma.profile.upsert({
            where: { clerkId: clerkUserId },
            update: {},
            create: {
                clerkId: clerkUserId,
                email: email,
                displayName: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : (email ? email.split("@")[0] : "New User"),
                avatarUrl: user.imageUrl,
            },
            include: profileInclude
        });

        return profile as ExtendedProfile;
    } catch (error) {
        console.error(`Error in getOrCreateProfile for ${clerkUserId}:`, error);
        return null; // Return null or handle error appropriately
    }
}

export async function ensureProfileByClerkId(clerkUserId: string) {
    return getOrCreateProfile(clerkUserId);
}

/**
 * Fetches a profile by its internal ID (not Clerk ID).
 */
export async function getProfileById(profileId: string): Promise<ExtendedProfile | null> {
    return prisma.profile.findUnique({
        where: { id: profileId },
        include: profileInclude
    }) as Promise<ExtendedProfile | null>;
}
