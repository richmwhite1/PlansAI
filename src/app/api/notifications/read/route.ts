import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { notificationId, markAll } = body;

        const profile = await prisma.profile.findUnique({
            where: { clerkId: userId }
        });

        if (!profile) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        if (markAll) {
            await prisma.notification.updateMany({
                where: {
                    userId: profile.id,
                    isRead: false
                },
                data: { isRead: true }
            });
        } else if (notificationId) {
            await prisma.notification.update({
                where: {
                    id: notificationId,
                    userId: profile.id // Security check
                },
                data: { isRead: true }
            });
        } else {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Error updating notification:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
