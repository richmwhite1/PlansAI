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

        // 2. Find all existing friendships (any status) to exclude
        if (currentProfile) {
            const friendships = await prisma.friendship.findMany({
                where: {
                    OR: [
                        { profileAId: currentProfile.id },
                        { profileBId: currentProfile.id }
                    ]
                },
                include: {
                    profileA: true,
                    profileB: true
                }
            });

            friendships.forEach(f => {
                if (f.profileA?.clerkId) excludedClerkIds.add(f.profileA.clerkId);
                if (f.profileB?.clerkId) excludedClerkIds.add(f.profileB.clerkId);
            });
        }

        // 3. Fetch all users from Clerk
        // Note: For large datasets, we'd want to search or paginate, but for now we list
        const clerkUsersResponse = await clerkClient.users.getUserList({
            limit: 100, // Fetch top 100 users
        });

        // 4. Map Clerk users to our internal structure and filter
        const suggestedUsers = clerkUsersResponse.data
            .filter(user => !excludedClerkIds.has(user.id))
            .map(user => ({
                id: user.id, // Using Clerk ID here so we can upsert on add
                name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : (user.emailAddresses[0]?.emailAddress.split("@")[0] || "Unknown"),
                email: user.emailAddresses[0]?.emailAddress,
                avatar: user.imageUrl || `https://i.pravatar.cc/150?u=${user.id}`,
                isClerkDiscovery: true
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
