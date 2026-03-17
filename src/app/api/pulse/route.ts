import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { sendPushToUsers } from "@/lib/push/send-push";

function computeExpiresAt(targetTime: string): Date {
    const now = new Date();

    if (targetTime === "TONIGHT") {
        return new Date(now.getTime() + 4 * 60 * 60 * 1000);
    }

    if (targetTime === "TOMORROW") {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(23, 0, 0, 0);
        return tomorrow;
    }

    if (targetTime === "THIS_WEEKEND") {
        // Next Sunday at 11pm
        const sunday = new Date(now);
        const day = sunday.getDay(); // 0 = Sun, 6 = Sat
        const daysUntilSunday = day === 0 ? 7 : 7 - day;
        sunday.setDate(sunday.getDate() + daysUntilSunday);
        sunday.setHours(23, 0, 0, 0);
        return sunday;
    }

    // Default: 48 hours from now
    return new Date(now.getTime() + 48 * 60 * 60 * 1000);
}

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const profile = await prisma.profile.findUnique({ where: { clerkId: userId } });
        if (!profile) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        const body = await req.json();
        const { friendIds, targetTime, message, graduateThreshold } = body as {
            friendIds: string[];
            targetTime: string;
            message?: string;
            graduateThreshold?: number;
        };

        if (!targetTime || typeof targetTime !== "string") {
            return NextResponse.json({ error: "targetTime is required" }, { status: 400 });
        }

        if (!friendIds || !Array.isArray(friendIds) || friendIds.length === 0) {
            return NextResponse.json({ error: "friendIds must be a non-empty array" }, { status: 400 });
        }

        const expiresAt = computeExpiresAt(targetTime);

        const pulse = await prisma.pulse.create({
            data: {
                creatorId: profile.id,
                targetTime,
                message: message || null,
                expiresAt,
                graduateThreshold: graduateThreshold ?? 2,
            },
        });

        const timeLabel = targetTime.toLowerCase().replace(/_/g, " ");
        const notificationContent = `${profile.displayName} wants to know: who's free ${timeLabel}?`;

        // Create notifications for each friend
        await Promise.allSettled(
            friendIds.map((friendId) =>
                prisma.notification.create({
                    data: {
                        userId: friendId,
                        type: "PULSE_RESPONSE",
                        content: notificationContent,
                        link: `/pulse/${pulse.id}`,
                    },
                })
            )
        );

        // Send push notifications — non-fatal if push isn't configured
        try {
            await sendPushToUsers(friendIds, {
                title: "Who's free?",
                body: notificationContent,
                url: `/pulse/${pulse.id}`,
            });
        } catch (err) {
            console.error("Push notification failed (non-fatal):", err);
        }

        return NextResponse.json({ pulseId: pulse.id, expiresAt: pulse.expiresAt });
    } catch (error: any) {
        console.error("Error creating pulse:", error);
        return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const profile = await prisma.profile.findUnique({ where: { clerkId: userId } });
        if (!profile) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        const now = new Date();

        const pulses = await prisma.pulse.findMany({
            where: {
                OR: [
                    { creatorId: profile.id },
                    { responses: { some: { profileId: profile.id } } },
                ],
                status: "OPEN",
                expiresAt: { gt: now },
            },
            include: {
                creator: { select: { id: true, displayName: true, avatarUrl: true } },
                responses: true,
            },
            orderBy: { createdAt: "desc" },
            take: 20,
        });

        // Aggregate response counts per pulse
        const pulsesWithCounts = pulses.map((pulse) => {
            const yesCnt = pulse.responses.filter((r) => r.answer === "YES").length;
            const maybeCnt = pulse.responses.filter((r) => r.answer === "MAYBE").length;
            const noCnt = pulse.responses.filter((r) => r.answer === "NO").length;
            const myResponse = pulse.responses.find((r) => r.profileId === profile.id);
            return {
                id: pulse.id,
                creatorId: pulse.creatorId,
                creator: pulse.creator,
                targetTime: pulse.targetTime,
                message: pulse.message,
                status: pulse.status,
                expiresAt: pulse.expiresAt,
                graduateThreshold: pulse.graduateThreshold,
                graduatedToId: pulse.graduatedToId,
                createdAt: pulse.createdAt,
                isCreator: pulse.creatorId === profile.id,
                myAnswer: myResponse?.answer ?? null,
                counts: { YES: yesCnt, MAYBE: maybeCnt, NO: noCnt },
            };
        });

        return NextResponse.json({ pulses: pulsesWithCounts });
    } catch (error: any) {
        console.error("Error fetching pulses:", error);
        return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
    }
}
