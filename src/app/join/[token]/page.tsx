import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { Calendar, MapPin, Users, Check, HelpCircle, X } from "lucide-react";
import Link from "next/link";
import { Metadata } from "next";

interface JoinPageProps {
    params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: JoinPageProps): Promise<Metadata> {
    const { token } = await params;
    const hangout = await prisma.hangout.findFirst({
        where: { inviteToken: token },
        select: { title: true, slug: true }
    });

    if (!hangout) return {};

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://plansai-production.up.railway.app";
    const ogImageUrl = `${appUrl}/hangouts/${hangout.slug}/opengraph-image`;

    return {
        title: `Join "${hangout.title}" on Plans`,
        description: `You've been invited to ${hangout.title}. Vote on the activity, RSVP, and save it to your calendar.`,
        openGraph: {
            title: `You're invited: ${hangout.title}`,
            description: "Vote on the activity, RSVP, and save it to your calendar — no account needed.",
            images: [{ url: ogImageUrl, width: 1200, height: 630, alt: hangout.title }],
            type: "website",
        },
        twitter: {
            card: "summary_large_image",
            title: `You're invited: ${hangout.title}`,
            description: "Vote on the activity, RSVP, and save it to your calendar.",
            images: [ogImageUrl],
        },
    };
}

export default async function JoinPage(props: JoinPageProps & { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const { token } = await props.params;
    const { userId } = await auth();

    const hangout = await prisma.hangout.findFirst({
        where: { inviteToken: token },
        include: {
            creator: true,
            finalActivity: true,
            participants: {
                include: { profile: { select: { id: true, displayName: true, avatarUrl: true } } },
                where: { rsvpStatus: "GOING" },
                take: 6,
            },
        },
    });

    if (!hangout) notFound();

    // Signed-in user already a participant → redirect
    if (userId) {
        const profile = await prisma.profile.findUnique({ where: { clerkId: userId } });
        if (profile) {
            const existing = hangout.participants.find((p: any) => p.profileId === profile.id);
            if (existing) redirect(`/hangouts/${hangout.slug}`);
        }
    }

    const totalGoing = await prisma.hangoutParticipant.count({
        where: { hangoutId: hangout.id, rsvpStatus: "GOING" },
    });

    const redirectPath = `/hangouts/${hangout.slug}`;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center p-5">
            <div className="w-full max-w-sm space-y-4">

                {/* Hero card */}
                <div className="relative rounded-3xl border border-white/10 bg-slate-900/80 overflow-hidden shadow-2xl">
                    {/* Gradient accent */}
                    <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-primary/15 to-transparent pointer-events-none" />

                    <div className="relative p-7 space-y-5">
                        {/* Creator */}
                        <div className="flex flex-col items-center gap-3 text-center">
                            <div className="w-16 h-16 rounded-full overflow-hidden ring-4 ring-primary/40 shadow-lg shadow-primary/20">
                                {hangout.creator.avatarUrl
                                    ? <img src={hangout.creator.avatarUrl} alt="" className="w-full h-full object-cover" />
                                    : <div className="w-full h-full bg-slate-700 flex items-center justify-center text-xl font-bold text-slate-300">{(hangout.creator.displayName ?? "?").charAt(0)}</div>
                                }
                            </div>
                            <p className="text-sm text-slate-400">
                                <span className="font-semibold text-white">{hangout.creator.displayName}</span>
                                {" "}invited you to
                            </p>
                        </div>

                        {/* Title */}
                        <div className="text-center space-y-2">
                            <h1 className="text-2xl font-bold text-white leading-tight">{hangout.title}</h1>
                            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-sm text-slate-400">
                                {hangout.scheduledFor && (
                                    <span className="flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 text-primary" />
                                        {format(new Date(hangout.scheduledFor), "EEE, MMM d 'at' h:mm a")}
                                    </span>
                                )}
                                {hangout.finalActivity && (
                                    <span className="flex items-center gap-1.5">
                                        <MapPin className="w-3.5 h-3.5 text-primary" />
                                        {hangout.finalActivity.name}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Participants strip */}
                        {totalGoing > 0 && (
                            <div className="flex items-center justify-center gap-2">
                                <div className="flex -space-x-2.5">
                                    {hangout.participants.slice(0, 5).map((p: any) => (
                                        <div key={p.id} className="w-8 h-8 rounded-full ring-2 ring-slate-900 overflow-hidden bg-slate-700 shrink-0">
                                            {p.profile?.avatarUrl
                                                ? <img src={p.profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-300">{(p.profile?.displayName ?? "?").charAt(0)}</div>
                                            }
                                        </div>
                                    ))}
                                </div>
                                <span className="text-xs text-slate-500">{totalGoing} going</span>
                            </div>
                        )}

                        {/* RSVP buttons */}
                        <div className="space-y-2">
                            <p className="text-[11px] text-center text-slate-500 uppercase tracking-wider font-bold">Are you in?</p>
                            <div className="grid grid-cols-3 gap-2">
                                <form action={`/api/join/${token}/rsvp`} method="POST">
                                    <input type="hidden" name="status" value="GOING" />
                                    <button type="submit"
                                        className="w-full flex flex-col items-center gap-1 py-3 rounded-2xl bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 transition-all active:scale-95">
                                        <Check className="w-4 h-4" />
                                        <span className="text-xs font-bold">Going</span>
                                    </button>
                                </form>
                                <form action={`/api/join/${token}/rsvp`} method="POST">
                                    <input type="hidden" name="status" value="MAYBE" />
                                    <button type="submit"
                                        className="w-full flex flex-col items-center gap-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-all active:scale-95">
                                        <HelpCircle className="w-4 h-4" />
                                        <span className="text-xs font-bold">Maybe</span>
                                    </button>
                                </form>
                                <form action={`/api/join/${token}/rsvp`} method="POST">
                                    <input type="hidden" name="status" value="NOT_GOING" />
                                    <button type="submit"
                                        className="w-full flex flex-col items-center gap-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-slate-500 hover:bg-white/10 transition-all active:scale-95">
                                        <X className="w-4 h-4" />
                                        <span className="text-xs font-bold">Can&apos;t</span>
                                    </button>
                                </form>
                            </div>
                            <Link href={redirectPath}
                                className="block text-center text-xs text-slate-600 hover:text-slate-500 transition-colors py-1">
                                See full details first →
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Guest conversion card */}
                {!userId && (
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5 space-y-3">
                        <div>
                            <p className="text-sm font-bold text-white">Keep your RSVP & get reminders</p>
                            <p className="text-xs text-slate-500 mt-0.5">Free account — 30 seconds</p>
                        </div>
                        <ul className="space-y-2">
                            {[
                                { icon: "📅", text: "All your plans in one place" },
                                { icon: "🔔", text: "Reminders when plans change" },
                                { icon: "👥", text: "Coordinate with your circle" },
                            ].map(({ icon, text }) => (
                                <li key={text} className="flex items-center gap-2.5 text-xs text-slate-400">
                                    <span>{icon}</span>{text}
                                </li>
                            ))}
                        </ul>
                        <div className="flex flex-col gap-2 pt-1">
                            <Link href={`/sign-up?redirect_url=${redirectPath}`}
                                className="w-full py-2.5 rounded-xl bg-primary text-black text-sm font-bold text-center hover:bg-primary/90 transition-colors">
                                Create free account
                            </Link>
                            <Link href={`/sign-in?redirect_url=${redirectPath}`}
                                className="w-full py-2.5 rounded-xl border border-white/10 text-slate-400 text-sm font-medium text-center hover:bg-white/5 transition-colors">
                                Sign in
                            </Link>
                        </div>
                    </div>
                )}

                <p className="text-center text-slate-700 text-xs">Powered by Plans</p>
            </div>
        </div>
    );
}
