import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        console.log("Discovery API: Starting auth check...");
        const { userId } = await auth();
        console.log("Discovery API: auth() returned userId:", userId);

        if (!userId) {
            console.log("Discovery API: No userId, returning 401");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get current user profile
        console.log("Discovery API: Fetching current profile...");
        const currentProfile = await prisma.profile.findUnique({
            where: { clerkId: userId }
        });
        console.log("Discovery API: currentProfile:", currentProfile?.id || "not found");

        const excludedIds = new Set<string>();

        if (currentProfile) {
            excludedIds.add(currentProfile.id);

            // Get IDs of people I already have a friendship with (any status)
            console.log("Discovery API: Fetching existing friendships...");
            const existingFriendships = await prisma.friendship.findMany({
                where: {
                    OR: [
                        { profileAId: currentProfile.id },
                        { profileBId: currentProfile.id }
                    ]
                },
                select: {
                    profileAId: true,
                    profileBId: true
                }
            });
            console.log("Discovery API: Found", existingFriendships.length, "existing friendships");

            existingFriendships.forEach((f: { profileAId: string; profileBId: string }) => {
                excludedIds.add(f.profileAId);
                excludedIds.add(f.profileBId);
            });
        }

        // Find users NOT in excludedIds
        console.log("Discovery API: Fetching suggested users...");
        const suggestedUsers = await prisma.profile.findMany({
            where: {
                id: { notIn: Array.from(excludedIds) }
            },
            select: {
                id: true,
                displayName: true,
                email: true,
                avatarUrl: true
            },
            take: 20,
            orderBy: {
                createdAt: 'desc'
            }
        });
        console.log("Discovery API: Found", suggestedUsers.length, "suggested users");

        return NextResponse.json({
            users: suggestedUsers.map((u: any) => ({
                id: u.id,
                name: u.displayName || u.email?.split("@")[0] || "Unknown",
                email: u.email,
                avatar: u.avatarUrl || `https://i.pravatar.cc/150?u=${u.id}`
            }))
        });

    } catch (error: any) {
        console.error("Discovery API CRITICAL ERROR:", error);
        return NextResponse.json({
            error: "Internal Server Error",
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}
