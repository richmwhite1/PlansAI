"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Friend {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
}

interface CreatePulseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (pulseId: string, friendCount: number) => void;
}

const TIME_OPTIONS = [
    { value: "TONIGHT", label: "Tonight" },
    { value: "TOMORROW", label: "Tomorrow" },
    { value: "THIS_WEEKEND", label: "This Weekend" },
    { value: "NEXT_WEEK", label: "Next Week" },
];

export function CreatePulseModal({ isOpen, onClose, onSuccess }: CreatePulseModalProps) {
    const [targetTime, setTargetTime] = useState<string>("TONIGHT");
    const [message, setMessage] = useState("");
    const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());
    const [friends, setFriends] = useState<Friend[]>([]);
    const [loadingFriends, setLoadingFriends] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Fetch friends when modal opens
    useEffect(() => {
        if (!isOpen || friends.length > 0) return;
        setLoadingFriends(true);
        fetch("/api/friends")
            .then((r) => r.json())
            .then((data) => {
                const list: Friend[] = (data.friends ?? data ?? []).map((f: any) => ({
                    id: f.id,
                    displayName: f.displayName,
                    avatarUrl: f.avatarUrl,
                }));
                setFriends(list);
            })
            .catch(() => toast.error("Could not load friends"))
            .finally(() => setLoadingFriends(false));
    }, [isOpen, friends.length]);

    const toggleFriend = (id: string) => {
        setSelectedFriendIds((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const handleSelectAll = () => {
        if (selectedFriendIds.size === friends.length) {
            setSelectedFriendIds(new Set());
        } else {
            setSelectedFriendIds(new Set(friends.map((f) => f.id)));
        }
    };

    const handleSubmit = async () => {
        if (selectedFriendIds.size === 0) {
            toast.error("Select at least one friend to send a pulse to");
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch("/api/pulse", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    targetTime,
                    message: message.trim() || undefined,
                    friendIds: Array.from(selectedFriendIds),
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                toast.error(err.error ?? "Failed to send pulse");
                return;
            }

            const data = await res.json();
            toast.success(`Pulse sent to ${selectedFriendIds.size} friend${selectedFriendIds.size > 1 ? "s" : ""}!`);
            onSuccess?.(data.pulseId, selectedFriendIds.size);
            onClose();

            // Reset
            setTargetTime("TONIGHT");
            setMessage("");
            setSelectedFriendIds(new Set());
        } catch {
            toast.error("Something went wrong. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                    />

                    {/* Sheet / Modal */}
                    <motion.div
                        initial={{ y: "100%", opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: "100%", opacity: 0 }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 z-50 md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md"
                    >
                        <div className="bg-zinc-900 border border-zinc-800 rounded-t-3xl md:rounded-3xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-bold text-white">Who&apos;s free?</h2>
                                    <p className="text-xs text-slate-500">Send a quick pulse to your friends</p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Time selector */}
                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">When?</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {TIME_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setTargetTime(opt.value)}
                                            className={cn(
                                                "py-2.5 rounded-xl text-sm font-bold border transition-all",
                                                targetTime === opt.value
                                                    ? "bg-primary text-black border-primary"
                                                    : "bg-white/5 text-slate-300 border-white/8 hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                                            )}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Message */}
                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">Message (optional)</p>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Any ideas? e.g. 'thinking rooftop drinks'"
                                    rows={2}
                                    maxLength={200}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50 resize-none"
                                />
                            </div>

                            {/* Friend selector */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">
                                        Send to
                                    </p>
                                    {friends.length > 0 && (
                                        <button
                                            onClick={handleSelectAll}
                                            className="text-[10px] text-primary/70 hover:text-primary transition-colors font-bold uppercase tracking-wider"
                                        >
                                            {selectedFriendIds.size === friends.length ? "Deselect all" : "Select all"}
                                        </button>
                                    )}
                                </div>

                                {loadingFriends ? (
                                    <div className="flex items-center justify-center py-6">
                                        <div className="w-5 h-5 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                                    </div>
                                ) : friends.length === 0 ? (
                                    <p className="text-sm text-slate-500 py-3">No friends yet. Add friends to send a pulse.</p>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {friends.map((f) => {
                                            const selected = selectedFriendIds.has(f.id);
                                            const firstName = (f.displayName ?? "?").split(" ")[0];
                                            return (
                                                <button
                                                    key={f.id}
                                                    onClick={() => toggleFriend(f.id)}
                                                    className={cn(
                                                        "flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all",
                                                        selected
                                                            ? "bg-primary/20 border-primary/40 text-primary"
                                                            : "bg-zinc-800 border-zinc-700 text-slate-400 hover:bg-zinc-700"
                                                    )}
                                                >
                                                    <div className="w-5 h-5 rounded-full overflow-hidden bg-zinc-700 shrink-0 flex items-center justify-center">
                                                        {f.avatarUrl ? (
                                                            <img src={f.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-[9px] font-bold text-slate-300">
                                                                {firstName.charAt(0).toUpperCase()}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {firstName}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Submit */}
                            <button
                                onClick={handleSubmit}
                                disabled={submitting || selectedFriendIds.size === 0}
                                className={cn(
                                    "w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all",
                                    selectedFriendIds.size > 0
                                        ? "bg-primary text-black hover:bg-primary/90"
                                        : "bg-zinc-800 text-zinc-600 cursor-not-allowed",
                                    "disabled:opacity-60"
                                )}
                            >
                                <Send className="w-4 h-4" />
                                {submitting
                                    ? "Sending..."
                                    : selectedFriendIds.size > 0
                                    ? `Send to ${selectedFriendIds.size} friend${selectedFriendIds.size > 1 ? "s" : ""}`
                                    : "Select friends first"}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
