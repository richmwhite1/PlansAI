"use client";

import { useState } from "react";
import { Check, HelpCircle, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RsvpButtonsProps {
    hangoutId: string;
    currentStatus: "PENDING" | "GOING" | "MAYBE" | "NOT_GOING";
    onStatusChange?: (status: string) => void;
    variant?: "default" | "hero";
}

export function RsvpButtons({ hangoutId, currentStatus, onStatusChange, variant = "default" }: RsvpButtonsProps) {
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
            activeClass: variant === "hero" 
                ? "bg-emerald-500/80 text-white border-emerald-500/50" 
                : "bg-emerald-500 text-white border-b-emerald-700",
            hoverClass: variant === "hero"
                ? "hover:bg-emerald-500/20 hover:text-emerald-400 border-emerald-500/20"
                : "hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/50"
        },
        {
            status: "MAYBE" as const,
            label: "Maybe",
            icon: HelpCircle,
            activeClass: variant === "hero"
                ? "bg-amber-500/80 text-white border-amber-500/50"
                : "bg-amber-500 text-white border-b-amber-700",
            hoverClass: variant === "hero"
                ? "hover:bg-amber-500/20 hover:text-amber-400 border-amber-500/20"
                : "hover:bg-amber-500/10 hover:text-amber-500 hover:border-amber-500/50"
        },
        {
            status: "NOT_GOING" as const,
            label: "Can't",
            icon: X,
            activeClass: variant === "hero"
                ? "bg-rose-500/80 text-white border-rose-500/50"
                : "bg-rose-500 text-white border-b-rose-700",
            hoverClass: variant === "hero"
                ? "hover:bg-rose-500/20 hover:text-rose-400 border-rose-500/20"
                : "hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/50"
        }
    ];

    return (
        <div className={cn("flex gap-2", variant === "hero" && "bg-black/20 backdrop-blur-md p-1 rounded-2xl border border-white/10 shadow-2xl")}>
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
                            "flex-1 flex items-center justify-center gap-2 transition-all transition-colors duration-200",
                            variant === "hero" 
                                ? "py-2 px-4 rounded-xl text-xs font-black uppercase tracking-widest border"
                                : "py-3 px-4 rounded-xl text-sm font-bold border-b-4 active:border-b-0 active:translate-y-1 duration-75",
                            "disabled:opacity-50 disabled:cursor-not-allowed",
                            isActive
                                ? btn.activeClass
                                : variant === "hero"
                                    ? `bg-transparent border-transparent text-white/40 ${btn.hoverClass}`
                                    : `bg-card border-muted-foreground/20 text-muted-foreground hover:bg-muted/50 ${btn.hoverClass}`
                        )}
                    >
                        {isLoading ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                            <Icon className={cn(variant === "hero" ? "w-3.5 h-3.5" : "w-4 h-4")} />
                        )}
                        {btn.label}
                    </button>
                );
            })}
        </div>
    );
}
