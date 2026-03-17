"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";

type Answer = "YES" | "MAYBE" | "NO";

interface PulseResponseButtonsProps {
    pulseId: string;
    initialAnswer?: Answer;
}

export function PulseResponseButtons({ pulseId, initialAnswer }: PulseResponseButtonsProps) {
    const [selected, setSelected] = useState<Answer | null>(initialAnswer ?? null);
    const [loading, setLoading] = useState(false);
    const [hangoutSlug, setHangoutSlug] = useState<string | null>(null);

    const handleAnswer = async (answer: Answer) => {
        if (loading) return;
        const previous = selected;
        setSelected(answer); // optimistic
        setLoading(true);

        try {
            const res = await fetch(`/api/pulse/${pulseId}/respond`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ answer }),
            });

            if (!res.ok) {
                setSelected(previous);
                toast.error("Could not save your response. Please try again.");
                return;
            }

            const data = await res.json();

            if (data.graduated && data.hangoutSlug) {
                setHangoutSlug(data.hangoutSlug);
                toast.success("Your plans are happening! A plan has been created.", {
                    action: {
                        label: "View plan",
                        onClick: () => {
                            window.location.href = `/hangouts/${data.hangoutSlug}`;
                        },
                    },
                });
            } else {
                const label = answer === "YES" ? "You said YES!" : answer === "MAYBE" ? "Marked as maybe" : "Noted — maybe next time";
                toast.success(label);
            }
        } catch {
            setSelected(previous);
            toast.error("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const buttons: { answer: Answer; label: string; activeClass: string; inactiveClass: string }[] = [
        {
            answer: "YES",
            label: "YES",
            activeClass: "bg-lime-500 border-lime-500 text-black shadow-[0_0_16px_rgba(132,204,22,0.4)]",
            inactiveClass: "border-lime-500/40 text-lime-400 hover:border-lime-500/70 hover:bg-lime-500/10",
        },
        {
            answer: "MAYBE",
            label: "MAYBE",
            activeClass: "bg-amber-500 border-amber-500 text-black shadow-[0_0_16px_rgba(245,158,11,0.4)]",
            inactiveClass: "border-amber-500/40 text-amber-400 hover:border-amber-500/70 hover:bg-amber-500/10",
        },
        {
            answer: "NO",
            label: "NO",
            activeClass: "bg-zinc-500 border-zinc-500 text-white",
            inactiveClass: "border-zinc-600 text-zinc-400 hover:border-zinc-500 hover:bg-zinc-800",
        },
    ];

    return (
        <div className="space-y-4">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">
                Are you in?
            </p>

            <div className="flex gap-3">
                {buttons.map(({ answer, label, activeClass, inactiveClass }) => {
                    const isSelected = selected === answer;
                    return (
                        <motion.button
                            key={answer}
                            onClick={() => handleAnswer(answer)}
                            disabled={loading}
                            whileTap={{ scale: 0.94 }}
                            animate={isSelected ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                            transition={{ duration: 0.2 }}
                            className={cn(
                                "flex-1 py-4 rounded-2xl border-2 font-black text-sm tracking-wider transition-all duration-200 disabled:opacity-60",
                                isSelected ? activeClass : inactiveClass
                            )}
                        >
                            {label}
                        </motion.button>
                    );
                })}
            </div>

            {hangoutSlug && (
                <Link
                    href={`/hangouts/${hangoutSlug}`}
                    className="block w-full text-center py-3 rounded-2xl bg-primary text-black font-bold text-sm hover:bg-primary/90 transition-colors"
                >
                    View the plan →
                </Link>
            )}
        </div>
    );
}
