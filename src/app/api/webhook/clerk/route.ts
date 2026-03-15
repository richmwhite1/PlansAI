import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

export async function POST(req: NextRequest) {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
    if (!WEBHOOK_SECRET) {
        console.error("CLERK_WEBHOOK_SECRET not set");
        return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
    }

    const headersList = await headers();
    const svixId = headersList.get("svix-id");
    const svixTimestamp = headersList.get("svix-timestamp");
    const svixSignature = headersList.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
        return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
    }

    const payload = await req.text();
    const wh = new Webhook(WEBHOOK_SECRET);

    let event: any;
    try {
        event = wh.verify(payload, {
            "svix-id": svixId,
            "svix-timestamp": svixTimestamp,
            "svix-signature": svixSignature,
        });
    } catch (err) {
        console.error("Webhook signature verification failed:", err);
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    if (event.type === "user.created") {
        const { id: clerkId, email_addresses, first_name, last_name, image_url } = event.data;
        const email = email_addresses?.[0]?.email_address;

        if (!email) {
            return NextResponse.json({ success: true, merged: false, reason: "no email" });
        }

        // Find any guest profile with this email
        const guestProfile = await prisma.guestProfile.findFirst({
            where: { email },
            include: {
                participants: true,
                votes: true,
                timeVotes: true,
            },
        });

        // Ensure the new Profile exists (create if not yet created by another flow)
        const displayName = first_name
            ? `${first_name} ${last_name || ""}`.trim()
            : email;

        const profile = await prisma.profile.upsert({
            where: { clerkId },
            update: {},
            create: {
                clerkId,
                email,
                displayName,
                avatarUrl: image_url || null,
                homeLatitude: 0,
                homeLongitude: 0,
            },
        });

        if (!guestProfile) {
            return NextResponse.json({ success: true, merged: false, reason: "no guest profile found" });
        }

        // Merge all guest data into the new profile in a transaction
        await prisma.$transaction(async (tx) => {
            // Reassign hangout participations
            for (const participant of guestProfile.participants) {
                // Check if this user already has a participant record for this hangout
                const existing = await tx.hangoutParticipant.findFirst({
                    where: { hangoutId: participant.hangoutId, profileId: profile.id },
                });
                if (!existing) {
                    await tx.hangoutParticipant.update({
                        where: { id: participant.id },
                        data: { profileId: profile.id, guestId: null },
                    });
                } else {
                    // Merge RSVP status — prefer the guest's response if it's more specific
                    if (participant.rsvpStatus !== "PENDING") {
                        await tx.hangoutParticipant.update({
                            where: { id: existing.id },
                            data: { rsvpStatus: participant.rsvpStatus, respondedAt: participant.respondedAt },
                        });
                    }
                    await tx.hangoutParticipant.delete({ where: { id: participant.id } });
                }
            }

            // Reassign activity votes
            for (const vote of guestProfile.votes) {
                const existingVote = await tx.vote.findFirst({
                    where: {
                        hangoutId: vote.hangoutId,
                        profileId: profile.id,
                        activityOptionId: vote.activityOptionId,
                    },
                });
                if (!existingVote) {
                    await tx.vote.update({
                        where: { id: vote.id },
                        data: { profileId: profile.id, guestId: null },
                    });
                } else {
                    await tx.vote.delete({ where: { id: vote.id } });
                }
            }

            // Reassign time votes
            for (const timeVote of guestProfile.timeVotes) {
                const existingTimeVote = await tx.timeVote.findFirst({
                    where: {
                        timeOptionId: timeVote.timeOptionId,
                        profileId: profile.id,
                    },
                });
                if (!existingTimeVote) {
                    await tx.timeVote.update({
                        where: { id: timeVote.id },
                        data: { profileId: profile.id, guestId: null },
                    });
                } else {
                    await tx.timeVote.delete({ where: { id: timeVote.id } });
                }
            }

            // Mark guest profile as converted
            await tx.guestProfile.update({
                where: { id: guestProfile.id },
                data: { convertedToProfileId: profile.id },
            });
        });

        console.log(`[Clerk Webhook] Merged guest profile ${guestProfile.id} into profile ${profile.id}`);
        return NextResponse.json({ success: true, merged: true, profileId: profile.id });
    }

    return NextResponse.json({ success: true, event: event.type });
}
