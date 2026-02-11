"use client";

import { useState } from "react";
import { Check, HelpCircle, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RsvpButtonsProps {
    hangoutId: string;
    currentStatus: "PENDING" | "GOING" | "MAYBE" | "NOT_GOING";
    onStatusChange?: (status: string) => void;
}

export function RsvpButtons({ hangoutId, currentStatus, onStatusChange }: RsvpButtonsProps) {
    const [status, setStatus] = useState(currentStatus);
    const [isUpdating, setIsUpdating] = useState<string | null>(null);

    const handleRsvp = async (newStatus: "GOING" | "MAYBE" | "NOT_GOING") => {
        if (newStatus === status) return;

        setIsUpdating(newStatus);

        try {
            const res = await fetch(`/api/hangouts/${hangoutId}/rsvp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.ok) {
                setStatus(newStatus);
                onStatusChange?.(newStatus);
            } else {
                console.error("Failed to update RSVP");
            }
        } catch (error) {
            console.error("RSVP error:", error);
        } finally {
            setIsUpdating(null);
        }
    };

    const buttons = [
        {
            status: "GOING" as const,
            label: "Going",
            icon: Check,
            activeClass: "bg-green-500/20 text-green-400 border-green-500/50",
            hoverClass: "hover:bg-green-500/10 hover:text-green-400 hover:border-green-500/30"
        },
        {
            status: "MAYBE" as const,
            label: "Maybe",
            icon: HelpCircle,
            activeClass: "bg-amber-500/20 text-amber-400 border-amber-500/50",
            hoverClass: "hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-500/30"
        },
        {
            status: "NOT_GOING" as const,
            label: "Can't",
            icon: X,
            activeClass: "bg-rose-500/20 text-rose-400 border-rose-500/50",
            hoverClass: "hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30"
        }
    ];

    return (
        <div className="flex gap-2">
            {buttons.map(btn => {
                const Icon = btn.icon;
                const isActive = status === btn.status;
                const isLoading = isUpdating === btn.status;

                return (
                    <button
                        key={btn.status}
                        onClick={() => handleRsvp(btn.status)}
                        disabled={isUpdating !== null}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium border transition-all",
                            "disabled:opacity-50 disabled:cursor-not-allowed",
                            isActive
                                ? btn.activeClass
                                : `bg-white/5 text-slate-400 border-white/10 ${btn.hoverClass}`
                        )}
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Icon className="w-4 h-4" />
                        )}
                        {btn.label}
                    </button>
                );
            })}
        </div>
    );
}
