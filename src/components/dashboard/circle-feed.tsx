"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, X, Zap, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

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

function Avatar({ src, name, size = 10 }: { src?: string | null; name?: string | null; size?: number }) {
    const initials = (name ?? "?").charAt(0).toUpperCase();
    return (
        <div className={cn(`w-${size} h-${size} rounded-full overflow-hidden bg-slate-800 flex items-center justify-center shrink-0`)}>
            {src ? (
                <img src={src} alt={name ?? ""} className="w-full h-full object-cover" />
            ) : (
                <span className="text-xs font-bold text-slate-300">{initials}</span>
            )}
        </div>
    );
}

export function CircleFeed({ friends, driftFriends, initialMyStatus }: CircleFeedProps) {
    const [myStatus, setMyStatus] = useState<string | null>(initialMyStatus);
    const [showPicker, setShowPicker] = useState(false);
    const [hoveredFriend, setHoveredFriend] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

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
            if (res.ok) {
                setMyStatus(status);
                setShowPicker(false);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleClearStatus = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/availability", { method: "DELETE" });
            if (res.ok) setMyStatus(null);
        } finally {
            setLoading(false);
        }
    };

    if (!hasAnyFriends) return null;

    return (
        <div className="space-y-3">
            {/* Section header */}
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

            {/* Availability strip */}
            <div className="bg-white/[0.03] border border-white/6 rounded-2xl p-4 space-y-4">

                {/* Friend avatars */}
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
                                        isActive
                                            ? "ring-primary shadow-[0_0_10px_rgba(var(--color-primary)/0.4)]"
                                            : "ring-white/10"
                                    )}>
                                        {friend.avatarUrl ? (
                                            <img src={friend.avatarUrl} alt={friend.displayName ?? ""} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-xs font-bold text-slate-300">
                                                {(friend.displayName ?? "?").charAt(0).toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                    {isActive && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-primary border-2 border-black flex items-center justify-center"
                                        >
                                            <Zap className="w-2 h-2 text-black" />
                                        </motion.div>
                                    )}
                                </button>
                                <span className="text-[9px] text-slate-500 truncate max-w-[44px] text-center leading-none">
                                    {(friend.displayName ?? "?").split(" ")[0]}
                                </span>

                                {/* Status tooltip */}
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

                    {/* More friends indicator */}
                    {friends.length > 8 && (
                        <div className="w-11 h-11 rounded-full ring-2 ring-white/5 bg-slate-800 flex items-center justify-center shrink-0 text-[10px] font-bold text-slate-400">
                            +{friends.length - 8}
                        </div>
                    )}
                </div>

                {/* My status / I'm free button */}
                <div>
                    {myStatus ? (
                        <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-xl px-3 py-2">
                            <div className="flex items-center gap-2">
                                <Zap className="w-3.5 h-3.5 text-primary" />
                                <span className="text-xs font-bold text-primary">
                                    {STATUS_LABELS[myStatus] ?? myStatus}
                                </span>
                            </div>
                            <button
                                onClick={handleClearStatus}
                                disabled={loading}
                                className="text-primary/50 hover:text-primary/80 transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowPicker(!showPicker)}
                            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-primary/30 text-primary text-xs font-bold hover:bg-primary/10 transition-colors"
                        >
                            <Zap className="w-3.5 h-3.5" />
                            I&apos;m free —
                            <span className="text-primary/70">let friends know</span>
                        </button>
                    )}

                    {/* Status picker */}
                    <AnimatePresence>
                        {showPicker && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="pt-3 grid grid-cols-3 gap-2">
                                    {STATUS_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => handleSetStatus(opt.value)}
                                            disabled={loading}
                                            className={cn(
                                                "py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 disabled:opacity-50",
                                                myStatus === opt.value
                                                    ? "bg-primary text-black border-primary"
                                                    : "bg-white/5 text-slate-300 border-white/8 hover:bg-primary/15 hover:text-primary hover:border-primary/30"
                                            )}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
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
                        <motion.div
                            key={friend.id}
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center justify-between gap-3 px-3 py-2.5 bg-white/[0.02] border border-white/5 rounded-xl"
                        >
                            <div className="flex items-center gap-2.5 min-w-0">
                                <Avatar src={friend.avatarUrl} name={friend.displayName} size={8} />
                                <p className="text-xs text-slate-400 truncate">
                                    <span className="text-slate-300 font-medium">{(friend.displayName ?? "Someone").split(" ")[0]}</span>
                                    {" "}hasn&apos;t been in a plan with you recently
                                </p>
                            </div>
                            <a
                                href="/discover"
                                className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold hover:bg-primary/20 transition-colors whitespace-nowrap"
                            >
                                + Plan
                                <ArrowRight className="w-3 h-3" />
                            </a>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
