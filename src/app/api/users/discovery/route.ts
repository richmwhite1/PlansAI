import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth, createClerkClient } from "@clerk/nextjs/server";
import { getOrCreateProfile } from "@/lib/profile-utils";

export const dynamic = 'force-dynamic';

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export async function GET(req: NextRequest) {
    try {
        const { userId: clerkUserId } = await auth();
        if (!clerkUserId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 1. Get current user profile (if exists)
        const currentProfile = await getOrCreateProfile(clerkUserId);

        const excludedClerkIds = new Set<string>();
        excludedClerkIds.add(clerkUserId);

        // 2. Find all existing friendships (ACCEPTED) to exclude
        if (currentProfile) {
            const friendships = await prisma.friendship.findMany({
                where: {
                    OR: [
                        { profileAId: currentProfile.id },
                        { profileBId: currentProfile.id }
                    ],
                    status: "ACCEPTED"
                }
            });

            friendships.forEach(f => {
                const friendClerkId = f.profileAId === currentProfile.id ? f.profileB?.clerkId : f.profileA?.clerkId;
                if (friendClerkId) excludedClerkIds.add(friendClerkId);
            });
        }

        // 3. Fetch all database profiles (if they aren't the current user and aren't accepted friends)
        // This is better than fetching from Clerk because it ensures we see everyone on the platform.
        const allProfiles = await prisma.profile.findMany({
            where: {
                clerkId: { not: clerkUserId },
                NOT: {
                    clerkId: { in: Array.from(excludedClerkIds) }
                }
            },
            take: 50,
        });

        const suggestedUsers = allProfiles.map(p => ({
            id: p.id,
            name: p.displayName || p.email || "Unknown",
            email: p.email,
            avatar: p.avatarUrl || `https://i.pravatar.cc/150?u=${p.id}`,
            bio: p.bio,
            isClerkDiscovery: false
        }));

        return NextResponse.json({
            users: suggestedUsers
        });

    } catch (error: any) {
        console.error("Discovery API CRITICAL ERROR:", error);
        return NextResponse.json({
            error: "Internal Server Error",
            message: error.message
        }, { status: 500 });
    }
}
