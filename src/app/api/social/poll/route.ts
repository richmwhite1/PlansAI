import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { sendPushToUsers } from "@/lib/push/send-push";

const STATUS_LABELS: Record<string, string> = {
    TONIGHT: "tonight",
    TOMORROW: "tomorrow",
    FRIDAY: "this Friday",
    SATURDAY: "this Saturday",
    SUNDAY: "this Sunday",
    WEEKEND: "this weekend",
};

export async function POST(req: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.profile.findUnique({
        where: { clerkId: userId },
        select: { id: true, displayName: true },
    });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const { friendIds, status } = await req.json();
    if (!Array.isArray(friendIds) || friendIds.length === 0 || !status) {
        return NextResponse.json({ error: "friendIds and status are required" }, { status: 400 });
    }

    const timeLabel = STATUS_LABELS[status] ?? status.toLowerCase();
    const senderName = profile.displayName?.split(" ")[0] ?? "Someone";

    // Create a notification for each friend
    await prisma.notification.createMany({
        data: friendIds.map((fid: string) => ({
            userId: fid,
            type: "SYSTEM" as const,
            content: `${senderName} wants to know — are you free ${timeLabel}?`,
            link: `/?poll=${status}`,
        })),
        skipDuplicates: true,
    });

    // Push notifications
    await sendPushToUsers(friendIds, {
        title: `${senderName} is asking 👋`,
        body: `Are you free ${timeLabel}? Tap to respond.`,
        url: `/?poll=${status}`,
    });

    return NextResponse.json({ sent: friendIds.length });
}
