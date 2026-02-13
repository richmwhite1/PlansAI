import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile } from "@/lib/profile-utils";

// GET — return total unread DM count for header badge
export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ unreadCount: 0 });

        const profile = await getOrCreateProfile(userId);
        if (!profile) return NextResponse.json({ unreadCount: 0 });

        // Count unread messages where the user is a recipient (not the sender)
        const unreadCount = await prisma.directMessage.count({
            where: {
                senderId: { not: profile.id },
                isRead: false,
                conversation: {
                    OR: [
                        { participantAId: profile.id },
                        { participantBId: profile.id },
                    ],
                },
            },
        });

        return NextResponse.json({ unreadCount });
    } catch (err) {
        console.error("Failed to fetch unread count:", err);
        return NextResponse.json({ unreadCount: 0 });
    }
}
