import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { HangoutPageClient } from "./hangout-page-client";

interface HangoutPageProps {
    params: Promise<{ slug: string }>;
}

export default async function HangoutPage(props: HangoutPageProps) {
    const params = await props.params;
    const { slug } = params;

    const hangout = await prisma.hangout.findUnique({
        where: { slug },
        include: {
            creator: true,
            participants: {
                include: {
                    profile: true,
                    guest: true
                }
            },
            finalActivity: true,
            activityOptions: {
                include: {
                    cachedEvent: true,
                    votes: true
                },
                orderBy: {
                    displayOrder: 'asc'
                }
            },
            timeOptions: {
                include: {
                    votes: true
                }
            },
            feedbacks: {
                include: {
                    profile: true
                }
            },
            photos: {
                include: {
                    uploader: true
                },
                orderBy: {
                    createdAt: 'desc'
                }
            }
        }
    });

    if (!hangout) {
        notFound();
    }

    // Get current user's participation info
    const { userId } = await auth();
    let currentUserParticipant = null;
    let profile: any = null;

    if (userId) {
        profile = await prisma.profile.findUnique({
            where: { clerkId: userId }
        });

        if (profile) {
            currentUserParticipant = hangout.participants.find(
                (p: any) => p.profileId === profile.id
            );
        }
    } else {
        // Check for guest cookie
        const cookieStore = await cookies();
        const guestToken = cookieStore.get("plans-guest-token")?.value;

        if (guestToken) {
            const guestProfile = await prisma.guestProfile.findUnique({
                where: { token: guestToken }
            });

            if (guestProfile) {
                currentUserParticipant = hangout.participants.find(
                    (p: any) => p.guestId === guestProfile.id
                );
            }
        }
    }

    return (
        <HangoutPageClient
            hangout={hangout}
            userId={userId}
            profile={profile}
            currentUserParticipant={currentUserParticipant}
        />
    );
}
