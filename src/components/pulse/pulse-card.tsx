"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { PulseResponseButtons } from "./pulse-response-buttons";

interface PulseCardProps {
    pulse: {
        id: string;
        creatorId: string;
        creator: {
            id: string;
            displayName: string | null;
            avatarUrl: string | null;
        };
        targetTime: string;
        message: string | null;
        status: string;
        expiresAt: Date | string;
        graduateThreshold: number;
        graduatedToId: string | null;
        createdAt: Date | string;
        myAnswer?: "YES" | "MAYBE" | "NO" | null;
        counts: {
            YES: number;
            MAYBE: number;
            NO: number;
        };
    };
    isCreator: boolean;
    hangoutSlug?: string | null;
}

const TIME_LABELS: Record<string, string> = {
    TONIGHT: "Tonight",
    TOMORROW: "Tomorrow",
    THIS_WEEKEND: "This Weekend",
    NEXT_WEEK: "Next Week",
};

function formatTargetTime(t: string) {
    return TIME_LABELS[t] ?? t.replace(/_/g, " ");
}

export function PulseCard({ pulse, isCreator, hangoutSlug }: PulseCardProps) {
    const [graduating, setGraduating] = useState(false);
    const [graduated, setGraduated] = useState(pulse.status === "GRADUATED");
    const [resolvedSlug, setResolvedSlug] = useState<string | null>(hangoutSlug ?? null);

    const isExpired = new Date(pulse.expiresAt) < new Date();
    const isGraduated = graduated || pulse.status === "GRADUATED";
    const expiresIn = formatDistanceToNow(new Date(pulse.expiresAt), { addSuffix: true });
    const timeLabel = formatTargetTime(pulse.targetTime);
    const creatorName = pulse.creator.displayName ?? "Someone";

    const handleGraduate = async () => {
        setGraduating(true);
        try {
            const res = await fetch(`/api/pulse/${pulse.id}/graduate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            });

            if (!res.ok) {
                toast.error("Could not create plan. Please try again.");
                return;
            }

            const data = await res.json();
            setGraduated(true);
            setResolvedSlug(data.hangoutSlug);
            toast.success("Plan created! Your pulse is now a hangout.");
        } catch {
            toast.error("Something went wrong.");
        } finally {
            setGraduating(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-3"
        >
            {/* Top row: creator + time */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center shrink-0">
                        {pulse.creator.avatarUrl ? (
                            <img
                                src={pulse.creator.avatarUrl}
                                alt={creatorName}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <span className="text-xs font-bold text-slate-300">
                                {creatorName.charAt(0).toUpperCase()}
                            </span>
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs text-slate-400 truncate">
                            <span className="text-slate-200 font-semibold">{creatorName}</span>
                            {" "}wants to know who&apos;s free
                        </p>
                    </div>
                </div>
                <span className="shrink-0 px-2.5 py-1 rounded-full bg-primary/15 border border-primary/25 text-primary text-[10px] font-black uppercase tracking-wider">
                    {timeLabel}
                </span>
            </div>

            {/* Optional message */}
            {pulse.message && (
                <p className="text-sm text-slate-300 leading-relaxed">{pulse.message}</p>
            )}

            {/* Response counts */}
            <div className="flex items-center gap-2">
                <span className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold",
                    pulse.counts.YES > 0 ? "bg-lime-500/15 border border-lime-500/25 text-lime-400" : "bg-zinc-800 border border-zinc-700 text-zinc-600"
                )}>
                    {pulse.counts.YES} YES
                </span>
                <span className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold",
                    pulse.counts.MAYBE > 0 ? "bg-amber-500/15 border border-amber-500/25 text-amber-400" : "bg-zinc-800 border border-zinc-700 text-zinc-600"
                )}>
                    {pulse.counts.MAYBE} MAYBE
                </span>
                <span className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold",
                    pulse.counts.NO > 0 ? "bg-zinc-700 border border-zinc-600 text-zinc-400" : "bg-zinc-800 border border-zinc-700 text-zinc-600"
                )}>
                    {pulse.counts.NO} NO
                </span>
            </div>

            {/* Graduated banner */}
            {isGraduated && (
                <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-xl px-3 py-2">
                    <span className="text-xs font-bold text-primary">Plan created!</span>
                    {resolvedSlug && (
                        <Link
                            href={`/hangouts/${resolvedSlug}`}
                            className="text-xs text-primary/70 hover:text-primary underline"
                        >
                            View plan →
                        </Link>
                    )}
                </div>
            )}

            {/* Expiry */}
            {!isGraduated && !isExpired && (
                <p className="text-[10px] text-slate-600">
                    Expires {expiresIn}
                </p>
            )}

            {/* Creator CTA: make it a plan */}
            {isCreator && !isGraduated && !isExpired && pulse.counts.YES >= 2 && (
                <button
                    onClick={handleGraduate}
                    disabled={graduating}
                    className="w-full py-2.5 rounded-xl bg-primary text-black font-bold text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                    {graduating ? "Creating..." : "Make it a Plan →"}
                </button>
            )}

            {/* Non-creator: inline response buttons */}
            {!isCreator && !isGraduated && !isExpired && (
                <PulseResponseButtons
                    pulseId={pulse.id}
                    initialAnswer={pulse.myAnswer ?? undefined}
                />
            )}
        </motion.div>
    );
}
