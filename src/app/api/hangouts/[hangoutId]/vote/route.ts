import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ hangoutId: string }> } // Correct type for Next.js 15 App Router dynamic routes
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { hangoutId } = await context.params;
        const body = await req.json();
        const { activityOptionId, timeOptionId, vote } = body; // vote: 1 (YES), 0 (NO), 2 (MAYBE/INTERESTED)

        if (!activityOptionId && !timeOptionId) {
            return NextResponse.json({ error: "Missing option ID" }, { status: 400 });
        }

        // 1. Get Profile
        const profile = await prisma.profile.findUnique({
            where: { clerkId: userId },
        });

        if (!profile) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        // 2. Upsert Vote
        // We need to handle the unique constraints. 
        // Since we might be voting on activity OR time, we need to construct the where clause dynamically or handle separate logic.
        // For MVP, let's assume Activity Voting primarily.

        if (activityOptionId) {
            const currentVoteValue = vote; // 1 for YES

            await prisma.vote.upsert({
                where: {
                    hangoutId_profileId_activityOptionId: {
                        hangoutId,
                        profileId: profile.id,
                        activityOptionId
                    }
                },
                update: { value: currentVoteValue },
                create: {
                    hangoutId,
                    profileId: profile.id,
                    activityOptionId,
                    value: currentVoteValue
                }
            });

            // 3. CONSENSUS LOGIC
            // Get hangout details for threshold and participants
            const hangout = await prisma.hangout.findUnique({
                where: { id: hangoutId },
                include: {
                    participants: true,
                    activityOptions: {
                        where: { id: activityOptionId },
                        include: { cachedEvent: true }
                    }
                }
            });

            if (hangout && hangout.isVotingEnabled && hangout.status === "VOTING") {
                const totalParticipants = hangout.participants.length;
                const yesVotes = await prisma.vote.count({
                    where: {
                        activityOptionId,
                        value: 1 // YES
                    }
                });

                // Check Mandatory Participants
                const mandatoryParticipants = hangout.participants.filter((p: any) => p.isMandatory);
                const mandatoryVotedYes = await Promise.all(mandatoryParticipants.map(async (p: any) => {
                    const v = await prisma.vote.findFirst({
                        where: {
                            activityOptionId,
                            profileId: p.profileId || undefined,
                            guestId: p.guestId || undefined,
                            value: 1
                        }
                    });
                    return !!v;
                }));

                const allMandatoryAgreed = mandatoryVotedYes.every(v => v === true);

                const consensusPercentage = (yesVotes / totalParticipants) * 100;
                console.log(`Consensus Check: ${yesVotes}/${totalParticipants} = ${consensusPercentage}% (Threshold: ${hangout.consensusThreshold}%). Mandatory Agreed: ${allMandatoryAgreed}`);

                if (consensusPercentage >= hangout.consensusThreshold && allMandatoryAgreed) {
                    console.log("Consensus reached! Confirming hangout...");
                    const option = hangout.activityOptions[0];
                    await prisma.hangout.update({
                        where: { id: hangoutId },
                        data: {
                            status: "CONFIRMED",
                            finalActivityId: option.cachedEventId
                        }
                    });

                    // Add system message
                    await prisma.message.create({
                        data: {
                            hangoutId,
                            authorId: profile.id,
                            content: `Consensus reached! The plan is confirmed: ${option.cachedEvent.name}.`,
                            type: "SYSTEM"
                        }
                    });
                }
            }
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Error submitting vote:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
