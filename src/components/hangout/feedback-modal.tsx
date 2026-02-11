"use client";

import { useState } from "react";
import { Star, Loader2, Sparkles, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface FeedbackModalProps {
    hangoutId: string;
    hangoutTitle: string;
    isOpen: boolean;
    onClose: () => void;
}

export function FeedbackModal({ hangoutId, hangoutTitle, isOpen, onClose }: FeedbackModalProps) {
    const [reflection, setReflection] = useState("");
    const [rating, setRating] = useState<number>(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [extracted, setExtracted] = useState<{ vibes: string[], keywords: string[], summary: string } | null>(null);

    const handleSubmit = async () => {
        if (!reflection) return;
        setIsSubmitting(true);

        try {
            const res = await fetch(`/api/hangouts/${hangoutId}/feedback`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reflection, rating })
            });

            if (res.ok) {
                const data = await res.json();
                setExtracted(data.extracted);
            }
        } catch (err) {
            console.error("Feedback submission failed:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            >
                {extracted ? (
                    <div className="p-8 text-center space-y-6">
                        <div className="w-16 h-16 bg-violet-500/20 rounded-full flex items-center justify-center mx-auto">
                            <Sparkles className="w-8 h-8 text-violet-400" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-white">Vibe Analyzed!</h2>
                            <p className="text-slate-400 italic">"{extracted.summary}"</p>
                        </div>

                        <div className="flex flex-wrap justify-center gap-2">
                            {extracted.vibes.map(v => (
                                <span key={v} className="px-3 py-1 bg-violet-500/10 text-violet-300 rounded-full border border-violet-500/20 text-xs font-medium">
                                    {v}
                                </span>
                            ))}
                        </div>

                        <button
                            onClick={onClose}
                            className="w-full py-3 bg-white text-slate-950 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                        >
                            Got it
                        </button>
                    </div>
                ) : (
                    <div className="p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white">How was {hangoutTitle}?</h2>
                            <button onClick={onClose} className="p-1 text-slate-500 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <p className="text-sm text-slate-400">
                            Tell us what you liked (or didn't). AI will use this to improve your future suggestions.
                        </p>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Reflection</label>
                            <textarea
                                value={reflection}
                                onChange={(e) => setReflection(e.target.value)}
                                placeholder="E.g. The sushi was incredible and the vibe was super chill. Loved the outdoor seating."
                                className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 text-slate-200 placeholder:text-slate-600 focus:border-violet-500/50 outline-none transition-colors resize-none"
                            />
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-center gap-2">
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => setRating(s)}
                                        className="p-1 transition-transform hover:scale-110"
                                    >
                                        <Star
                                            className={cn(
                                                "w-8 h-8",
                                                s <= rating ? "fill-amber-400 text-amber-400" : "text-slate-700"
                                            )}
                                        />
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || !reflection}
                                className="w-full py-4 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-2xl transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Analyzing Vibe...
                                    </>
                                ) : (
                                    "Save Reflection"
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
