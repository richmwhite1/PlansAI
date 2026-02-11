"use client";

import { useState } from "react";
import { Clock, Check, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface TimeOption {
    id: string;
    startTime: string;
    endTime: string | null;
    votes: { userId: string; value: number }[];
}

interface TimeVotingProps {
    hangoutId: string;
    options: TimeOption[];
    isParticipant: boolean;
}

export function TimeVoting({ hangoutId, options, isParticipant }: TimeVotingProps) {
    const [votes, setVotes] = useState<Record<string, number>>({}); // optionId -> value

    // Calculate Best Time
    const bestTime = options.reduce((best, curr) => {
        const currScore = curr.votes.length;
        if (!best || currScore > (best.votes?.length || 0)) return curr;
        return best;
    }, options[0]);

    const handleVote = async (optionId: string) => {
        if (!isParticipant) return;

        // Toggle vote
        const newValue = votes[optionId] === 1 ? 0 : 1;
        setVotes({ ...votes, [optionId]: newValue });

        try {
            // Need a time voting API
            await fetch(`/api/hangouts/${hangoutId}/time-vote`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ timeOptionId: optionId, value: newValue })
            });
        } catch (err) {
            console.error("Time vote failed");
        }
    };

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-violet-400" />
                When works best?
            </h2>

            <div className="grid gap-2">
                {options.map((option) => {
                    const isBest = option.id === bestTime?.id && option.votes.length > 0;
                    return (
                        <button
                            key={option.id}
                            onClick={() => handleVote(option.id)}
                            disabled={!isParticipant}
                            className={cn(
                                "flex items-center justify-between p-4 rounded-xl border transition-all text-left",
                                votes[option.id] === 1
                                    ? "bg-violet-600/20 border-violet-500/50 text-white"
                                    : "bg-white/5 border-white/5 text-slate-400 hover:border-white/10"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "w-5 h-5 rounded-full border flex items-center justify-center",
                                    votes[option.id] === 1 ? "bg-violet-500 border-violet-400" : "border-slate-700"
                                )}>
                                    {votes[option.id] === 1 && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <div>
                                    <p className="font-medium text-sm">
                                        {format(new Date(option.startTime), "EEE, MMM do @ h:mm a")}
                                    </p>
                                    <p className="text-[10px] text-slate-500">
                                        {option.votes.length} people available
                                    </p>
                                </div>
                            </div>

                            {isBest && (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-violet-500/10 text-violet-400 rounded-full border border-violet-500/20 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                                    <Sparkles className="w-3 h-3" />
                                    AI Recommended
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
