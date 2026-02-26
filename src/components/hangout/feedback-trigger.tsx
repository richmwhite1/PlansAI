"use client";

import { useState } from "react";
import { Zap, MessageSquare } from "lucide-react";
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

    if (!isParticipant || hasFeedback || !isPast) return null;

    return (
        <>
            <div className="glass p-6 rounded-2xl border border-primary/30 bg-primary/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Zap className="w-12 h-12 text-primary" />
                </div>

                <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-primary" />
                    How was the Activity?
                </h2>
                <p className="text-sm text-slate-400 mb-4 max-w-md">
                    The hangout is over! Share your reflections to help us personalize your future plans.
                </p>

                <button
                    onClick={() => setIsOpen(true)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl transition-all shadow-lg shadow-primary/20 active:scale-95"
                >
                    <MessageSquare className="w-4 h-4" />
                    Give Feedback
                </button>
            </div>

            <FeedbackModal
                hangoutId={hangoutId}
                hangoutTitle={hangoutTitle}
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
            />
        </>
    );
}
