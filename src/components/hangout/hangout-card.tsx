"use client";

import NextLink from "next/link";
import { format, formatDistanceToNow, isFuture } from "date-fns";
import { MapPin, Clock, Check, X, Zap, Users, CalendarPlus, Camera, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useState } from "react";
import { FeedbackModal } from "./feedback-modal";

interface HangoutCardProps {
    hangout: any;
    variant: "pending" | "upcoming" | "past";
    onRsvpChange?: (newStatus: string) => void;
}

// Per-type gradient when there's no photo
const TYPE_GRADIENTS: Record<string, string> = {
    GROUP_DINNER: "from-orange-950 via-amber-950 to-stone-950",
    DATE:         "from-rose-950 via-pink-950 to-slate-950",
    ACTIVITY:     "from-emerald-950 via-teal-950 to-slate-950",
    TRIP:         "from-blue-950 via-cyan-950 to-slate-950",
    PARTY:        "from-purple-950 via-fuchsia-950 to-slate-950",
    CASUAL:       "from-slate-900 via-zinc-900 to-neutral-900",
    CUSTOM:       "from-slate-900 via-zinc-900 to-neutral-900",
};

const STATUS_CONFIG: Record<string, { label: string; className: string; dot: string }> = {
    PLANNING:  { label: "Planning",   className: "bg-amber-500/20 text-amber-300 border-amber-500/30",       dot: "bg-amber-400" },
    VOTING:    { label: "Vote open",  className: "bg-primary/20 text-primary border-primary/30",             dot: "bg-primary animate-pulse" },
    CONFIRMED: { label: "Confirmed",  className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", dot: "bg-emerald-400" },
    ACTIVE:    { label: "Happening",  className: "bg-primary/20 text-primary border-primary/30",             dot: "bg-primary animate-pulse" },
    COMPLETED: { label: "Done",       className: "bg-slate-700/40 text-slate-400 border-slate-600/30",       dot: "bg-slate-500" },
    CANCELLED: { label: "Cancelled",  className: "bg-rose-500/20 text-rose-400 border-rose-500/30",          dot: "bg-rose-500" },
};

// Ring color per participant's RSVP status
const RSVP_RING: Record<string, string> = {
    GOING:     "ring-emerald-400",
    MAYBE:     "ring-amber-400",
    NOT_GOING: "ring-rose-500/60",
    PENDING:   "ring-white/10",
};

export function HangoutCard({ hangout, variant, onRsvpChange }: HangoutCardProps) {
    const [myRsvp, setMyRsvp] = useState<string>(hangout.myRsvp ?? "PENDING");
    const [hasVoted, setHasVoted] = useState<boolean>(hangout.hasVoted ?? false);
    const [rsvpLoading, setRsvpLoading] = useState<string | null>(null);
    const [recapOpen, setRecapOpen] = useState(false);
    const [recapDone, setRecapDone] = useState(hangout.hasFeedback ?? false);

    const heroImage =
        hangout.finalActivity?.imageUrl ||
        hangout.activity?.image ||
        hangout.activityOptions?.[0]?.cachedEvent?.imageUrl ||
        null;

    const gradient = TYPE_GRADIENTS[hangout.type] ?? TYPE_GRADIENTS.CASUAL;
    const status = STATUS_CONFIG[hangout.status] ?? STATUS_CONFIG.PLANNING;

    const needsVote   = hangout.status === "VOTING"    && !hasVoted && myRsvp !== "NOT_GOING";
    const needsRsvp   = hangout.status === "PLANNING"  && myRsvp === "PENDING";
    const needsAction = needsVote || needsRsvp;

    const activityName =
        hangout.finalActivity?.name ||
        hangout.activity?.name ||
        hangout.activityOptions?.[0]?.cachedEvent?.name ||
        null;

    const dateLabel = hangout.scheduledFor
        ? isFuture(new Date(hangout.scheduledFor))
            ? format(new Date(hangout.scheduledFor), "EEE, MMM d · h:mm a")
            : formatDistanceToNow(new Date(hangout.scheduledFor), { addSuffix: true })
        : "Date TBD";

    const handleAddToCalendar = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!hangout.scheduledFor) return;
        const start = new Date(hangout.scheduledFor);
        const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // +2h default
        const fmt = (d: Date) =>
            d.toISOString().replace(/[-:]/g, "").split(".")[0];
        const params = new URLSearchParams({
            action: "TEMPLATE",
            text: hangout.title,
            dates: `${fmt(start)}/${fmt(end)}`,
            ...(activityName ? { location: activityName } : {}),
        });
        window.open(`https://calendar.google.com/calendar/render?${params}`, "_blank");
    };

    const handleQuickRsvp = async (e: React.MouseEvent, status: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (rsvpLoading) return;
        setRsvpLoading(status);
        try {
            const res = await fetch(`/api/hangouts/${hangout.id}/rsvp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });
            if (res.ok) {
                setMyRsvp(status);
                onRsvpChange?.(status);
            }
        } catch {}
        finally { setRsvpLoading(null); }
    };

    // How many people are confirmed going (excluding current user)
    const goingCount = hangout.participants?.filter(
        (p: any) => p.rsvpStatus === "GOING"
    ).length ?? 0;

    // ── Compact "memory" card for past events ──────────────────────────────
    if (variant === "past") {
        const pastDate = hangout.scheduledFor ? new Date(hangout.scheduledFor) : null;
        const needsRecap = !recapDone && (hangout.isParticipant !== false);

        return (
            <>
                <motion.div
                    whileTap={{ scale: 0.99 }}
                    transition={{ duration: 0.12 }}
                    className="relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.025]"
                >
                    {/* Subtle background */}
                    <div className={cn("absolute inset-0 bg-gradient-to-br opacity-20", gradient)} />
                    {heroImage && (
                        <img
                            src={heroImage}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover opacity-[0.07]"
                        />
                    )}

                    {/* Main row — tappable, goes to detail */}
                    <NextLink href={`/hangouts/${hangout.slug}`} className="relative flex items-center gap-3 p-4">
                        {/* Date block */}
                        {pastDate ? (
                            <div className="shrink-0 w-10 text-center">
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                    {format(pastDate, "MMM")}
                                </p>
                                <p className="text-2xl font-black text-slate-300 leading-none">
                                    {format(pastDate, "d")}
                                </p>
                            </div>
                        ) : (
                            <div className="shrink-0 w-10" />
                        )}

                        {/* Divider */}
                        <div className="shrink-0 w-px h-8 bg-white/8" />

                        {/* Title + location */}
                        <div className="flex-1 min-w-0 space-y-0.5">
                            <h3 className="font-bold text-slate-200 text-sm leading-snug truncate">
                                {hangout.title}
                            </h3>
                            {activityName && (
                                <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
                                    <MapPin className="w-2.5 h-2.5 shrink-0" />
                                    {activityName}
                                </p>
                            )}
                        </div>

                        {/* Participant avatars */}
                        {hangout.participants && hangout.participants.length > 0 && (
                            <div className="flex -space-x-1.5 shrink-0">
                                {hangout.participants.slice(0, 4).map((p: any) => {
                                    const name = p.profile?.displayName || p.guest?.displayName || "?";
                                    const avatar = p.profile?.avatarUrl;
                                    return (
                                        <div
                                            key={p.id}
                                            className="w-6 h-6 rounded-full ring-1 ring-background overflow-hidden bg-slate-700 shrink-0"
                                        >
                                            {avatar ? (
                                                <img src={avatar} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-slate-300 bg-slate-800">
                                                    {name.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {hangout.participants.length > 4 && (
                                    <div className="w-6 h-6 rounded-full ring-1 ring-background bg-slate-800 flex items-center justify-center text-[8px] text-slate-400 font-bold">
                                        +{hangout.participants.length - 4}
                                    </div>
                                )}
                            </div>
                        )}
                    </NextLink>

                    {/* Recap CTA — amber band at bottom */}
                    {needsRecap && (
                        <button
                            onClick={() => setRecapOpen(true)}
                            className="relative w-full flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 border-t border-amber-500/20 hover:bg-amber-500/15 transition-colors"
                        >
                            <Camera className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="text-xs font-bold text-amber-300 flex-1 text-left">
                                Add your recap · photos &amp; reflection
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-amber-500/60" />
                        </button>
                    )}
                </motion.div>

                {recapOpen && (
                    <FeedbackModal
                        hangoutId={hangout.id}
                        hangoutTitle={hangout.title}
                        isOpen={recapOpen}
                        onClose={() => setRecapOpen(false)}
                        onComplete={() => setRecapDone(true)}
                    />
                )}
            </>
        );
    }

    return (
        <NextLink href={`/hangouts/${hangout.slug}`} className="block group">
            <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="relative overflow-hidden rounded-2xl border border-white/8 shadow-xl"
            >
                {/* ── Background layer ── */}
                <div className={cn("absolute inset-0 bg-gradient-to-br", gradient)} />
                {heroImage && (
                    <img
                        src={heroImage}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-40 transition-opacity duration-500"
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />

                {/* ── Action banner — full-width, unmissable ── */}
                {needsAction && (
                    <div className={cn(
                        "relative px-4 py-2.5 flex items-center justify-between gap-3",
                        needsVote
                            ? "bg-primary/20 border-b border-primary/30"
                            : "bg-amber-500/15 border-b border-amber-500/25"
                    )}>
                        <div className="flex items-center gap-2">
                            <motion.div
                                animate={{ scale: [1, 1.3, 1] }}
                                transition={{ repeat: Infinity, duration: 1.6 }}
                                className={cn(
                                    "w-2 h-2 rounded-full shrink-0",
                                    needsVote ? "bg-primary" : "bg-amber-400"
                                )}
                            />
                            <span className={cn(
                                "text-xs font-black uppercase tracking-wider",
                                needsVote ? "text-primary" : "text-amber-300"
                            )}>
                                {needsVote ? "Your vote is needed" : "RSVP needed from you"}
                            </span>
                        </div>

                        {/* Inline RSVP quick-actions */}
                        {needsRsvp && (
                            <div className="flex items-center gap-1.5 shrink-0">
                                {(["GOING", "MAYBE", "NOT_GOING"] as const).map((s) => (
                                    <button
                                        key={s}
                                        onClick={(e) => handleQuickRsvp(e, s)}
                                        disabled={!!rsvpLoading}
                                        className={cn(
                                            "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50",
                                            s === "GOING"
                                                ? "bg-emerald-500/30 text-emerald-300 hover:bg-emerald-500/50 border border-emerald-500/40"
                                                : s === "MAYBE"
                                                ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/40 border border-amber-500/30"
                                                : "bg-rose-500/20 text-rose-400 hover:bg-rose-500/40 border border-rose-500/30"
                                        )}
                                    >
                                        {rsvpLoading === s ? "…" : s === "GOING" ? "In" : s === "MAYBE" ? "Maybe" : "Out"}
                                    </button>
                                ))}
                            </div>
                        )}

                        {needsVote && (
                            <span className="text-[10px] font-bold text-primary/70 shrink-0 flex items-center gap-1">
                                <Zap className="w-3 h-3" />
                                Tap to vote
                            </span>
                        )}
                    </div>
                )}

                {/* ── Main content ── */}
                <div className="relative p-4 flex flex-col gap-3">

                    {/* TOP ROW: status badge */}
                    <div className="flex items-center justify-between">
                        <span className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                            status.className
                        )}>
                            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", status.dot)} />
                            {status.label}
                        </span>

                        <div className="flex items-center gap-1.5">
                            {/* Recurring badge */}
                            {hangout.recurrenceRule && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20">
                                    ↻ {hangout.recurrenceRule === "WEEKLY" ? "Weekly" : hangout.recurrenceRule === "BIWEEKLY" ? "Biweekly" : "Monthly"}
                                </span>
                            )}
                            {/* Going count badge */}
                            {goingCount > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold text-slate-400 bg-white/5 border border-white/5">
                                    <Users className="w-3 h-3" />
                                    {goingCount} going
                                </span>
                            )}
                        </div>
                    </div>

                    {/* TITLE */}
                    <h3 className="font-bold text-white text-lg leading-tight group-hover:text-primary transition-colors">
                        {hangout.title}
                    </h3>

                    {/* BOTTOM ROW: meta + participants */}
                    <div className="flex items-end justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                            <p className="text-xs text-white/60 flex items-center gap-1.5">
                                <Clock className="w-3 h-3 shrink-0" />
                                <span className="truncate">{dateLabel}</span>
                                {hangout.scheduledFor && isFuture(new Date(hangout.scheduledFor)) && (
                                    <button
                                        onClick={handleAddToCalendar}
                                        title="Add to Google Calendar"
                                        className="ml-0.5 text-white/25 hover:text-white/60 transition-colors active:scale-90"
                                    >
                                        <CalendarPlus className="w-3 h-3" />
                                    </button>
                                )}
                            </p>
                            {activityName && (
                                <p className="text-xs text-white/50 flex items-center gap-1.5">
                                    <MapPin className="w-3 h-3 shrink-0" />
                                    <span className="truncate">{activityName}</span>
                                </p>
                            )}
                            {/* My RSVP — only when not pending/action needed */}
                            {!needsAction && myRsvp !== "PENDING" && (
                                <p className={cn(
                                    "text-[10px] font-bold uppercase tracking-wider flex items-center gap-1",
                                    myRsvp === "GOING"     ? "text-emerald-400" :
                                    myRsvp === "MAYBE"     ? "text-amber-400"   :
                                    myRsvp === "NOT_GOING" ? "text-rose-400/70" : "text-slate-500"
                                )}>
                                    {myRsvp === "GOING"     && <Check className="w-3 h-3" />}
                                    {myRsvp === "NOT_GOING" && <X className="w-3 h-3" />}
                                    {myRsvp === "GOING" ? "You're in" : myRsvp === "MAYBE" ? "Maybe" : "Not going"}
                                </p>
                            )}
                        </div>

                        {/* Participant avatars with per-person RSVP ring */}
                        {hangout.participants && hangout.participants.length > 0 && (
                            <div className="flex -space-x-2 shrink-0">
                                {hangout.participants.slice(0, 5).map((p: any) => {
                                    const rsvpStatus = p.rsvpStatus ?? "PENDING";
                                    const ring = RSVP_RING[rsvpStatus] ?? RSVP_RING.PENDING;
                                    const name = p.profile?.displayName || p.guest?.displayName || "?";
                                    const avatar = p.profile?.avatarUrl;
                                    return (
                                        <div
                                            key={p.id}
                                            title={`${name} — ${rsvpStatus.toLowerCase().replace("_", " ")}`}
                                            className={cn(
                                                "w-8 h-8 rounded-full ring-2 overflow-hidden bg-slate-700",
                                                ring
                                            )}
                                        >
                                            {avatar ? (
                                                <img src={avatar} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-200 bg-slate-800">
                                                    {name.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {hangout.participants.length > 5 && (
                                    <div className="w-8 h-8 rounded-full ring-2 ring-white/5 bg-slate-800 flex items-center justify-center text-[9px] text-slate-400 font-bold">
                                        +{hangout.participants.length - 5}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </NextLink>
    );
}
