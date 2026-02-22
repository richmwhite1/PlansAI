import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ hangoutId: string }> }
) {
    try {
        const { hangoutId } = await params;
        const { userId } = await auth();
        const cookieStore = await cookies();
        const guestToken = cookieStore.get("plans-guest-token")?.value;

        if (!userId && !guestToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { status } = body; // "GOING" | "MAYBE" | "NOT_GOING"

        if (!["GOING", "MAYBE", "NOT_GOING"].includes(status)) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }

        let participant;

        if (userId) {
            const profile = await prisma.profile.findUnique({
                where: { clerkId: userId }
            });
            if (!profile) {
                return NextResponse.json({ error: "Profile not found" }, { status: 404 });
            }
            participant = await prisma.hangoutParticipant.findFirst({
                where: {
                    hangoutId,
                    profileId: profile.id
                }
            });
        } else if (guestToken) {
            const guestProfile = await prisma.guestProfile.findUnique({
                where: { token: guestToken }
            });
            if (!guestProfile) {
                return NextResponse.json({ error: "Guest not found" }, { status: 404 });
            }
            participant = await prisma.hangoutParticipant.findFirst({
                where: {
                    hangoutId,
                    guestId: guestProfile.id
                }
            });
        }

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
