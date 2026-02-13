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

    const url = `/hangouts/${hangout.slug}/opengraph-image`;

    return {
        title: `Join "${hangout.title}" on Plans`,
        description: `You've been invited to ${hangout.title}. RSVP now on Plans AI.`,
        openGraph: {
            title: hangout.title,
            description: "Join this hangout on Plans",
            images: [
                {
                    url: url,
                    width: 1200,
                    height: 630,
                    alt: hangout.title,
                }
            ],
        },
    };
}

export default async function JoinPage({ params }: JoinPageProps) {
    const { token } = await params;
    const { userId } = await auth();

    // Find hangout by invite token
    const hangout = await prisma.hangout.findFirst({
        where: { inviteToken: token },
        include: {
            creator: true,
            finalActivity: true,
            participants: {
                include: { profile: true },
                take: 6
            }
        }
    });

    if (!hangout) {
        notFound();
    }

    // If user is signed in, check if already a participant
    let currentParticipant = null;
    if (userId) {
        const profile = await prisma.profile.findUnique({
            where: { clerkId: userId }
        });

        if (profile) {
            currentParticipant = hangout.participants.find(
                (p: any) => p.profileId === profile.id
            );

            // If already a participant, redirect to hangout page
            if (currentParticipant) {
                redirect(`/hangouts/${hangout.slug}`);
            }
        }
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                {/* Invite Card */}
                <div className="glass p-8 rounded-3xl border border-white/10 bg-slate-900/60 text-center space-y-6">
                    {/* Creator */}
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-16 h-16 rounded-full bg-slate-800 overflow-hidden ring-4 ring-violet-500/30">
                            {hangout.creator.avatarUrl && (
                                <img src={hangout.creator.avatarUrl} alt="" className="w-full h-full object-cover" />
                            )}
                        </div>
                        <p className="text-slate-400 text-sm">
                            <span className="font-medium text-white">{hangout.creator.displayName}</span> invited you
                        </p>
                    </div>

                    {/* Hangout Details */}
                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold text-white">{hangout.title}</h1>

                        <div className="flex flex-wrap gap-3 justify-center text-sm text-slate-400">
                            {hangout.scheduledFor && (
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="w-4 h-4 text-violet-400" />
                                    {format(new Date(hangout.scheduledFor), "EEE, MMM d 'at' h:mm a")}
                                </div>
                            )}
                            {hangout.finalActivity && (
                                <div className="flex items-center gap-1.5">
                                    <MapPin className="w-4 h-4 text-violet-400" />
                                    {hangout.finalActivity.name}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Participants Preview */}
                    <div className="flex items-center justify-center gap-2">
                        <div className="flex -space-x-3">
                            {hangout.participants.slice(0, 4).map((p: any) => (
                                <div
                                    key={p.id}
                                    className="w-8 h-8 rounded-full bg-slate-700 ring-2 ring-slate-900 overflow-hidden"
                                >
                                    {p.profile?.avatarUrl && (
                                        <img src={p.profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                                    )}
                                </div>
                            ))}
                        </div>
                        <span className="text-sm text-slate-500">
                            {hangout.participants.length} going
                        </span>
                    </div>

                    {/* RSVP Buttons */}
                    <div className="space-y-3">
                        <form action={`/api/join/${token}/rsvp`} method="POST">
                            <input type="hidden" name="status" value="GOING" />
                            <button
                                type="submit"
                                className="w-full py-3 px-4 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <Check className="w-5 h-5" />
                                I'm Going!
                            </button>
                        </form>

                        <div className="grid grid-cols-2 gap-3">
                            <form action={`/api/join/${token}/rsvp`} method="POST">
                                <input type="hidden" name="status" value="MAYBE" />
                                <button
                                    type="submit"
                                    className="w-full py-2.5 px-4 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <HelpCircle className="w-4 h-4" />
                                    Maybe
                                </button>
                            </form>
                            <form action={`/api/join/${token}/rsvp`} method="POST">
                                <input type="hidden" name="status" value="NOT_GOING" />
                                <button
                                    type="submit"
                                    className="w-full py-2.5 px-4 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <X className="w-4 h-4" />
                                    Can't Make It
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Sign In Prompt */}
                    {!userId && (
                        <p className="text-xs text-slate-500">
                            <Link href="/sign-in" className="text-violet-400 hover:underline">Sign in</Link> to sync with your account
                        </p>
                    )}
                </div>

                {/* Branding */}
                <p className="text-center text-slate-600 text-xs mt-6">
                    Powered by Plans
                </p>
            </div>
        </div>
    );
}
