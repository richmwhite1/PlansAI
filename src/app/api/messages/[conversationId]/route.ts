import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile } from "@/lib/profile-utils";

type RouteContext = { params: Promise<{ conversationId: string }> };

// GET — paginated messages for a conversation + mark as read
export async function GET(request: Request, context: RouteContext) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const profile = await getOrCreateProfile(userId);
        if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

        const { conversationId } = await context.params;

        // Verify user is a participant
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            include: {
                participantA: { select: { id: true, displayName: true, avatarUrl: true } },
                participantB: { select: { id: true, displayName: true, avatarUrl: true } },
            },
        });

        if (!conversation) {
            return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
        }

        if (conversation.participantAId !== profile.id && conversation.participantBId !== profile.id) {
            return NextResponse.json({ error: "Not a participant" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const cursor = searchParams.get("cursor");
        const limit = 50;

        const messages = await prisma.directMessage.findMany({
            where: { conversationId },
            include: {
                sender: { select: { id: true, displayName: true, avatarUrl: true } },
            },
            orderBy: { createdAt: "desc" },
            take: limit,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });

        // Mark unread messages from the other person as read
        await prisma.directMessage.updateMany({
            where: {
                conversationId,
                senderId: { not: profile.id },
                isRead: false,
            },
            data: { isRead: true },
        });

        const otherPerson = conversation.participantAId === profile.id
            ? conversation.participantB
            : conversation.participantA;

        return NextResponse.json({
            messages: messages.reverse(), // Return chronological order
            otherPerson,
            isRequest: conversation.isRequest,
            hasMore: messages.length === limit,
            nextCursor: messages.length === limit ? messages[0].id : null,
        });
    } catch (err) {
        console.error("Failed to fetch messages:", err);
        return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
    }
}

// POST — send a message
export async function POST(request: Request, context: RouteContext) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const profile = await getOrCreateProfile(userId);
        if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

        const { conversationId } = await context.params;

        // Verify participation
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
        });

        if (!conversation) {
            return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
        }

        if (conversation.participantAId !== profile.id && conversation.participantBId !== profile.id) {
            return NextResponse.json({ error: "Not a participant" }, { status: 403 });
        }

        const body = await request.json();
        const { content } = body;

        if (!content?.trim()) {
            return NextResponse.json({ error: "Message content required" }, { status: 400 });
        }

        // Create message
        const message = await prisma.directMessage.create({
            data: {
                conversationId,
                senderId: profile.id,
                content: content.trim(),
            },
            include: {
                sender: { select: { id: true, displayName: true, avatarUrl: true } },
            },
        });

        // Update conversation lastMessageAt
        await prisma.conversation.update({
            where: { id: conversationId },
            data: { lastMessageAt: new Date() },
        });

        // Create notification for the recipient
        const recipientId = conversation.participantAId === profile.id
            ? conversation.participantBId
            : conversation.participantAId;

        await prisma.notification.create({
            data: {
                userId: recipientId,
                type: "NEW_MESSAGE",
                content: `${profile.displayName || "Someone"}: ${content.trim().substring(0, 80)}`,
                link: `/messages/${conversationId}`,
            },
        });

        return NextResponse.json({ message });
    } catch (err) {
        console.error("Failed to send message:", err);
        return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
    }
}
