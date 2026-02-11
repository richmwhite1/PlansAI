import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ hangoutId: string }> } // Correct type for dynamic params
) {
    try {
        const { hangoutId } = await context.params;
        const body = await req.json();
        const { displayName } = body;

        if (!displayName || displayName.trim().length < 2) {
            return NextResponse.json({ error: "Name is required (min 2 chars)" }, { status: 400 });
        }

        const hangout = await prisma.hangout.findUnique({
            where: { id: hangoutId }
        });

        if (!hangout) {
            return NextResponse.json({ error: "Hangout not found" }, { status: 404 });
        }

        // Create Guest Profile and Participant in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create Guest Profile
            const guest = await tx.guestProfile.create({
                data: {
                    displayName,
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                    convertedToProfileId: null
                }
            });

            // 2. Add as Participant
            const participant = await tx.hangoutParticipant.create({
                data: {
                    hangoutId,
                    guestId: guest.id,
                    role: "MEMBER",
                    rsvpStatus: "GOING" // Auto-RSVP as going when joining
                }
            });

            return { guest, participant };
        });

        // Set secure cookie
        const cookieStore = await cookies();
        cookieStore.set("plans-guest-token", result.guest.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 30 * 24 * 60 * 60 // 30 days
        });

        return NextResponse.json({
            success: true,
            guest: result.guest,
            participant: result.participant
        });

    } catch (error) {
        console.error("Error joining as guest:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
