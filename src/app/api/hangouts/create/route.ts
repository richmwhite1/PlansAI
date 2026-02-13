import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth, currentUser, createClerkClient } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const {
            friendIds,
            participantIds,
            activityId,
            activityIds,
            activities: activitiesInput, // New way to pass full activity objects
            when,
            status,
            scheduledFor,
            description,
            isVotingEnabled,
            allowGuestsToInvite, // Added
            visibility // Added: "PUBLIC" or "FRIENDS_ONLY"
        } = body;

        const effectiveVisibility = visibility === "PUBLIC" ? "PUBLIC" : "FRIENDS_ONLY";

        const effectiveFriendIds = participantIds || friendIds || [];
        const effectiveWhen = when || scheduledFor;


        // Use activitiesInput if provided, otherwise fallback to activityIds
        let activityObjects = activitiesInput || [];
        if (activityObjects.length === 0 && (activityIds || activityId)) {
            const ids = activityIds || [activityId];
            activityObjects = ids.map((id: string) => ({ id }));
        }

        const effectiveVotingEnabled = isVotingEnabled || activityObjects.length > 1;

        // 1. Get or Create Profile for Creator
        const user = await currentUser();
        const email = user?.emailAddresses[0]?.emailAddress;

        let creator = await prisma.profile.upsert({
            where: { clerkId: userId },
            update: {
                email: email,
                displayName: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : email,
                avatarUrl: user?.imageUrl
            },
            create: {
                clerkId: userId,
                email: email,
                displayName: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : email,
                avatarUrl: user?.imageUrl,
                homeLatitude: 0,
                homeLongitude: 0
            }
        });

        // 1a. Resolve Participant Profiles (Clerk IDs to DB Profiles)
        const participantProfileIds: string[] = [];
        const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

        for (const f of (effectiveFriendIds as (string | any)[])) {
            const fid = typeof f === 'string' ? f : f.id;

            // Skip guests
            if (fid.startsWith("guest-")) continue;

            // Try to find by Profile ID first
            let p = await prisma.profile.findUnique({ where: { id: fid } });

            // If not found, it might be a Clerk ID
            if (!p) {
                p = await prisma.profile.findUnique({ where: { clerkId: fid } });
            }

            // If still not found, fetch from Clerk and create
            if (!p && fid.startsWith("user_")) {
                try {
                    const clerkUser = await clerkClient.users.getUser(fid);
                    const cEmail = clerkUser.emailAddresses[0]?.emailAddress;
                    p = await prisma.profile.create({
                        data: {
                            clerkId: fid,
                            email: cEmail,
                            displayName: clerkUser.firstName ? `${clerkUser.firstName} ${clerkUser.lastName || ''}`.trim() : cEmail,
                            avatarUrl: clerkUser.imageUrl,
                            homeLatitude: 0,
                            homeLongitude: 0
                        }
                    });
                } catch (err) {
                    console.error(`Failed to resolve Clerk user ${fid}:`, err);
                }
            }

            if (p) participantProfileIds.push(p.id);
        }

        // 2. Process Activities (Handle Custom)
        const finalCachedActivityIds: string[] = [];
        const activityNames: string[] = [];

        for (const act of activityObjects) {
            if (act.isCustom || act.id?.startsWith("custom-")) {
                const newEvent = await prisma.cachedEvent.create({
                    data: {
                        name: act.title || act.name || "Custom Idea",
                        category: "CUSTOM",
                        source: "USER_SUBMITTED",
                        websiteUrl: act.websiteUrl || null,
                        locationUrl: act.locationUrl || null,
                        latitude: creator.homeLatitude || 0,
                        longitude: creator.homeLongitude || 0,
                        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
                        staleAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
                    } as any
                });
                finalCachedActivityIds.push(newEvent.id);
                activityNames.push(newEvent.name);
            } else {
                finalCachedActivityIds.push(act.id);
                const cached = await prisma.cachedEvent.findUnique({
                    where: { id: act.id },
                    select: { name: true }
                });
                if (cached) activityNames.push(cached.name);
            }
        }

        // 3. Generate Smart Title
        let title = "New Hangout";
        if (activityNames.length === 1) {
            title = activityNames[0];
        } else if (activityNames.length > 1) {
            title = `${activityNames[0]} or ${activityNames[1]}`;
            if (activityNames.length > 2) title += "...";
        }

        if (participantProfileIds.length > 0) {
            const profiles = await prisma.profile.findMany({
                where: { id: { in: participantProfileIds } },
                select: { displayName: true }
            });

            const friendNames = profiles
                .map(p => p.displayName?.split(" ")[0])
                .filter(Boolean);

            if (friendNames.length === 1) {
                title = `${title} with ${friendNames[0]}`;
            } else if (friendNames.length === 2) {
                title = `${title} with ${friendNames[0]} & ${friendNames[1]}`;
            } else if (friendNames.length > 2) {
                title = `${title} with ${friendNames[0]} & ${friendNames.length - 1} others`;
            }
        }

        // 3a. Handle Guests
        const guests = body.guests || [];
        const guestParticipantCreates: any[] = [];

        for (const guest of guests) {
            const guestProfile = await prisma.guestProfile.create({
                data: {
                    displayName: guest.name,
                    phone: guest.phone || null,
                    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
                }
            });
            guestParticipantCreates.push({
                guestId: guestProfile.id,
                role: "GUEST",
                rsvpStatus: "PENDING"
            });
        }

        // 4. Create Hangout
        const hangout = await prisma.hangout.create({
            data: {
                title,
                description,
                creatorId: creator.id,
                status: status || (effectiveVotingEnabled ? "VOTING" : "PLANNING"),
                isVotingEnabled: effectiveVotingEnabled,
                allowGuestsToInvite: allowGuestsToInvite || false,
                visibility: effectiveVisibility, // Added
                consensusThreshold: 60,
                type: "CASUAL",
                scheduledFor: effectiveWhen ? new Date(effectiveWhen) : undefined,
                votingEndsAt: effectiveVotingEnabled ? (
                    effectiveWhen
                        ? new Date(new Date(effectiveWhen).getTime() - 1000 * 60 * 60 * 2) // 2 hours before event
                        : new Date(Date.now() + 1000 * 60 * 60 * 24) // 24 hours from now
                ) : undefined,
                finalActivityId: !effectiveVotingEnabled && finalCachedActivityIds.length === 1 ? finalCachedActivityIds[0] : null,
                participants: {
                    create: [
                        {
                            profileId: creator.id,
                            role: "CREATOR",
                            rsvpStatus: "GOING"
                        },
                        ...participantProfileIds.map(pid => ({
                            profileId: pid,
                            role: "MEMBER",
                            rsvpStatus: "PENDING"
                        })),
                        ...guestParticipantCreates
                    ]
                },
                activityOptions: {
                    create: finalCachedActivityIds.map((aid: string, index: number) => ({
                        cachedEventId: aid,
                        displayOrder: index
                    }))
                }
            }
        });

        // 4a. If Public, create DiscoverableHangout record
        if (effectiveVisibility === "PUBLIC") {
            try {
                // Get location from creator or use defaults
                const lat = creator.homeLatitude || 0;
                const lng = creator.homeLongitude || 0;
                const city = creator.homeCity || "Unknown";

                await prisma.discoverableHangout.create({
                    data: {
                        hangoutId: hangout.id,
                        isPublic: true,
                        latitude: lat,
                        longitude: lng,
                        city: city,
                        happeningAt: hangout.scheduledFor || new Date(Date.now() + 1000 * 60 * 60 * 24), // Fallback to 24h if no date
                        expiresAt: hangout.scheduledFor
                            ? new Date(new Date(hangout.scheduledFor).getTime() + 1000 * 60 * 60 * 6) // Expires 6h after start
                            : new Date(Date.now() + 1000 * 60 * 60 * 48) // Fallback to 48h
                    }
                });
            } catch (err) {
                console.error("Failed to create DiscoverableHangout record:", err);
            }
        }

        // 5. Send Notifications to all real users
        for (const pid of participantProfileIds) {
            await prisma.notification.create({
                data: {
                    userId: pid,
                    type: "HANGOUT_INVITE",
                    content: `${creator.displayName} invited you to: ${title}`,
                    link: `/hangouts/${hangout.slug}`
                }
            }).catch(err => console.error("Failed to send notification:", err));
        }

        // 6. Increment usage counts
        prisma.cachedEvent.updateMany({
            where: { id: { in: finalCachedActivityIds } },
            data: { timesSelected: { increment: 1 } }
        }).catch(err => console.error("Failed to increment usage counts:", err));

        return NextResponse.json({ hangoutId: hangout.id, slug: hangout.slug });

    } catch (error: any) {
        console.error("Error creating hangout:", error);
        // Log detailed prisma error
        if (error.code) {
            console.error("Prisma Code:", error.code);
            console.error("Prisma Meta:", error.meta);
            console.error("Prisma Message:", error.message);
        }
        return NextResponse.json({
            error: "Internal Server Error",
            details: error.message,
            step: "unknown" // We could track steps if we wanted
        }, { status: 500 });
    }
}
