import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ hangoutId: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { hangoutId } = await context.params;
        const body = await req.json();
        const { name = "Guest" } = body;

        // 1. Get Hangout to verify ownership/access
        const hangout = await prisma.hangout.findUnique({
            where: { id: hangoutId },
            include: { creator: true }
        });

        if (!hangout) {
            return NextResponse.json({ error: "Hangout not found" }, { status: 404 });
        }

        // 2. Create Guest Profile and Participant in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // Create Guest Profile
            const guest = await tx.guestProfile.create({
                data: {
                    displayName: name,
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                }
            });

            // Add as Participant
            const participant = await tx.hangoutParticipant.create({
                data: {
                    hangoutId,
                    guestId: guest.id,
                    role: "GUEST",
                    rsvpStatus: "PENDING"
                }
            });

            return { guest, participant };
        });

        return NextResponse.json({
            success: true,
            guest: result.guest,
            participant: result.participant
        });

    } catch (error) {
        console.error("Error creating guest placeholder:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
