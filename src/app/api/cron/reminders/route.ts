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

        // --- Weekend nudge (Thursday/Friday only) ---
        let weekendNudgesSent = 0;
        const dayOfWeek = now.getDay(); // 0=Sun ... 4=Thu, 5=Fri

        if (dayOfWeek === 4 || dayOfWeek === 5) {
            // Compute weekend window (Fri 00:00 → Sun 23:59)
            const daysUntilFri = dayOfWeek === 5 ? 0 : 1;
            const weekendStart = new Date(now);
            weekendStart.setDate(now.getDate() + daysUntilFri);
            weekendStart.setHours(0, 0, 0, 0);

            const weekendEnd = new Date(weekendStart);
            weekendEnd.setDate(weekendStart.getDate() + 2); // Fri→Sun
            weekendEnd.setHours(23, 59, 59, 999);

            // Find profiles with active weekend availability
            const availableProfiles = await prisma.profile.findMany({
                where: {
                    availableStatus: { in: ["WEEKEND", "FRIDAY", "SATURDAY", "SUNDAY"] },
                    availableUntil: { gte: now },
                },
                select: { id: true, displayName: true },
            });

            if (availableProfiles.length > 0) {
                const availableIds = availableProfiles.map((p) => p.id);

                // Find all accepted friendships involving available profiles
                const friendships = await prisma.friendship.findMany({
                    where: {
                        status: "ACCEPTED",
                        OR: [
                            { profileAId: { in: availableIds } },
                            { profileBId: { in: availableIds } },
                        ],
                    },
                    select: { profileAId: true, profileBId: true },
                });

                // Collect friends-of-available who are NOT themselves already available
                const idsToNudge = new Set<string>();
                for (const f of friendships) {
                    if (availableIds.includes(f.profileAId)) idsToNudge.add(f.profileBId);
                    if (availableIds.includes(f.profileBId)) idsToNudge.add(f.profileAId);
                }
                for (const id of availableIds) idsToNudge.delete(id);

                for (const userId of idsToNudge) {
                    // Skip if already has a weekend plan
                    const hasWeekendPlan = await prisma.hangoutParticipant.findFirst({
                        where: {
                            profileId: userId,
                            rsvpStatus: { in: ["GOING", "MAYBE"] },
                            hangout: {
                                status: { notIn: ["CANCELLED", "COMPLETED"] },
                                scheduledFor: { gte: weekendStart, lte: weekendEnd },
                            },
                        },
                    });
                    if (hasWeekendPlan) continue;

                    // Which of their friends are available?
                    const freeFriendIds = friendships
                        .filter(
                            (f) =>
                                (f.profileAId === userId && availableIds.includes(f.profileBId)) ||
                                (f.profileBId === userId && availableIds.includes(f.profileAId))
                        )
                        .map((f) => (f.profileAId === userId ? f.profileBId : f.profileAId));

                    const freeFriends = availableProfiles.filter((p) => freeFriendIds.includes(p.id));
                    if (freeFriends.length === 0) continue;

                    const names = freeFriends.slice(0, 2).map((f) => f.displayName?.split(" ")[0] ?? "Someone");
                    const nudgeBody =
                        freeFriends.length === 1
                            ? `${names[0]} is free this weekend — nothing on your plans yet`
                            : `${names[0]} & ${freeFriends.length - 1} other${freeFriends.length > 2 ? "s" : ""} are free this weekend`;

                    await prisma.notification
                        .create({
                            data: {
                                userId,
                                type: "SYSTEM" as const,
                                content: nudgeBody,
                                link: "/",
                            },
                        })
                        .catch(() => {});

                    await sendPushToUser(userId, {
                        title: "Weekend plans? 🌅",
                        body: nudgeBody,
                        url: "/",
                    });

                    weekendNudgesSent++;
                }
            }
        }

        return NextResponse.json({ success: true, remindersSent, votingClosed, paymentRemindersSent, weekendNudgesSent });
    } catch (error: any) {
        console.error("Failed to run reminders cron:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
