import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { resolveHangoutVote } from "@/lib/hangout-utils";

export async function POST(
    req: NextRequest,
    props: { params: Promise<{ hangoutId: string }> }
) {
    const params = await props.params;
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { hangoutId } = params;

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
            return NextResponse.json({ error: "Hangout not found" }, { status: 404 });
        }

        // 2. Authorization Check (Creator Only)
        if (hangout.creator.clerkId !== userId) {
            return NextResponse.json({ error: "Only the host can end voting early" }, { status: 403 });
        }

        // 3. Determine Winner
        // Score: +1 for Yes (or just count). We are using simple vote counting for now.
        // If we had 'value', we'd sum it. Assuming Value is 1 for Upvote.
        const sortedOptions = hangout.activityOptions.map(opt => {
            const score = opt.votes.reduce((acc, v) => acc + v.value, 0);
            return { ...opt, score };
        }).sort((a, b) => b.score - a.score);

        if (sortedOptions.length === 0) {
            return NextResponse.json({ error: "No options to vote on" }, { status: 400 });
        }

        const winner = sortedOptions[0];

        // 4. Update Hangout
        const updatedHangout = await prisma.hangout.update({
            where: { id: hangoutId },
            data: {
                status: "CONFIRMED",
                finalActivityId: winner.cachedEventId,
                votingEndsAt: new Date(), // End it now
                isVotingEnabled: false
            }
        });

        // 5. Notify Participants
        // Retrieve profile IDs to notify
        const participantProfileIds = hangout.participants
            .map(p => p.profileId)
            .filter((id): id is string => !!id && id !== hangout.creatorId); // Don't notify creator (action taker)

        // Add creator to list if they aren't the one triggering? No, creator is always trigger here.

        await prisma.notification.createMany({
            data: participantProfileIds.map(pid => ({
                userId: pid,
                type: "HANGOUT_UPDATE",
                content: `Voting closed! The plan is set for: ${winner.cachedEvent.name}. Tap to RSVP.`,
                link: `/hangouts/${hangout.slug}`
            }))
        });

        return NextResponse.json({
            success: true,
            winner: winner.cachedEvent.name,
            hangout: updatedHangout
        });

    } catch (error: any) {
        console.error("Error ending voting:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
