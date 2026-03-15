import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: cachedEventId } = await params;

    const { userId } = await auth();
    if (!userId) return NextResponse.json({ friendCount: 0, avgRating: null, friendPreviews: [] });

    const profile = await prisma.profile.findUnique({
        where: { clerkId: userId },
        select: { id: true },
    });
    if (!profile) return NextResponse.json({ friendCount: 0, avgRating: null, friendPreviews: [] });

    const friendships = await prisma.friendship.findMany({
        where: {
            OR: [{ profileAId: profile.id }, { profileBId: profile.id }],
            status: "ACCEPTED",
        },
        select: { profileAId: true, profileBId: true },
    });
    const friendIds = friendships.map((f) =>
        f.profileAId === profile.id ? f.profileBId : f.profileAId
    );

    if (friendIds.length === 0) {
        return NextResponse.json({ friendCount: 0, avgRating: null, friendPreviews: [] });
    }

    // Friends who attended a COMPLETED hangout at this venue
    const visits = await prisma.hangoutParticipant.findMany({
        where: {
            profileId: { in: friendIds },
            rsvpStatus: "GOING",
            hangout: {
                finalActivityId: cachedEventId,
                status: "COMPLETED",
            },
        },
        select: {
            profileId: true,
            profile: { select: { displayName: true, avatarUrl: true } },
            hangout: {
                select: {
                    feedbacks: {
                        where: { profileId: { in: friendIds } },
                        select: { rating: true },
                    },
                },
            },
        },
        distinct: ["profileId"],
    });

    const friendCount = visits.length;

    const ratings = visits
        .flatMap((v) => v.hangout.feedbacks.map((f) => f.rating))
        .filter((r): r is number => r !== null);
    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

    const friendPreviews = visits.slice(0, 3).map((v) => ({
        displayName: v.profile?.displayName ?? null,
        avatarUrl: v.profile?.avatarUrl ?? null,
    }));

    return NextResponse.json({ friendCount, avgRating, friendPreviews });
}
