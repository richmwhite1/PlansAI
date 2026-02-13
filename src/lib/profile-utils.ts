import { prisma } from "@/lib/prisma";
import { createClerkClient } from "@clerk/nextjs/server";

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

/**
 * Ensures a local Profile exists for a given Clerk User ID.
 * If not, fetches user info from Clerk and creates the profile.
 */
export async function getOrCreateProfile(clerkUserId: string) {
    if (!clerkUserId) return null;

    // 1. Try to find existing profile
    let profile = await prisma.profile.findUnique({
        where: { clerkId: clerkUserId },
    });

    if (profile) return profile;

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
            }
        });

        return profile;
    } catch (error) {
        console.error(`Error in getOrCreateProfile for ${clerkUserId}:`, error);
        return null;
    }
}

/**
 * Creates a skeleton profile for a user using their Clerk ID.
 * Useful when a user wants to interact with another user who hasn't logged into the app yet.
 */
export async function ensureProfileByClerkId(clerkUserId: string) {
    return getOrCreateProfile(clerkUserId);
}
