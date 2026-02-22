import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ hangoutId: string }> } // Correct type for Next.js 15 App Router dynamic routes
) {
    try {
        const { userId } = await auth();
        const cookieStore = await cookies();
        const guestToken = cookieStore.get("plans-guest-token")?.value;

        if (!userId && !guestToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { hangoutId } = await context.params;
        const body = await req.json();
        const { activityOptionId, timeOptionId, vote } = body; // vote: 1 (YES), 0 (NO), 2 (MAYBE/INTERESTED)

        if (!activityOptionId && !timeOptionId) {
            return NextResponse.json({ error: "Missing option ID" }, { status: 400 });
        }

        let profileId = undefined;
        let guestId = undefined;

        if (userId) {
            const profile = await prisma.profile.findUnique({
                where: { clerkId: userId },
            });
            if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
            profileId = profile.id;
        } else if (guestToken) {
            const guestProfile = await prisma.guestProfile.findUnique({
                where: { token: guestToken }
            });
            if (!guestProfile) return NextResponse.json({ error: "Guest not found" }, { status: 404 });
            guestId = guestProfile.id;
        }

        if (activityOptionId) {
            const currentVoteValue = vote; // 1 for YES

            if (profileId) {
                await prisma.vote.upsert({
                    where: {
                        hangoutId_profileId_activityOptionId: {
                            hangoutId,
                            profileId: profileId,
                            activityOptionId
                        }
                    },
                    update: { value: currentVoteValue },
                    create: {
                        hangoutId,
                        profileId: profileId,
                        activityOptionId,
                        value: currentVoteValue
                    }
                });
            } else if (guestId) {
                await prisma.vote.upsert({
                    where: {
                        hangoutId_guestId_activityOptionId: {
                            hangoutId,
                            guestId: guestId,
                            activityOptionId
                        }
                    },
                    update: { value: currentVoteValue },
                    create: {
                        hangoutId,
                        guestId: guestId,
                        activityOptionId,
                        value: currentVoteValue
                    }
                });
            }

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

                    // Add system message (Using the user's profile ID if available, else fallback to the hangout creator)
                    await prisma.message.create({
                        data: {
                            hangoutId,
                            authorId: profileId || hangout.creatorId,
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
