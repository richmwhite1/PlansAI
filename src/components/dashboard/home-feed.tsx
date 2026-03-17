"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ChevronLeft, ChevronRight, ChevronDown, Zap,
} from "lucide-react";
import {
    format, startOfMonth, endOfMonth, eachDayOfInterval,
    isSameDay, isToday, addMonths, subMonths, getDay, isPast,
} from "date-fns";
import { HangoutCard } from "@/components/hangout/hangout-card";
import { CircleFeed } from "@/components/dashboard/circle-feed";
import { PulseCard } from "@/components/pulse/pulse-card";
import { CreatePulseModal } from "@/components/pulse/create-pulse-modal";
import { cn } from "@/lib/utils";

interface SocialFeed {
    friends: Array<{ id: string; displayName: string | null; avatarUrl: string | null; availableStatus: string | null }>;
    driftFriends: Array<{ id: string; displayName: string | null; avatarUrl: string | null }>;
    myStatus: string | null;
}

interface PulseData {
    id: string;
    creatorId: string;
    creator: { id: string; displayName: string | null; avatarUrl: string | null };
    targetTime: string;
    message: string | null;
    status: string;
    expiresAt: Date | string;
    graduateThreshold: number;
    graduatedToId: string | null;
    createdAt: Date | string;
    isCreator: boolean;
    myAnswer?: "YES" | "MAYBE" | "NO" | null;
    counts: { YES: number; MAYBE: number; NO: number };
    hangoutSlug?: string | null;
}

interface HomeFeedProps {
    hangouts: any[];
    displayName?: string | null;
    socialFeed?: SocialFeed;
    pulses?: PulseData[];
}

// Build a Set of "YYYY-MM-DD" strings that have a scheduled hangout
function buildEventDateSet(hangouts: any[]): Set<string> {
    const s = new Set<string>();
    for (const h of hangouts) {
        if (h.scheduledFor) {
            s.add(format(new Date(h.scheduledFor), "yyyy-MM-dd"));
        }
    }
    return s;
}

function MiniCalendar({
    hangouts,
    selectedDate,
    onSelectDate,
}: {
    hangouts: any[];
    selectedDate: Date | null;
    onSelectDate: (d: Date | null) => void;
}) {
    const [viewMonth, setViewMonth] = useState(() => new Date());
    const eventDates = useMemo(() => buildEventDateSet(hangouts), [hangouts]);

    const days = eachDayOfInterval({
        start: startOfMonth(viewMonth),
        end: endOfMonth(viewMonth),
    });

    // Pad start so grid aligns to Sunday = 0
    const startPad = getDay(days[0]); // 0 Sun … 6 Sat

    return (
        <div className="bg-white/[0.03] border border-white/6 rounded-2xl p-4 select-none">
            {/* Month header */}
            <div className="flex items-center justify-between mb-4">
                <button
                    onClick={() => setViewMonth(subMonths(viewMonth, 1))}
                    className="w-8 h-8 rounded-full hover:bg-white/8 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-semibold text-white">
                    {format(viewMonth, "MMMM yyyy")}
                </span>
                <button
                    onClick={() => setViewMonth(addMonths(viewMonth, 1))}
                    className="w-8 h-8 rounded-full hover:bg-white/8 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 mb-2">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                    <div key={d} className="text-center text-[10px] font-bold text-slate-600 uppercase tracking-wider py-1">
                        {d}
                    </div>
                ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-y-1">
                {/* Leading empty cells */}
                {Array.from({ length: startPad }).map((_, i) => (
                    <div key={`pad-${i}`} />
                ))}

                {days.map((day) => {
                    const key = format(day, "yyyy-MM-dd");
                    const hasEvent = eventDates.has(key);
                    const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                    const todayDay = isToday(day);

                    return (
                        <button
                            key={key}
                            onClick={() => onSelectDate(isSelected ? null : day)}
                            className={cn(
                                "relative flex flex-col items-center justify-center h-9 w-full rounded-xl transition-all text-sm font-medium",
                                isSelected
                                    ? "bg-primary text-black"
                                    : todayDay
                                    ? "bg-white/8 text-white"
                                    : "text-slate-400 hover:bg-white/5 hover:text-white",
                                !hasEvent && !isSelected && !todayDay && "opacity-50"
                            )}
                        >
                            <span className="leading-none">{format(day, "d")}</span>
                            {/* Event dot */}
                            {hasEvent && (
                                <span
                                    className={cn(
                                        "absolute bottom-1 w-1 h-1 rounded-full",
                                        isSelected ? "bg-black/60" : "bg-primary"
                                    )}
                                />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Clear filter hint */}
            {selectedDate && (
                <button
                    onClick={() => onSelectDate(null)}
                    className="mt-3 w-full text-center text-[10px] font-bold text-primary/70 hover:text-primary uppercase tracking-widest transition-colors"
                >
                    Show all plans
                </button>
            )}
        </div>
    );
}

export function HomeFeed({ hangouts, displayName, socialFeed, pulses = [] }: HomeFeedProps) {
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [showPulseModal, setShowPulseModal] = useState(false);
    const [localPulses, setLocalPulses] = useState<PulseData[]>(pulses);
    const feedRef = useRef<HTMLDivElement>(null);

    // When a date is selected, scroll the feed into view smoothly
    useEffect(() => {
        if (selectedDate && feedRef.current) {
            feedRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }, [selectedDate]);

    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    const firstName = displayName?.split(" ")[0];

    // Separate past hangouts (scheduled date has passed and not still PLANNING/VOTING)
    const pastHangouts = useMemo(() => hangouts.filter((h) => {
        if (!h.scheduledFor) return false;
        if (h.status === "PLANNING" || h.status === "VOTING") return false;
        return isPast(new Date(h.scheduledFor));
    }), [hangouts]);

    const pendingRecapCount = useMemo(() =>
        pastHangouts.filter((h) => !h.hasFeedback && h.isParticipant).length,
    [pastHangouts]);

    // Auto-expand past section when any events need a recap
    const [showPast, setShowPast] = useState(() =>
        hangouts.some((h) => {
            if (!h.scheduledFor || h.status === "PLANNING" || h.status === "VOTING") return false;
            return isPast(new Date(h.scheduledFor)) && !h.hasFeedback && h.isParticipant;
        })
    );

    const activeHangouts = useMemo(() => hangouts.filter((h) => !pastHangouts.includes(h)), [hangouts, pastHangouts]);

    // Filter by selected date, or show active hangouts
    const visibleHangouts = useMemo(() => {
        const base = selectedDate ? hangouts : activeHangouts;
        if (!selectedDate) return base;
        return base.filter(
            (h) => h.scheduledFor && isSameDay(new Date(h.scheduledFor), selectedDate)
        );
    }, [hangouts, activeHangouts, selectedDate]);

    // Categorise visible hangouts
    const pending = visibleHangouts.filter(
        (h) => (h.status === "PLANNING" || h.status === "VOTING") && h.myRsvp !== "NOT_GOING"
    );
    const upcoming = visibleHangouts.filter(
        (h) => h.status === "CONFIRMED" || h.status === "ACTIVE"
    );
    const other = visibleHangouts.filter(
        (h) => !pending.includes(h) && !upcoming.includes(h)
    );

    const statusLine = selectedDate
        ? visibleHangouts.length === 0
            ? `Nothing on ${format(selectedDate, "MMM d")}.`
            : `${visibleHangouts.length} plan${visibleHangouts.length > 1 ? "s" : ""} on ${format(selectedDate, "MMM d")}.`
        : pending.length > 0
        ? `${pending.length} plan${pending.length > 1 ? "s" : ""} waiting on you.`
        : upcoming.length > 0
        ? "You're all caught up."
        : "Nothing planned yet.";

    return (
        <main className="min-h-screen bg-background pb-28">
            <div className="max-w-md mx-auto px-4 pt-8 space-y-5">

                {/* Greeting */}
                <div className="space-y-1">
                    <h1 className="text-3xl font-serif font-bold text-white">
                        {greeting}{firstName ? `, ${firstName}` : ""}.
                    </h1>
                    <p className="text-slate-500 text-sm">{statusLine}</p>
                </div>

                {/* Circle / friend availability */}
                {socialFeed && socialFeed.friends.length > 0 && (
                    <CircleFeed
                        friends={socialFeed.friends}
                        driftFriends={socialFeed.driftFriends}
                        initialMyStatus={socialFeed.myStatus}
                    />
                )}

                {/* Pulse section */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] flex items-center gap-2">
                            <Zap className="w-3 h-3 text-primary" />
                            Pulse
                        </h2>
                        <button
                            onClick={() => setShowPulseModal(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/25 text-primary text-[10px] font-black uppercase tracking-wider hover:bg-primary/20 transition-colors"
                        >
                            <Zap className="w-3 h-3" />
                            Who&apos;s free?
                        </button>
                    </div>

                    {localPulses.length > 0 && (
                        <div className="space-y-3">
                            {localPulses.map((pulse) => (
                                <PulseCard
                                    key={pulse.id}
                                    pulse={pulse}
                                    isCreator={pulse.isCreator}
                                    hangoutSlug={pulse.hangoutSlug}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Calendar */}
                <MiniCalendar
                    hangouts={hangouts}
                    selectedDate={selectedDate}
                    onSelectDate={setSelectedDate}
                />

                {/* Pulse creation modal */}
                <CreatePulseModal
                    isOpen={showPulseModal}
                    onClose={() => setShowPulseModal(false)}
                    onSuccess={(pulseId, friendCount) => {
                        // Optimistically add a placeholder to the pulse list
                        console.log(`Pulse ${pulseId} sent to ${friendCount} friends`);
                    }}
                />

                {/* Feed */}
                <div ref={feedRef} className="space-y-8 pt-1">

                    {/* Needs attention */}
                    {pending.length > 0 && (
                        <section className="space-y-3">
                            <h2 className="text-[10px] font-black text-primary uppercase tracking-[0.15em] flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                Needs attention
                            </h2>
                            <div className="space-y-3">
                                {pending.map((h) => (
                                    <HangoutCard key={h.id} hangout={h} variant="pending" />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Coming up */}
                    {upcoming.length > 0 && (
                        <section className="space-y-3">
                            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                                Coming up
                            </h2>
                            <div className="space-y-3">
                                {upcoming.map((h) => (
                                    <HangoutCard key={h.id} hangout={h} variant="upcoming" />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* All / other */}
                    {other.length > 0 && (
                        <section className="space-y-3">
                            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">
                                {selectedDate ? "On this day" : "All plans"}
                            </h2>
                            <div className="space-y-3">
                                {other.map((h) => (
                                    <HangoutCard key={h.id} hangout={h} variant="past" />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Empty state */}
                    {visibleHangouts.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            {selectedDate ? (
                                <div className="text-center space-y-4 py-12">
                                    <p className="text-4xl">📅</p>
                                    <p className="text-slate-400 text-sm">
                                        No plans on {format(selectedDate, "MMMM d")}.
                                    </p>
                                </div>
                            ) : hangouts.length === 0 && (socialFeed?.friends.length ?? 0) === 0 ? (
                                /* First-run onboarding card */
                                <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-6 space-y-5">
                                    <div className="text-center space-y-1">
                                        <p className="text-2xl">👋</p>
                                        <h3 className="text-lg font-bold text-white">Welcome to Plans</h3>
                                        <p className="text-slate-500 text-sm">Three steps to your first hangout</p>
                                    </div>
                                    <div className="space-y-3">
                                        {[
                                            { step: "1", icon: "🔍", title: "Find your friends", desc: "Search by name and add the people you hang with", href: "/friends", cta: "Find friends" },
                                            { step: "2", icon: "✨", title: "Create a plan", desc: "Pick an activity, set a date, invite your crew", href: null, cta: "Tap + below" },
                                            { step: "3", icon: "🔗", title: "Share the link", desc: "Anyone can RSVP — no account needed", href: null, cta: null },
                                        ].map(({ step, icon, title, desc, href, cta }) => (
                                            <div key={step} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                                <span className="w-7 h-7 rounded-full bg-primary/15 text-primary text-xs font-black flex items-center justify-center shrink-0 mt-0.5">{step}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-white">{icon} {title}</p>
                                                    <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                                                </div>
                                                {href && cta && (
                                                    <a href={href} className="shrink-0 px-3 py-1.5 rounded-lg bg-primary text-black text-xs font-bold hover:bg-primary/90 transition-colors">
                                                        {cta}
                                                    </a>
                                                )}
                                                {!href && cta && (
                                                    <span className="shrink-0 px-3 py-1.5 rounded-lg bg-white/8 border border-white/10 text-slate-400 text-xs font-bold">{cta}</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center space-y-4 py-12">
                                    <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto">
                                        <span className="font-serif font-bold text-primary text-3xl italic">P</span>
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-bold text-white">No plans yet</h3>
                                        <p className="text-slate-400 text-sm max-w-xs mx-auto">
                                            Tap the <span className="text-primary font-bold">+</span> button to create your first plan.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Past plans — collapsible */}
                    {!selectedDate && pastHangouts.length > 0 && (
                        <section className="space-y-3">
                            <button
                                onClick={() => setShowPast((p) => !p)}
                                className="flex items-center gap-2 text-[10px] font-black text-slate-600 uppercase tracking-[0.15em] hover:text-slate-400 transition-colors w-full"
                            >
                                <ChevronDown
                                    className={cn(
                                        "w-3.5 h-3.5 transition-transform",
                                        showPast && "rotate-180"
                                    )}
                                />
                                Past ({pastHangouts.length})
                                {pendingRecapCount > 0 && (
                                    <span className="flex items-center gap-1 ml-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-400">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                                        {pendingRecapCount} recap{pendingRecapCount > 1 ? "s" : ""} needed
                                    </span>
                                )}
                            </button>
                            <AnimatePresence>
                                {showPast && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="space-y-3 overflow-hidden"
                                    >
                                        {pastHangouts.map((h) => (
                                            <HangoutCard key={h.id} hangout={h} variant="past" />
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </section>
                    )}
                </div>
            </div>
        </main>
    );
}
