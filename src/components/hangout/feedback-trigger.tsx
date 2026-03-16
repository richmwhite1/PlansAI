"use client";

import { useState, useEffect } from "react";
import { Star, MessageSquare } from "lucide-react";
import { FeedbackModal } from "./feedback-modal";

interface FeedbackTriggerProps {
    hangoutId: string;
    hangoutTitle: string;
    hasFeedback: boolean;
    isPast: boolean;
    isParticipant: boolean;
}

export function FeedbackTrigger({ hangoutId, hangoutTitle, hasFeedback, isPast, isParticipant }: FeedbackTriggerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [done, setDone] = useState(hasFeedback);

    // Auto-open 1.5 s after landing so the user sees the page first
    useEffect(() => {
        if (!isParticipant || done || !isPast) return;
        const t = setTimeout(() => setIsOpen(true), 1500);
        return () => clearTimeout(t);
    }, [isParticipant, done, isPast]);

    if (!isParticipant || done || !isPast) return null;

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="w-full text-left glass p-5 rounded-2xl border border-primary/30 bg-primary/5 relative overflow-hidden group hover:bg-primary/8 transition-colors"
            >
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                        <Star className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white">How was it?</p>
                        <p className="text-xs text-slate-400">Rate this hangout · 30 seconds</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-xl w-fit shadow-lg shadow-primary/20">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Leave feedback
                </div>
            </button>

            <FeedbackModal
                hangoutId={hangoutId}
                hangoutTitle={hangoutTitle}
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                onComplete={() => setDone(true)}
            />
        </>
    );
}
