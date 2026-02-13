import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile } from "@/lib/profile-utils";

// GET — list user's conversations with last message preview + unread count
export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const profile = await getOrCreateProfile(userId);
        if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

        const conversations = await prisma.conversation.findMany({
            where: {
                OR: [
                    { participantAId: profile.id },
                    { participantBId: profile.id },
                ],
            },
            include: {
                participantA: { select: { id: true, displayName: true, avatarUrl: true } },
                participantB: { select: { id: true, displayName: true, avatarUrl: true } },
                messages: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                    include: {
                        sender: { select: { id: true, displayName: true } },
                    },
                },
            },
            orderBy: { lastMessageAt: "desc" },
        });

        // Add unread count for each conversation
        const enriched = await Promise.all(
            conversations.map(async (conv: any) => {
                const unreadCount = await prisma.directMessage.count({
                    where: {
                        conversationId: conv.id,
                        senderId: { not: profile.id },
                        isRead: false,
                    },
                });

                // Determine the "other" person
                const otherPerson = conv.participantAId === profile.id
                    ? conv.participantB
                    : conv.participantA;

                return {
                    id: conv.id,
                    otherPerson,
                    isRequest: conv.isRequest,
                    lastMessage: conv.messages[0] || null,
                    lastMessageAt: conv.lastMessageAt,
                    unreadCount,
                };
            })
        );

        // Split into friends and requests
        const friends = enriched.filter((c: any) => !c.isRequest);
        const requests = enriched.filter((c: any) => c.isRequest);

        return NextResponse.json({ conversations: friends, requests });
    } catch (err) {
        console.error("Failed to fetch conversations:", err);
        return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
    }
}

// POST — start or get existing conversation with a user
export async function POST(request: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const profile = await getOrCreateProfile(userId);
        if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

        const body = await request.json();
        const { recipientId } = body;

        if (!recipientId) {
            return NextResponse.json({ error: "Recipient ID required" }, { status: 400 });
        }

        if (recipientId === profile.id) {
            return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });
        }

        // Check if conversation already exists (in either direction)
        let conversation = await prisma.conversation.findFirst({
            where: {
                OR: [
                    { participantAId: profile.id, participantBId: recipientId },
                    { participantAId: recipientId, participantBId: profile.id },
                ],
            },
        });

        if (!conversation) {
            // Check friendship status
            const friendship = await prisma.friendship.findFirst({
                where: {
                    OR: [
                        { profileAId: profile.id, profileBId: recipientId, status: "ACCEPTED" },
                        { profileAId: recipientId, profileBId: profile.id, status: "ACCEPTED" },
                    ],
                },
            });

            const isRequest = !friendship;

            // Always store with lower ID as participantA for consistency
            const [pA, pB] = [profile.id, recipientId].sort();

            conversation = await prisma.conversation.create({
                data: {
                    participantAId: pA,
                    participantBId: pB,
                    isRequest,
                },
            });
        }

        return NextResponse.json({ conversation });
    } catch (err) {
        console.error("Failed to create conversation:", err);
        return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
    }
}
