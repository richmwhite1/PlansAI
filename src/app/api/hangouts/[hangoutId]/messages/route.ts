import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

// GET messages for a hangout
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ hangoutId: string }> }
) {
    try {
        const { hangoutId } = await params;
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const messages = await prisma.message.findMany({
            where: { hangoutId },
            include: {
                author: {
                    select: {
                        id: true,
                        displayName: true,
                        avatarUrl: true
                    }
                }
            },
            orderBy: { createdAt: 'asc' },
            take: 100
        });

        return NextResponse.json({
            messages: messages.map(m => ({
                id: m.id,
                content: m.content,
                createdAt: m.createdAt,
                author: {
                    id: m.author.id,
                    name: m.author.displayName,
                    avatar: m.author.avatarUrl
                }
            }))
        });

    } catch (error) {
        console.error("Error fetching messages:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// POST new message
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ hangoutId: string }> }
) {
    try {
        const { hangoutId } = await params;
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { content } = body;

        if (!content || content.trim().length === 0) {
            return NextResponse.json({ error: "Content required" }, { status: 400 });
        }

        // Get user profile
        const profile = await prisma.profile.findUnique({
            where: { clerkId: userId }
        });

        if (!profile) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        // Check if user is a participant
        const participant = await prisma.hangoutParticipant.findFirst({
            where: { hangoutId, profileId: profile.id }
        });

        if (!participant) {
            return NextResponse.json({ error: "Not a participant" }, { status: 403 });
        }

        // Create message
        const message = await prisma.message.create({
            data: {
                hangoutId,
                authorId: profile.id,
                content: content.trim()
            },
            include: {
                author: {
                    select: {
                        id: true,
                        displayName: true,
                        avatarUrl: true
                    }
                }
            }
        });

        return NextResponse.json({
            message: {
                id: message.id,
                content: message.content,
                createdAt: message.createdAt,
                author: {
                    id: message.author.id,
                    name: message.author.displayName,
                    avatar: message.author.avatarUrl
                }
            }
        });

    } catch (error) {
        console.error("Error sending message:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
