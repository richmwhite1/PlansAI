import { prisma } from "@/lib/prisma";

export async function resolveHangoutVote(hangoutId: string) {
    // 1. Fetch Hangout and Options
    const hangout = await prisma.hangout.findUnique({
        where: { id: hangoutId },
        include: {
            creator: true,
            activityOptions: {
                include: { votes: true, cachedEvent: true }
            },
            participants: true
        }
    });

    if (!hangout) {
        throw new Error("Hangout not found");
    }

    if (hangout.status !== "VOTING") {
        return { success: false, reason: "Not in voting status", hangout };
    }

    // 2. Determine Winner
    // Score based on vote count
    const sortedOptions = hangout.activityOptions.map(opt => {
        const score = opt.votes.reduce((acc, v) => acc + v.value, 0);
        return { ...opt, score };
    }).sort((a, b) => b.score - a.score); // Descending

    if (sortedOptions.length === 0) {
        // Fallback or error? If no options, can't resolve.
        return { success: false, reason: "No options found", hangout };
    }

    // Tie-breaking: currently simple sort (stable sort might favour earlier options if scores equal)
    // To be deterministic, we could sort by createdAt if scores are equal.
    // .sort((a, b) => b.score - a.score || a.createdAt.getTime() - b.createdAt.getTime())

    // Sort by score (desc), then by order (asc) or date
    sortedOptions.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.displayOrder - b.displayOrder;
    });

    const winner = sortedOptions[0];

    // 3. Update Hangout
    const updatedHangout = await prisma.hangout.update({
        where: { id: hangoutId },
        data: {
            status: "CONFIRMED",
            finalActivityId: winner.cachedEventId,
            isVotingEnabled: false,
            // Don't necessarily change votingEndsAt if it was auto-expired, 
            // but for manual end we might want to cap it.
            // Let's cap it to now if it's in the future (manual end).
            votingEndsAt: hangout.votingEndsAt && new Date(hangout.votingEndsAt) > new Date() ? new Date() : undefined
        },
        include: {
            finalActivity: true
        }
    });

    // 4. Notify Participants
    const participantProfileIds = hangout.participants
        .map(p => p.profileId)
        .filter((id): id is string => !!id);

    // We notify everyone, including creator, that the vote is settled.
    if (participantProfileIds.length > 0) {
        await prisma.notification.createMany({
            data: participantProfileIds.map(pid => ({
                userId: pid,
                type: "HANGOUT_UPDATE",
                content: `Voting closed! The plan is set for: ${winner.cachedEvent.name}. Tap to RSVP.`,
                link: `/hangouts/${hangout.slug}`
            }))
        });
    }

    return { success: true, winner: winner, hangout: updatedHangout };
}
