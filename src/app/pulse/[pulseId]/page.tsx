import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { PulseResponseButtons } from "@/components/pulse/pulse-response-buttons";
import { formatDistanceToNow } from "date-fns";

const TIME_LABELS: Record<string, string> = {
    TONIGHT: "Tonight",
    TOMORROW: "Tomorrow",
    THIS_WEEKEND: "This Weekend",
    NEXT_WEEK: "Next Week",
};

function formatTargetTime(t: string) {
    return TIME_LABELS[t] ?? t.replace(/_/g, " ");
}

export default async function PulsePage({
    params,
}: {
    params: Promise<{ pulseId: string }>;
}) {
    const { pulseId } = await params;

    const pulse = await prisma.pulse.findUnique({
        where: { id: pulseId },
        include: {
            creator: { select: { id: true, displayName: true, avatarUrl: true } },
            responses: true,
        },
    });

    if (!pulse) {
        notFound();
    }

    const now = new Date();
    const isExpired = pulse.expiresAt < now;
    const isGraduated = pulse.status === "GRADUATED";

    // Aggregate counts — no individual identities exposed
    const yesCnt = pulse.responses.filter((r) => r.answer === "YES").length;
    const maybeCnt = pulse.responses.filter((r) => r.answer === "MAYBE").length;
    const noCnt = pulse.responses.filter((r) => r.answer === "NO").length;

    // Determine current user's existing answer (if any)
    const { userId } = await auth();
    let myAnswer: "YES" | "MAYBE" | "NO" | undefined;
    let myProfileId: string | null = null;

    if (userId) {
        const profile = await prisma.profile.findUnique({
            where: { clerkId: userId },
            select: { id: true },
        });
        if (profile) {
            myProfileId = profile.id;
            const existing = pulse.responses.find((r) => r.profileId === profile.id);
            myAnswer = existing?.answer as "YES" | "MAYBE" | "NO" | undefined;
        }
    }

    // If graduated, try to get hangout slug
    let hangoutSlug: string | null = null;
    if (isGraduated && pulse.graduatedToId) {
        const hangout = await prisma.hangout.findUnique({
            where: { id: pulse.graduatedToId },
            select: { slug: true },
        });
        hangoutSlug = hangout?.slug ?? null;
    }

    const creatorName = pulse.creator.displayName ?? "Someone";
    const timeLabel = formatTargetTime(pulse.targetTime);

    return (
        <main className="min-h-screen bg-background pb-28">
            <div className="max-w-md mx-auto px-4 pt-10 space-y-6">
                {/* Creator row */}
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center shrink-0">
                        {pulse.creator.avatarUrl ? (
                            <img
                                src={pulse.creator.avatarUrl}
                                alt={creatorName}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <span className="text-sm font-bold text-slate-300">
                                {creatorName.charAt(0).toUpperCase()}
                            </span>
                        )}
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-white">{creatorName}</p>
                        <p className="text-xs text-slate-500">wants to know who&apos;s free</p>
                    </div>
                </div>

                {/* Time badge */}
                <div className="flex items-center gap-3">
                    <span className="px-4 py-2 rounded-full bg-primary/15 border border-primary/30 text-primary text-lg font-bold">
                        {timeLabel}
                    </span>
                </div>

                {/* Optional message */}
                {pulse.message && (
                    <p className="text-slate-300 text-sm leading-relaxed">{pulse.message}</p>
                )}

                {/* Status banners */}
                {isGraduated && (
                    <div className="rounded-2xl bg-primary/10 border border-primary/30 p-4 space-y-2">
                        <p className="text-primary font-bold text-sm">This plan is happening!</p>
                        {hangoutSlug && (
                            <Link
                                href={`/hangouts/${hangoutSlug}`}
                                className="inline-flex items-center gap-1 text-xs text-primary/80 underline hover:text-primary"
                            >
                                View the plan →
                            </Link>
                        )}
                    </div>
                )}

                {!isGraduated && isExpired && (
                    <div className="rounded-2xl bg-zinc-800/60 border border-zinc-700 p-4">
                        <p className="text-slate-400 text-sm">This pulse has expired.</p>
                    </div>
                )}

                {/* Response counts */}
                <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-4 space-y-3">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">Responses</p>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-lime-500/15 border border-lime-500/25">
                            <span className="text-lime-400 font-black text-sm">{yesCnt}</span>
                            <span className="text-lime-400/70 text-xs">YES</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/25">
                            <span className="text-amber-400 font-black text-sm">{maybeCnt}</span>
                            <span className="text-amber-400/70 text-xs">MAYBE</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800 border border-zinc-700">
                            <span className="text-zinc-400 font-black text-sm">{noCnt}</span>
                            <span className="text-zinc-500 text-xs">NO</span>
                        </div>
                    </div>
                    {yesCnt === 1 && (
                        <p className="text-xs text-slate-500">1 person said yes</p>
                    )}
                    {yesCnt > 1 && (
                        <p className="text-xs text-slate-500">{yesCnt} people said yes</p>
                    )}

                    {!isExpired && !isGraduated && (
                        <p className="text-xs text-slate-600">
                            Expires {formatDistanceToNow(new Date(pulse.expiresAt), { addSuffix: true })}
                        </p>
                    )}
                </div>

                {/* Response buttons — shown to all users (not just creator) when pulse is open */}
                {!isExpired && !isGraduated && (
                    <PulseResponseButtons pulseId={pulseId} initialAnswer={myAnswer} />
                )}
            </div>
        </main>
    );
}
