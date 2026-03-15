import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushToUser, sendPushToUsers } from "@/lib/push/send-push";

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

        // --- Auto-close expired voting ---
        const expiredVoting = await prisma.hangout.findMany({
            where: {
                status: "VOTING",
                isVotingEnabled: true,
                votingEndsAt: { lt: now },
            },
            include: {
                activityOptions: { include: { votes: true, cachedEvent: true } },
                participants: true,
            },
        });

        let votingClosed = 0;

        for (const hangout of expiredVoting) {
            if (hangout.activityOptions.length === 0) continue;

            const sorted = hangout.activityOptions
                .map(opt => ({ ...opt, score: opt.votes.reduce((acc, v) => acc + v.value, 0) }))
                .sort((a, b) => b.score - a.score);

            const winner = sorted[0];

            await prisma.hangout.update({
                where: { id: hangout.id },
                data: {
                    status: "CONFIRMED",
                    finalActivityId: winner.cachedEventId,
                    isVotingEnabled: false,
                },
            });

            const participantProfileIds = hangout.participants
                .map(p => p.profileId)
                .filter((id): id is string => !!id);

            await prisma.notification.createMany({
                data: participantProfileIds.map(pid => ({
                    userId: pid,
                    type: "HANGOUT_UPDATE" as const,
                    content: `Voting closed! The plan is set: ${winner.cachedEvent.name}`,
                    link: `/hangouts/${hangout.slug}`,
                })),
            });

            await sendPushToUsers(participantProfileIds, {
                title: "Plan Confirmed! ✅",
                body: `Voting closed! The plan is set: ${winner.cachedEvent.name}`,
                url: `/hangouts/${hangout.slug}`,
            });

            votingClosed++;
        }

        // --- Payment timeout reminders (48h after "Mark as Sent" with no confirmation) ---
        const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

        const stalePendingPayments = await prisma.paymentTransfer.findMany({
            where: {
                status: "PENDING",
                updatedAt: { lt: fortyEightHoursAgo },
            },
            include: {
                sender: { select: { id: true, displayName: true } },
                hangout: { select: { slug: true, title: true } },
            },
        });

        let paymentRemindersSent = 0;

        for (const payment of stalePendingPayments) {
            // Remind the receiver (organizer) to confirm
            await prisma.notification.create({
                data: {
                    userId: payment.receiverId,
                    type: "PAYMENT_RECEIVED",
                    content: `${payment.sender.displayName} marked a $${payment.amount.toFixed(2)} payment as sent for "${payment.hangout.title}" — please confirm.`,
                    link: `/hangouts/${payment.hangout.slug}`,
                },
            }).catch(() => {});

            await sendPushToUser(payment.receiverId, {
                title: "Payment Awaiting Confirmation",
                body: `${payment.sender.displayName} sent $${payment.amount.toFixed(2)} — tap to confirm receipt.`,
                url: `/hangouts/${payment.hangout.slug}`,
            });

            paymentRemindersSent++;
        }

        return NextResponse.json({ success: true, remindersSent, votingClosed, paymentRemindersSent });
    } catch (error: any) {
        console.error("Failed to run reminders cron:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
