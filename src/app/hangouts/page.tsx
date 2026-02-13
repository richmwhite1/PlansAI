import { prisma } from "@/lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isPast, isFuture } from "date-fns";
import Link from "next/link";
import { Plus } from "lucide-react";
import { HangoutTabs } from "@/components/hangout/hangout-tabs";
import { getOrCreateProfile } from "@/lib/profile-utils";

export default async function HangoutsPage() {
    const { userId } = await auth();

    if (!userId) {
        redirect("/sign-in");
    }

    // Get or Create user profile
    const profile = await getOrCreateProfile(userId);

    if (!profile) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <p className="text-muted-foreground">Failed to load profile. Please try again.</p>
            </div>
        );
    }

    // Get all hangouts where user is a participant
    const participations = await prisma.hangoutParticipant.findMany({
        where: { profileId: profile.id },
        include: {
            hangout: {
                include: {
                    creator: true,
                    participants: {
                        include: { profile: true },
                        take: 5
                    },
                    finalActivity: true
                }
            }
        }
    });

    const hangouts = participations.map((p: any) => ({
        ...p.hangout,
        myRole: p.role,
        myRsvp: p.rsvpStatus
    }));

    // Categorize hangouts with robust date handling
    const now = new Date();

    // 1. Pending/Needs Attention: Planning/Voting that isn't cancelled and isn't past
    const pending = hangouts.filter((h: any) =>
        (h.status === "PLANNING" || h.status === "VOTING") &&
        (!h.scheduledFor || isFuture(new Date(h.scheduledFor)))
    );

    // 2. Upcoming: ALL future non-cancelled/non-completed plans (including PLANNING/VOTING)
    const upcoming = hangouts.filter((h: any) =>
        h.status !== "CANCELLED" && h.status !== "COMPLETED" &&
        (!h.scheduledFor || isFuture(new Date(h.scheduledFor)))
    );

    // 3. Past: Completed, Cancelled, or any that has passed
    const past = hangouts.filter((h: any) =>
        h.status === "COMPLETED" ||
        h.status === "CANCELLED" ||
        (h.scheduledFor && isPast(new Date(h.scheduledFor)))
    ).sort((a: any, b: any) => {
        const dateA = a.scheduledFor ? new Date(a.scheduledFor).getTime() : 0;
        const dateB = b.scheduledFor ? new Date(b.scheduledFor).getTime() : 0;
        return dateB - dateA;
    });

    // Final sorting for upcoming (soonest first, no-date at end)
    upcoming.sort((a: any, b: any) => {
        const dateA = a.scheduledFor ? new Date(a.scheduledFor).getTime() : Number.MAX_SAFE_INTEGER;
        const dateB = b.scheduledFor ? new Date(b.scheduledFor).getTime() : Number.MAX_SAFE_INTEGER;
        return dateA - dateB;
    });

    return (
        <div className="min-h-screen bg-background text-foreground font-sans">
            <main className="container mx-auto max-w-2xl px-6 py-8">
                <HangoutTabs
                    pending={pending}
                    upcoming={upcoming}
                    past={past}
                />
            </main>
        </div>
    );
}
