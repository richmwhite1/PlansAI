import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { friendIds, participantIds, activityId, activityIds, when, status, scheduledFor, description, isVotingEnabled } = body;

        const effectiveFriendIds = participantIds || friendIds || [];
        const effectiveWhen = when || scheduledFor;
        const finalActivityIds = activityIds || (activityId ? [activityId] : []);
        const effectiveVotingEnabled = isVotingEnabled || finalActivityIds.length > 1;

        console.log("Creating hangout:", { effectiveFriendIds, finalActivityIds, effectiveWhen, status, description, effectiveVotingEnabled });

        // 1. Get or Create Profile for Creator
        const user = await currentUser();
        const email = user?.emailAddresses[0]?.emailAddress;

        let creator = await prisma.profile.upsert({
            where: { clerkId: userId },
            update: {},
            create: {
                clerkId: userId,
                email: email,
                displayName: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : email,
                avatarUrl: user?.imageUrl
            }
        });

        // 2. Generate Smart Title
        let title = "New Hangout";

        // Get activity names if provided
        if (finalActivityIds.length > 0) {
            const activities = await prisma.cachedEvent.findMany({
                where: { id: { in: finalActivityIds } },
                select: { name: true }
            });

            if (activities.length === 1) {
                title = activities[0].name;
            } else if (activities.length > 1) {
                title = `${activities[0].name} or ${activities[1].name}`;
                if (activities.length > 2) title += "...";
            }
        }

        // Get friend names to enhance title
        if (effectiveFriendIds && effectiveFriendIds.length > 0) {
            const friends = await prisma.profile.findMany({
                where: { id: { in: effectiveFriendIds } },
                select: { displayName: true }
            });

            const friendNames = friends
                .map((f: { displayName: string | null }) => f.displayName?.split(" ")[0])
                .filter(Boolean);

            if (friendNames.length === 1) {
                title = `${title} with ${friendNames[0]}`;
            } else if (friendNames.length === 2) {
                title = `${title} with ${friendNames[0]} & ${friendNames[1]}`;
            } else if (friendNames.length > 2) {
                title = `${title} with ${friendNames[0]} & ${friendNames.length - 1} others`;
            }
        }

        // 3. Create Hangout
        const hangout = await prisma.hangout.create({
            data: {
                title,
                description,
                creatorId: creator.id,
                status: status || (effectiveVotingEnabled ? "VOTING" : "PLANNING"),
                isVotingEnabled: effectiveVotingEnabled,
                consensusThreshold: 60, // Default 60%
                type: "CASUAL",
                scheduledFor: effectiveWhen ? new Date(effectiveWhen) : undefined,
                finalActivityId: !effectiveVotingEnabled && finalActivityIds.length === 1 ? finalActivityIds[0] : null,
                participants: {
                    create: [
                        {
                            profileId: creator.id,
                            role: "CREATOR",
                            rsvpStatus: "GOING"
                        },
                        ...effectiveFriendIds.map((fid: string) => ({
                            profileId: fid,
                            role: "MEMBER",
                            rsvpStatus: "PENDING"
                        }))
                    ]
                },
                activityOptions: {
                    create: finalActivityIds.map((aid: string, index: number) => ({
                        cachedEventId: aid,
                        displayOrder: index
                    }))
                }
            }
        });

        // 4. Increment usage count for selected activities (fire and forget)
        if (finalActivityIds.length > 0) {
            prisma.cachedEvent.updateMany({
                where: { id: { in: finalActivityIds } },
                data: {
                    timesSelected: { increment: 1 }
                }
            }).catch(err => console.error("Failed to increment usage counts:", err));
        }

        return NextResponse.json({ hangoutId: hangout.id, slug: hangout.slug });

    } catch (error) {
        console.error("Error creating hangout:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
