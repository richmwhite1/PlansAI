import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.profile.findUnique({
        where: { clerkId: userId },
        select: { id: true, availableStatus: true, availableUntil: true },
    });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    // Get accepted friends with their availability
    const friendships = await prisma.friendship.findMany({
        where: {
            OR: [{ profileAId: profile.id }, { profileBId: profile.id }],
            status: "ACCEPTED",
        },
        include: {
            profileA: { select: { id: true, displayName: true, avatarUrl: true, availableStatus: true, availableUntil: true } },
            profileB: { select: { id: true, displayName: true, avatarUrl: true, availableStatus: true, availableUntil: true } },
        },
        orderBy: { sharedHangoutCount: "asc" },
    });

    const now = new Date();

    const friends = friendships.map((f) => {
        const other = f.profileAId === profile.id ? f.profileB : f.profileA;
        // Only surface availability if not expired
        const isActive = other.availableStatus && other.availableUntil && new Date(other.availableUntil) > now;
        return {
            id: other.id,
            displayName: other.displayName,
            avatarUrl: other.avatarUrl,
            availableStatus: isActive ? other.availableStatus : null,
        };
    });

    const friendIds = friends.map((f) => f.id);

    // Find friends already in upcoming shared hangouts (not completed/cancelled)
    const myActiveParticipations = await prisma.hangoutParticipant.findMany({
        where: {
            profileId: profile.id,
            hangout: { status: { notIn: ["COMPLETED", "CANCELLED"] } },
        },
        select: { hangoutId: true },
    });
    const activeHangoutIds = myActiveParticipations.map((p) => p.hangoutId);

    const coParticipants = activeHangoutIds.length > 0
        ? await prisma.hangoutParticipant.findMany({
            where: {
                hangoutId: { in: activeHangoutIds },
                profileId: { in: friendIds },
            },
            select: { profileId: true },
            distinct: ["profileId"],
        })
        : [];

    const inPlansSet = new Set(coParticipants.map((p) => p.profileId));

    // Drift friends = accepted friends NOT in any upcoming plan with you
    const driftFriends = friends
        .filter((f) => !inPlansSet.has(f.id))
        .slice(0, 3)
        .map((f) => ({ id: f.id, displayName: f.displayName, avatarUrl: f.avatarUrl }));

    const myStatus = profile.availableStatus && profile.availableUntil && new Date(profile.availableUntil) > now
        ? profile.availableStatus
        : null;

    return NextResponse.json({ friends, driftFriends, myStatus });
}
