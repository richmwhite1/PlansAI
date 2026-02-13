"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, MessageCircle, ArrowRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface InviteModalProps {
    isOpen: boolean;
    onClose: () => void;
    inviteUrl: string;
    guests: { name: string; phone?: string }[];
    onDone: () => void;
}

export function InviteModal({ isOpen, onClose, inviteUrl, guests, onDone }: InviteModalProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(inviteUrl);
            setCopied(true);
            toast.success("Link copied!");
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            toast.error("Failed to copy link");
        }
    };

    const handleTextGuest = (guestName: string) => {
        const body = `Hey ${guestName}! Join our plan here: ${inviteUrl}`;
        // Try native share first if it's mobile-friendly or just use sms:
        if (navigator.share) {
            navigator.share({
                title: 'Join our plan!',
                text: body,
                url: inviteUrl
            }).catch(() => {
                window.location.href = `sms:?body=${encodeURIComponent(body)}`;
            });
        } else {
            window.location.href = `sms:?body=${encodeURIComponent(body)}`;
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
                            className="w-full max-w-md bg-slate-900 border border-violet-500/20 rounded-2xl shadow-xl overflow-hidden pointer-events-auto relative"
                        >
                            <div className="p-6 space-y-6">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <h2 className="text-xl font-bold text-white">Invite Guests</h2>
                                        <p className="text-sm text-slate-400">
                                            These friends aren't on Plans yet. Text them the link!
                                        </p>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="p-1 text-slate-500 hover:text-white transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {guests.map((guest, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5"
                                        >
                                            <span className="font-medium text-slate-200">{guest.name}</span>
                                            <button
                                                onClick={() => handleTextGuest(guest.name)}
                                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 text-sm font-medium transition-colors border border-green-500/30"
                                            >
                                                <MessageCircle className="w-3.5 h-3.5" />
                                                Text Invite
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-3 pt-4 border-t border-white/10">
                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Or copy link manually
                                    </p>
                                    <div className="flex bg-black/30 rounded-lg border border-white/5 overflow-hidden">
                                        <div className="flex-1 px-3 py-2 text-sm text-slate-400 truncate font-mono select-all">
                                            {inviteUrl}
                                        </div>
                                        <button
                                            onClick={handleCopy}
                                            className="px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-300 border-l border-white/5 transition-colors"
                                        >
                                            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-4">
                                    <button
                                        onClick={onDone}
                                        className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-900/20"
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
