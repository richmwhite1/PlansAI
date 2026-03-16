import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { getOrCreateProfile } from "@/lib/profile-utils";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        console.log("Friends API: Starting auth check...");
        const { userId } = await auth();
        console.log("Friends API: auth() returned userId:", userId);

        if (!userId) {
            console.log("Friends API: No userId, returning 401");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get user profile
        console.log("Friends API: Ensuring profile for clerkId:", userId);
        const profile = await getOrCreateProfile(userId);

        if (!profile) {
            console.log("Friends API: Profile not found, returning empty list");
            return NextResponse.json({ friends: [] });
        }
        console.log("Friends API: Found profile ID:", profile.id);

        const { searchParams } = new URL(req.url);
        const type = searchParams.get("type");
        console.log("Friends API: Request type:", type || "friends");

        let whereClause: any = {};
        if (type === 'requests') {
            whereClause = { status: "PENDING", profileBId: profile.id };
        } else if (type === 'sent') {
            whereClause = { status: "PENDING", profileAId: profile.id };
        } else {
            whereClause = {
                OR: [
                    { profileAId: profile.id },
                    { profileBId: profile.id }
                ],
                status: "ACCEPTED"
            };
        }
        console.log("Friends API: Query whereClause:", JSON.stringify(whereClause));

        // Get friendships
        console.log("Friends API: Executing prisma query...");
        const friendships = await prisma.friendship.findMany({
            where: whereClause,
            include: {
                profileA: {
                    select: { id: true, displayName: true, avatarUrl: true, email: true }
                },
                profileB: {
                    select: { id: true, displayName: true, avatarUrl: true, email: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        console.log("Friends API: Found", friendships.length, "friendships");

        // Compute per-friend last shared hangout date (2-query approach)
        const friendProfileIds = friendships
            .map((f: any) => f.profileAId === profile.id ? f.profileBId : f.profileAId)
            .filter(Boolean);

        const myParticipations = await prisma.hangoutParticipant.findMany({
            where: { profileId: profile.id },
            select: { hangoutId: true },
        });
        const myHangoutIds = myParticipations.map((p: any) => p.hangoutId);

        const sharedParticipations = myHangoutIds.length > 0 && friendProfileIds.length > 0
            ? await prisma.hangoutParticipant.findMany({
                where: {
                    profileId: { in: friendProfileIds },
                    hangoutId: { in: myHangoutIds },
                },
                include: {
                    hangout: { select: { scheduledFor: true } },
                },
                orderBy: { hangout: { scheduledFor: 'desc' } },
            })
            : [];

        const lastHangoutMap = new Map<string, Date>();
        for (const p of sharedParticipations) {
            if (p.profileId && p.hangout?.scheduledFor && !lastHangoutMap.has(p.profileId)) {
                lastHangoutMap.set(p.profileId, new Date(p.hangout.scheduledFor));
            }
        }

        // Extract friend profiles
        console.log("Friends API: Formatting friends list...");
        const friends = friendships.map((f: any) => {
            const friend = f.profileAId === profile.id ? f.profileB : f.profileA;
            if (!friend) {
                console.log("Friends API: WARNING - Friend profile is null for friendship", f.id);
                return null;
            }
            const friendId: string = friend.id;
            return {
                id: friendId,
                name: friend.displayName || friend.email || "Unknown",
                avatar: friend.avatarUrl || `https://i.pravatar.cc/150?u=${friendId}`,
                sharedHangouts: f.sharedHangoutCount,
                status: f.status,
                isRequester: f.profileAId === profile.id,
                createdAt: f.createdAt,
                lastHangoutAt: lastHangoutMap.get(friendId)?.toISOString() || null,
            };
        }).filter(Boolean);

        console.log("Friends API: Returning", friends.length, "friends");
        return NextResponse.json({ friends });

    } catch (error) {
        console.error("Friends API CRITICAL ERROR:", error);
        return NextResponse.json({
            error: "Internal Server Error",
            message: error instanceof Error ? error.message : String(error),
            stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
        }, { status: 500 });
    }
}
