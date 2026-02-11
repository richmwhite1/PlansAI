import { prisma } from "@/lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isPast, isFuture } from "date-fns";
import Link from "next/link";
import { Plus } from "lucide-react";
import { HangoutTabs } from "@/components/hangout/hangout-tabs";

export default async function HangoutsPage() {
    const { userId } = await auth();

    if (!userId) {
        redirect("/sign-in");
    }

    // Get or Create user profile
    const user = await currentUser();
    const email = user?.emailAddresses[0]?.emailAddress;
    const profile = await prisma.profile.upsert({
        where: { clerkId: userId },
        update: {},
        create: {
            clerkId: userId,
            email: email,
            displayName: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : email,
            avatarUrl: user?.imageUrl
        }
    });

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

    // 2. Upcoming: Confirmed/Active that is in the future
    const upcoming = hangouts.filter((h: any) =>
        h.status !== "CANCELLED" && h.status !== "COMPLETED" &&
        h.scheduledFor && isFuture(new Date(h.scheduledFor)) &&
        !pending.some((p: any) => p.id === h.id)
    );

    // 3. Past: Completed, Cancelled, or any confirmed/active that has passed
    const past = hangouts.filter((h: any) =>
        h.status === "COMPLETED" ||
        h.status === "CANCELLED" ||
        (h.scheduledFor && isPast(new Date(h.scheduledFor)))
    ).sort((a: any, b: any) => {
        // Sort past by scheduled date descending (most recent first)
        const dateA = a.scheduledFor ? new Date(a.scheduledFor).getTime() : 0;
        const dateB = b.scheduledFor ? new Date(b.scheduledFor).getTime() : 0;
        return dateB - dateA;
    });

    // Final sorting for upcoming
    upcoming.sort((a: any, b: any) => {
        const dateA = a.scheduledFor ? new Date(a.scheduledFor).getTime() : Number.MAX_SAFE_INTEGER;
        const dateB = b.scheduledFor ? new Date(b.scheduledFor).getTime() : Number.MAX_SAFE_INTEGER;
        return dateA - dateB;
    });

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
                <div className="container mx-auto max-w-2xl px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="text-lg font-bold text-white tracking-tight">
                        My Plans
                    </Link>
                    <Link
                        href="/"
                        className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold rounded-full transition-all shadow-lg shadow-violet-500/20 active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        Create Plan
                    </Link>
                </div>
            </header>

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
