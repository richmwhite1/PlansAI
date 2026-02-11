import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

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
        const { status } = body; // "GOING" | "MAYBE" | "NOT_GOING"

        if (!["GOING", "MAYBE", "NOT_GOING"].includes(status)) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
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
            where: {
                hangoutId,
                profileId: profile.id
            }
        });

        if (!participant) {
            return NextResponse.json({ error: "Not a participant" }, { status: 403 });
        }

        // Update RSVP status
        const updated = await prisma.hangoutParticipant.update({
            where: { id: participant.id },
            data: {
                rsvpStatus: status,
                respondedAt: new Date()
            }
        });

        return NextResponse.json({
            success: true,
            rsvpStatus: updated.rsvpStatus
        });

    } catch (error) {
        console.error("Error updating RSVP:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
