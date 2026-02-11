import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const { token } = await params;
        const formData = await req.formData();
        const status = formData.get("status") as string;

        if (!["GOING", "MAYBE", "NOT_GOING"].includes(status)) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }

        const rsvpStatus = status as any;

        // Find hangout by invite token
        const hangout = await prisma.hangout.findFirst({
            where: { inviteToken: token }
        });

        if (!hangout) {
            return NextResponse.json({ error: "Invalid invite" }, { status: 404 });
        }

        const { userId } = await auth();
        let participantId: string | null = null;

        if (userId) {
            // Signed-in user
            const profile = await prisma.profile.findUnique({
                where: { clerkId: userId }
            });

            if (!profile) {
                return NextResponse.json({ error: "Profile not found" }, { status: 404 });
            }

            // Check if already a participant
            const existing = await prisma.hangoutParticipant.findFirst({
                where: { hangoutId: hangout.id, profileId: profile.id }
            });

            if (existing) {
                // Update existing
                await prisma.hangoutParticipant.update({
                    where: { id: existing.id },
                    data: { rsvpStatus: rsvpStatus, respondedAt: new Date() }
                });
            } else {
                // Add as new participant
                await prisma.hangoutParticipant.create({
                    data: {
                        hangoutId: hangout.id,
                        profileId: profile.id,
                        role: "MEMBER",
                        rsvpStatus: rsvpStatus,
                        respondedAt: new Date()
                    }
                });
            }

            participantId = profile.id;
        } else {
            // Guest user - create guest profile
            const guest = await prisma.guestProfile.create({
                data: {
                    displayName: "Guest",
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
                }
            });

            await prisma.hangoutParticipant.create({
                data: {
                    hangoutId: hangout.id,
                    guestId: guest.id,
                    role: "MEMBER",
                    rsvpStatus: rsvpStatus,
                    respondedAt: new Date()
                }
            });

            participantId = guest.id;
        }

        // Redirect to hangout page
        return NextResponse.redirect(new URL(`/hangouts/${hangout.slug}`, req.url));

    } catch (error) {
        console.error("Error processing RSVP:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
