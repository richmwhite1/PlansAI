import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { sendPushToUsers } from "@/lib/push/send-push";

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

        const body = await req.json().catch(() => ({}));
        const { message } = body as { message?: string };

        // Fetch all accepted friendships
        const friendships = await prisma.friendship.findMany({
            where: {
                OR: [{ profileAId: profile.id }, { profileBId: profile.id }],
                status: "ACCEPTED",
            },
            select: {
                profileAId: true,
                profileBId: true,
            },
        });

        const friendIds = friendships.map((f) =>
            f.profileAId === profile.id ? f.profileBId : f.profileAId
        );

        if (friendIds.length === 0) {
            return NextResponse.json({ pulseId: null, friendCount: 0 });
        }

        const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000);

        const pulse = await prisma.pulse.create({
            data: {
                creatorId: profile.id,
                targetTime: "TONIGHT",
                message: message || null,
                expiresAt,
                graduateThreshold: 2,
            },
        });

        const notificationContent = `${profile.displayName} is free tonight — who's in?`;

        // Create notifications
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

        // Send push notifications with urgency (send normally — web-push urgency header not directly exposed)
        try {
            await sendPushToUsers(friendIds, {
                title: "Tonight Mode!",
                body: notificationContent,
                url: `/pulse/${pulse.id}`,
            });
        } catch (err) {
            console.error("Push notification failed (non-fatal):", err);
        }

        return NextResponse.json({ pulseId: pulse.id, friendCount: friendIds.length });
    } catch (error: any) {
        console.error("Error sending tonight pulse:", error);
        return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
    }
}
