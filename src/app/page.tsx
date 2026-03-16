import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { isFuture } from "date-fns";
import { HomeFeed } from "@/components/dashboard/home-feed";
import { LandingPage } from "@/components/dashboard/landing-page";
import { DashboardEngine } from "@/components/dashboard/dashboard-engine";

export default async function Home() {
    const { userId } = await auth();

    // ── Unauthenticated ─────────────────────────────────────────────────────
    if (!userId) {
        return <LandingPage />;
    }

    // ── Authenticated: fetch plans ───────────────────────────────────────────
    const profile = await prisma.profile.findUnique({ where: { clerkId: userId } });

    // No profile yet (first ever visit before creating one) — show creation form
    if (!profile) {
        return (
            <main className="min-h-screen bg-background p-4 pb-24 md:p-8">
                <div className="max-w-md mx-auto mt-8">
                    <DashboardEngine />
                </div>
            </main>
        );
    }

    const now = new Date();

    const [participations, userVotes, friendships] = await Promise.all([
        prisma.hangoutParticipant.findMany({
            where: { profileId: profile.id },
            include: {
                hangout: {
                    include: {
                        creator: true,
                        participants: {
                            take: 5,
                            include: {
                                profile: { select: { id: true, displayName: true, avatarUrl: true } },
                                guest: { select: { id: true, displayName: true } },
                            },
                        },
                        finalActivity: { select: { id: true, name: true, imageUrl: true, address: true } },
                        activityOptions: {
                            take: 1,
                            include: {
                                cachedEvent: { select: { id: true, name: true, imageUrl: true } },
                            },
                        },
                        feedbacks: {
                            where: { profileId: profile.id },
                            select: { id: true },
                        },
                    },
                },
            },
            orderBy: { hangout: { updatedAt: "desc" } },
            take: 30,
        }),
        prisma.vote.findMany({
            where: { profileId: profile.id },
            select: { hangoutId: true },
            distinct: ["hangoutId"],
        }),
        prisma.friendship.findMany({
            where: {
                OR: [{ profileAId: profile.id }, { profileBId: profile.id }],
                status: "ACCEPTED",
            },
            include: {
                profileA: { select: { id: true, displayName: true, avatarUrl: true, availableStatus: true, availableUntil: true } },
                profileB: { select: { id: true, displayName: true, avatarUrl: true, availableStatus: true, availableUntil: true } },
            },
            orderBy: { sharedHangoutCount: "asc" },
        }),
    ]);

    const votedHangoutIds = new Set(userVotes.map((v) => v.hangoutId));

    // Deduplicate (same hangout can appear via multiple participant records)
    const seen = new Set<string>();
    const hangouts = participations
        .filter((p) => {
            if (seen.has(p.hangout.id)) return false;
            seen.add(p.hangout.id);
            return true;
        })
        .map((p) => ({
            ...p.hangout,
            myRole: p.role,
            myRsvp: p.rsvpStatus,
            hasVoted: votedHangoutIds.has(p.hangout.id),
            isCreator: p.hangout.creatorId === profile.id,
            hasFeedback: p.hangout.feedbacks.length > 0,
            isParticipant: p.rsvpStatus !== "NOT_GOING",
            activity:
                p.hangout.finalActivity ??
                (p.hangout.activityOptions[0]?.cachedEvent
                    ? { name: p.hangout.activityOptions[0].cachedEvent.name, image: p.hangout.activityOptions[0].cachedEvent.imageUrl }
                    : null),
        }))
        .filter((h) => h.status !== "CANCELLED")
        .sort((a, b) => {
            const aFuture = a.scheduledFor ? isFuture(new Date(a.scheduledFor)) : false;
            const bFuture = b.scheduledFor ? isFuture(new Date(b.scheduledFor)) : false;
            if (aFuture && !bFuture) return -1;
            if (!aFuture && bFuture) return 1;
            const aDate = a.scheduledFor ? new Date(a.scheduledFor).getTime() : new Date(a.updatedAt).getTime();
            const bDate = b.scheduledFor ? new Date(b.scheduledFor).getTime() : new Date(b.updatedAt).getTime();
            return aDate - bDate;
        });

    // ── Build circle feed data ───────────────────────────────────────────────
    const friends = friendships.map((f) => {
        const other = f.profileAId === profile.id ? f.profileB : f.profileA;
        const isActive = other.availableStatus && other.availableUntil && new Date(other.availableUntil) > now;
        return {
            id: other.id,
            displayName: other.displayName,
            avatarUrl: other.avatarUrl,
            availableStatus: isActive ? other.availableStatus : null,
        };
    });

    // Drift: friends not in any upcoming plan with this user
    const activeHangoutIds = hangouts
        .filter((h) => h.status !== "COMPLETED" && h.status !== "CANCELLED")
        .map((h) => h.id);

    let inPlansSet = new Set<string>();
    if (activeHangoutIds.length > 0) {
        const coParticipants = await prisma.hangoutParticipant.findMany({
            where: {
                hangoutId: { in: activeHangoutIds },
                profileId: { in: friends.map((f) => f.id) },
            },
            select: { profileId: true },
            distinct: ["profileId"],
        });
        inPlansSet = new Set(coParticipants.map((p) => p.profileId!));
    }

    const driftFriends = friends
        .filter((f) => !inPlansSet.has(f.id))
        .slice(0, 3)
        .map((f) => ({ id: f.id, displayName: f.displayName, avatarUrl: f.avatarUrl }));

    const myStatus = profile.availableStatus && profile.availableUntil && new Date(profile.availableUntil) > now
        ? profile.availableStatus
        : null;

    return (
        <HomeFeed
            hangouts={hangouts}
            displayName={profile.displayName}
            socialFeed={{ friends, driftFriends, myStatus }}
        />
    );
}
