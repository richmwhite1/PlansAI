"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, X, Zap, ArrowRight, Send, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";

interface Friend {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
    availableStatus: string | null;
}

interface DriftFriend {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
}

interface CircleFeedProps {
    friends: Friend[];
    driftFriends: DriftFriend[];
    initialMyStatus: string | null;
}

const STATUS_LABELS: Record<string, string> = {
    TONIGHT: "Free tonight",
    TOMORROW: "Free tomorrow",
    FRIDAY: "Free Friday",
    SATURDAY: "Free Saturday",
    SUNDAY: "Free Sunday",
    WEEKEND: "Free this weekend",
};

const STATUS_OPTIONS = [
    { value: "TONIGHT", label: "Tonight" },
    { value: "TOMORROW", label: "Tomorrow" },
    { value: "FRIDAY", label: "Fri" },
    { value: "SATURDAY", label: "Sat" },
    { value: "SUNDAY", label: "Sun" },
    { value: "WEEKEND", label: "Weekend" },
];

function Avatar({ src, name, size = 11 }: { src?: string | null; name?: string | null; size?: number }) {
    return (
        <div className={cn(`w-${size} h-${size} rounded-full overflow-hidden bg-slate-800 flex items-center justify-center shrink-0`)}>
            {src ? (
                <img src={src} alt={name ?? ""} className="w-full h-full object-cover" />
            ) : (
                <span className="text-xs font-bold text-slate-300">{(name ?? "?").charAt(0).toUpperCase()}</span>
            )}
        </div>
    );
}

export function CircleFeed({ friends, driftFriends, initialMyStatus }: CircleFeedProps) {
    const searchParams = useSearchParams();
    const pollParam = searchParams?.get("poll");

    const [myStatus, setMyStatus] = useState<string | null>(initialMyStatus);
    const [showPicker, setShowPicker] = useState(false);
    const [showPoll, setShowPoll] = useState(false);
    const [pollStatus, setPollStatus] = useState<string>("WEEKEND");
    const [pollFriendIds, setPollFriendIds] = useState<Set<string>>(new Set());
    const [hoveredFriend, setHoveredFriend] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [pollSent, setPollSent] = useState(false);

    // If arriving via ?poll= link, auto-open picker pre-selected to that status
    useEffect(() => {
        if (pollParam && STATUS_LABELS[pollParam]) {
            setShowPicker(true);
        }
    }, [pollParam]);

    const activeFriends = friends.filter((f) => f.availableStatus);
    const hasAnyFriends = friends.length > 0;

    const handleSetStatus = async (status: string) => {
        setLoading(true);
        try {
            const res = await fetch("/api/availability", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });
            if (res.ok) { setMyStatus(status); setShowPicker(false); }
        } finally { setLoading(false); }
    };

    const handleClearStatus = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/availability", { method: "DELETE" });
            if (res.ok) setMyStatus(null);
        } finally { setLoading(false); }
    };

    const handleSendPoll = async () => {
        if (pollFriendIds.size === 0) return;
        setLoading(true);
        try {
            await fetch("/api/social/poll", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ friendIds: Array.from(pollFriendIds), status: pollStatus }),
            });
            setPollSent(true);
            setTimeout(() => { setShowPoll(false); setPollSent(false); setPollFriendIds(new Set()); }, 2000);
        } finally { setLoading(false); }
    };

    const togglePollFriend = (id: string) => {
        setPollFriendIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    if (!hasAnyFriends) return null;

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] flex items-center gap-2">
                    <Users className="w-3 h-3" />
                    Your Circle
                </h2>
                {activeFriends.length > 0 && (
                    <span className="text-[10px] text-slate-500">
                        {activeFriends.length} {activeFriends.length === 1 ? "friend" : "friends"} free
                    </span>
                )}
            </div>

            <div className="bg-white/[0.03] border border-white/6 rounded-2xl p-4 space-y-4">

                {/* Friend avatar strip */}
                <div className="flex items-center gap-3 overflow-x-auto scrollbar-none pb-1">
                    {friends.slice(0, 8).map((friend) => {
                        const isActive = !!friend.availableStatus;
                        return (
                            <div key={friend.id} className="relative flex flex-col items-center gap-1.5 shrink-0">
                                <button
                                    onClick={() => setHoveredFriend(hoveredFriend === friend.id ? null : friend.id)}
                                    className="relative"
                                >
                                    <div className={cn(
                                        "w-11 h-11 rounded-full ring-2 overflow-hidden bg-slate-800 flex items-center justify-center transition-all",
                                        isActive ? "ring-primary shadow-[0_0_10px_rgba(var(--color-primary)/0.4)]" : "ring-white/10"
                                    )}>
                                        {friend.avatarUrl
                                            ? <img src={friend.avatarUrl} alt={friend.displayName ?? ""} className="w-full h-full object-cover" />
                                            : <span className="text-xs font-bold text-slate-300">{(friend.displayName ?? "?").charAt(0).toUpperCase()}</span>
                                        }
                                    </div>
                                    {isActive && (
                                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                                            className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-primary border-2 border-black flex items-center justify-center">
                                            <Zap className="w-2 h-2 text-black" />
                                        </motion.div>
                                    )}
                                </button>
                                <span className="text-[9px] text-slate-500 truncate max-w-[44px] text-center leading-none">
                                    {(friend.displayName ?? "?").split(" ")[0]}
                                </span>

                                <AnimatePresence>
                                    {hoveredFriend === friend.id && isActive && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 4, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 4, scale: 0.95 }}
                                            className="absolute -top-9 left-1/2 -translate-x-1/2 bg-slate-800 border border-white/10 rounded-lg px-2 py-1 text-[10px] font-medium text-primary whitespace-nowrap z-10 shadow-xl"
                                        >
                                            {STATUS_LABELS[friend.availableStatus!] ?? friend.availableStatus}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                    {friends.length > 8 && (
                        <div className="w-11 h-11 rounded-full ring-2 ring-white/5 bg-slate-800 flex items-center justify-center shrink-0 text-[10px] font-bold text-slate-400">
                            +{friends.length - 8}
                        </div>
                    )}
                </div>

                {/* My status row */}
                <div>
                    {myStatus ? (
                        <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-xl px-3 py-2">
                            <div className="flex items-center gap-2">
                                <Zap className="w-3.5 h-3.5 text-primary" />
                                <span className="text-xs font-bold text-primary">{STATUS_LABELS[myStatus] ?? myStatus}</span>
                            </div>
                            <button onClick={handleClearStatus} disabled={loading} className="text-primary/50 hover:text-primary/80 transition-colors">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <button
                                onClick={() => { setShowPicker(!showPicker); setShowPoll(false); }}
                                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border border-primary/30 text-primary text-xs font-bold hover:bg-primary/10 transition-colors"
                            >
                                <Zap className="w-3.5 h-3.5" />
                                I&apos;m free
                            </button>
                            <button
                                onClick={() => { setShowPoll(!showPoll); setShowPicker(false); }}
                                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border border-white/10 text-slate-400 text-xs font-bold hover:bg-white/5 transition-colors"
                            >
                                <Send className="w-3.5 h-3.5" />
                                Who&apos;s free?
                            </button>
                        </div>
                    )}

                    {/* I'm free picker */}
                    <AnimatePresence>
                        {showPicker && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                <div className="pt-3 grid grid-cols-3 gap-2">
                                    {STATUS_OPTIONS.map((opt) => (
                                        <button key={opt.value} onClick={() => handleSetStatus(opt.value)} disabled={loading}
                                            className={cn(
                                                "py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 disabled:opacity-50",
                                                myStatus === opt.value
                                                    ? "bg-primary text-black border-primary"
                                                    : "bg-white/5 text-slate-300 border-white/8 hover:bg-primary/15 hover:text-primary hover:border-primary/30"
                                            )}>
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Who's free? poll */}
                    <AnimatePresence>
                        {showPoll && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                <div className="pt-3 space-y-3">
                                    {/* Time picker */}
                                    <div className="grid grid-cols-3 gap-2">
                                        {STATUS_OPTIONS.map((opt) => (
                                            <button key={opt.value} onClick={() => setPollStatus(opt.value)}
                                                className={cn(
                                                    "py-1.5 rounded-lg text-xs font-bold border transition-all",
                                                    pollStatus === opt.value
                                                        ? "bg-white/15 text-white border-white/30"
                                                        : "bg-white/5 text-slate-400 border-white/8 hover:bg-white/10"
                                                )}>
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Friend selector */}
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Ask who?</p>
                                        <div className="flex flex-wrap gap-2">
                                            {friends.map((f) => {
                                                const selected = pollFriendIds.has(f.id);
                                                return (
                                                    <button key={f.id} onClick={() => togglePollFriend(f.id)}
                                                        className={cn(
                                                            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all",
                                                            selected ? "bg-primary/20 border-primary/40 text-primary" : "bg-white/5 border-white/8 text-slate-400 hover:bg-white/10"
                                                        )}>
                                                        <div className="w-5 h-5 rounded-full overflow-hidden bg-slate-700 shrink-0">
                                                            {f.avatarUrl ? <img src={f.avatarUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-[9px] font-bold text-slate-300 flex items-center justify-center h-full">{(f.displayName ?? "?").charAt(0)}</span>}
                                                        </div>
                                                        {(f.displayName ?? "?").split(" ")[0]}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleSendPoll}
                                        disabled={loading || pollFriendIds.size === 0}
                                        className={cn(
                                            "w-full py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2",
                                            pollSent
                                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                                : "bg-white/10 text-white hover:bg-white/15 disabled:opacity-40"
                                        )}
                                    >
                                        {pollSent ? "✓ Sent!" : (
                                            <><Send className="w-3.5 h-3.5" /> Ask {pollFriendIds.size > 0 ? `${pollFriendIds.size} friend${pollFriendIds.size > 1 ? "s" : ""}` : "friends"}</>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Drift alerts */}
            {driftFriends.length > 0 && (
                <div className="space-y-2">
                    {driftFriends.map((friend) => (
                        <motion.div key={friend.id} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
                            className="flex items-center justify-between gap-3 px-3 py-2.5 bg-white/[0.02] border border-white/5 rounded-xl">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <Avatar src={friend.avatarUrl} name={friend.displayName} size={8} />
                                <p className="text-xs text-slate-400 truncate">
                                    <span className="text-slate-300 font-medium">{(friend.displayName ?? "Someone").split(" ")[0]}</span>
                                    {" "}hasn&apos;t been in a plan with you recently
                                </p>
                            </div>
                            <a href="/discover"
                                className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold hover:bg-primary/20 transition-colors whitespace-nowrap">
                                + Plan <ArrowRight className="w-3 h-3" />
                            </a>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
