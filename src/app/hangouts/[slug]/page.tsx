import { notFound } from "next/navigation";
import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { HangoutPageClient } from "./hangout-page-client";
import { resolveHangoutVote } from "@/lib/hangout-utils";

interface HangoutPageProps {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata(props: HangoutPageProps): Promise<Metadata> {
    const params = await props.params;
    const { slug } = params;

    const hangout = await prisma.hangout.findUnique({
        where: { slug },
        include: { finalActivity: true, creator: true }
    });

    if (!hangout) {
        return {
            title: "Hangout Not Found",
        };
    }

    const title = hangout.title;
    const description = hangout.description || `Join ${hangout.creator.displayName}'s plan on Plans.`;
    const imageUrl = hangout.finalActivity?.imageUrl || "https://plans.ai/og-default.jpg"; // Replace with actual default

    return {
        title: title,
        description: description,
        openGraph: {
            title: title,
            description: description,
            images: [
                {
                    url: imageUrl,
                    width: 1200,
                    height: 630,
                    alt: title,
                },
            ],
        },
        twitter: {
            card: "summary_large_image",
            title: title,
            description: description,
            images: [imageUrl],
        },
    };
}

export default async function HangoutPage(props: HangoutPageProps) {
    const params = await props.params;
    const searchParams = await props.searchParams;
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

    // Lazy Voting Expiration Check
    if (hangout.status === "VOTING" && hangout.votingEndsAt && new Date(hangout.votingEndsAt) < new Date()) {
        try {
            const result = await resolveHangoutVote(hangout.id);
            if (result.success && result.hangout) {
                // Determine if we need to reload the page data? 
                // We have the updated hangout in result.hangout.
                // But relations might be missing or different.
                // Simplest is to just update the local 'hangout' variable with the main fields,
                // but for relations (participants etc) we might need them.
                // Ideally, we force a re-fetch or just use the updated status.
                // Let's rely on the result to update key fields.
                (hangout as any).status = "CONFIRMED";
                (hangout as any).finalActivityId = (result.hangout as any).finalActivityId;
                (hangout as any).isVotingEnabled = false;
                (hangout as any).finalActivity = (result.hangout as any).finalActivity;
            }
        } catch (e) {
            console.error("Failed to auto-resolve vote:", e);
        }
    }

    // Get current user's participation info
    const { userId } = await auth();
    let currentUserParticipant = null;
    let profile: any = null;
    let guestTokenToSet: string | null = null;

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
        // Check for guest cookie OR URL param
        const cookieStore = await cookies();
        let guestToken = cookieStore.get("plans-guest-token")?.value;
        const urlGuestToken = Array.isArray(searchParams.guestToken) ? searchParams.guestToken[0] : searchParams.guestToken;

        if (urlGuestToken) {
            guestToken = urlGuestToken;
            guestTokenToSet = urlGuestToken;
        }

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

    // Check for Claim Flow
    const isClaiming = (searchParams.claim === 'true');
    let guestsToClaim: any[] = [];

    if (isClaiming && !currentUserParticipant) {
        // Get all guests for this hangout
        const guests = hangout.participants
            .filter((p: any) => p.guest !== null)
            .map((p: any) => ({
                id: p.guest.id,
                displayName: p.guest.displayName,
                rsvpStatus: p.rsvpStatus
            }));
        guestsToClaim = guests;
    }

    return (
        <HangoutPageClient
            hangout={hangout}
            userId={userId}
            profile={profile}
            currentUserParticipant={currentUserParticipant}
            guestTokenToSet={guestTokenToSet}
            guestsToClaim={guestsToClaim}
        />
    );
}
