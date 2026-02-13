import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function GET(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const profile = await prisma.profile.findUnique({
            where: { clerkId: userId }
        });

        if (!profile) {
            return NextResponse.json({
                notifications: [],
                unreadCount: 0
            });
        }

        const notifications = await prisma.notification.findMany({
            where: { userId: profile.id },
            orderBy: { createdAt: 'desc' },
            take: 20
        });

        // Count unread
        const unreadCount = await prisma.notification.count({
            where: {
                userId: profile.id,
                isRead: false
            }
        });

        return NextResponse.json({
            notifications,
            unreadCount
        });

    } catch (error) {
        console.error("Error fetching notifications:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
