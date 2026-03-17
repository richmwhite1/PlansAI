"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, MessageCircle, ArrowRight, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface InviteModalProps {
    isOpen: boolean;
    onClose: () => void;
    inviteUrl: string;
    hangoutTitle?: string;
    guests: { name: string; phone?: string }[];
    onDone: () => void;
    hangoutId?: string;
}

export function InviteModal({
    isOpen,
    onClose,
    inviteUrl,
    hangoutTitle,
    guests,
    onDone,
    hangoutId,
}: InviteModalProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(inviteUrl);
            setCopied(true);
            toast.success("Link copied!");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("Failed to copy link");
        }
    };

    const buildInviteMessage = (guestName?: string) => {
        const greeting = guestName ? `Hey ${guestName}! ` : "";
        const title = hangoutTitle ? `"${hangoutTitle}"` : "a plan";
        return `${greeting}You're invited to ${title} on Plans — vote on the activity, RSVP, and save it to your calendar:\n${inviteUrl}`;
    };

    const handleShareGuest = (guestName: string) => {
        const text = buildInviteMessage(guestName);
        if (navigator.share) {
            navigator
                .share({ title: hangoutTitle ?? "You're invited!", text, url: inviteUrl })
                .catch(() => {
                    window.location.href = `sms:?body=${encodeURIComponent(text)}`;
                });
        } else {
            window.location.href = `sms:?body=${encodeURIComponent(text)}`;
        }
    };

    const handleShareLink = () => {
        const text = buildInviteMessage();
        if (navigator.share) {
            navigator
                .share({ title: hangoutTitle ?? "You're invited!", text, url: inviteUrl })
                .catch(() => handleCopy());
        } else {
            handleCopy();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-md bg-slate-900 border border-primary/20 rounded-2xl shadow-xl overflow-hidden pointer-events-auto relative"
                        >
                            <div className="p-6 space-y-6">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <h2 className="text-xl font-bold text-white">Invite Guests</h2>
                                        <p className="text-sm text-slate-400">
                                            These friends aren&apos;t on Plans yet. Text them the link!
                                        </p>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="p-1 text-slate-500 hover:text-white transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Per-guest invite buttons */}
                                {guests.length > 0 && (
                                    <div className="space-y-2">
                                        {guests.map((guest, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5"
                                            >
                                                <span className="font-medium text-slate-200">{guest.name}</span>
                                                <button
                                                    onClick={() => handleShareGuest(guest.name)}
                                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary text-sm font-medium transition-colors border border-primary/30"
                                                >
                                                    <MessageCircle className="w-3.5 h-3.5" />
                                                    Invite
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Share link */}
                                <div className="space-y-3 pt-2 border-t border-white/10">
                                    {/* Native share / copy */}
                                    <button
                                        onClick={handleShareLink}
                                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-slate-300 text-sm font-semibold transition-colors"
                                    >
                                        <Share2 className="w-4 h-4" />
                                        Share invite link
                                    </button>

                                    {/* Manual copy fallback */}
                                    <div className="flex bg-black/30 rounded-lg border border-white/5 overflow-hidden">
                                        <div className="flex-1 px-3 py-2 text-xs text-slate-500 truncate font-mono select-all">
                                            {inviteUrl}
                                        </div>
                                        <button
                                            onClick={handleCopy}
                                            className="px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-300 border-l border-white/5 transition-colors"
                                        >
                                            {copied ? (
                                                <Check className="w-4 h-4 text-green-400" />
                                            ) : (
                                                <Copy className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-600 text-center">
                                        Anyone with this link can vote, RSVP, and save to their calendar — no account needed
                                    </p>
                                </div>

                                <div className="space-y-3 pt-4">
                                    <button
                                        onClick={onDone}
                                        className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                                    >
                                        Done <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
