
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ hangoutId: string }> } // Correct params type for Next.js 15
) {
    try {
        const { hangoutId } = await context.params;
        const { guestId, displayName } = await req.json();

        if (!guestId) {
            return NextResponse.json({ error: "Guest ID required" }, { status: 400 });
        }

        // Verify the guest is part of this hangout
        const participant = await prisma.hangoutParticipant.findFirst({
            where: {
                hangoutId,
                guestId: guestId
            },
            include: {
                guest: true
            }
        });

        if (!participant || !participant.guest) {
            return NextResponse.json({ error: "Guest not found in this hangout" }, { status: 404 });
        }

        // Update display name if provided
        if (displayName) {
            await prisma.guestProfile.update({
                where: { id: participant.guest.id },
                data: { displayName }
            });
        }

        // Return the token so the client can set the cookie
        return NextResponse.json({ token: participant.guest.token });

    } catch (error) {
        console.error("Claim error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
