import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push/send-push";

export async function GET(request: Request) {
    // Basic auth using api secret key to prevent abuse
    const authHeader = request.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const now = new Date();
        const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

        // Find all hangouts in VOTING state that end within 2 hours
        const hangouts = await prisma.hangout.findMany({
            where: {
                status: "VOTING",
                votingEndsAt: {
                    lte: twoHoursFromNow,
                    gte: now,
                },
            },
            include: {
                participants: {
                    include: {
                        profile: true,
                    },
                },
                votes: true,
            },
        });

        let remindersSent = 0;

        for (const hangout of hangouts) {
            for (const participant of hangout.participants) {
                // Skip if not a registered user, or if they RSVP'd NO
                if (!participant.profileId || participant.rsvpStatus === "NOT_GOING") continue;

                // Check if they have voted on any activity option
                const userVote = hangout.votes.find(v => v.profileId === participant.profileId);
                
                if (!userVote) {
                    // Send reminder notification
                    await prisma.notification.create({
                        data: {
                            userId: participant.profileId,
                            type: "HANGOUT_REMINDER",
                            content: `⏰ Reminder: Voting closes soon for '${hangout.title}'. Make your choice!`,
                            link: `/hangouts/${hangout.slug}`,
                        },
                    });

                    await sendPushToUser(participant.profileId, {
                        title: "Voting Closes Soon ⏰",
                        body: `Make your choice for '${hangout.title}' before voting ends!`,
                        url: `/hangouts/${hangout.slug}`,
                    });

                    remindersSent++;
                }
            }
        }

        return NextResponse.json({ success: true, remindersSent });
    } catch (error: any) {
        console.error("Failed to run reminders cron:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
