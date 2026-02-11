"use client";

import { useState, useEffect } from "react";
import { ThumbsUp, ThumbsDown, Share2, MapPin, Star, MoreVertical, Plus, Search, Sparkles } from "lucide-react";
import { ActivitySuggestions } from "../dashboard/activity-suggestions";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

interface VotingOption {
    id: string; // The HangoutActivityOption ID
    activity: {
        id: string;
        name: string;
        category: string;
        rating: number | null;
        address: string | null;
        imageUrl: string | null;
    };
    votes: { userId: string; value: number }[]; // Simplification for now
    userVote?: number; // 1 = Yes, -1 = No, 0 = Neutral
}

interface HangoutVotingProps {
    hangoutId: string;
    options: VotingOption[];
    currentUserIds: string[];
    allowParticipantSuggestions?: boolean;
}

export function HangoutVoting({ hangoutId, options: initialOptions, allowParticipantSuggestions }: HangoutVotingProps) {
    const [options, setOptions] = useState(initialOptions);
    const [isSharing, setIsSharing] = useState(false);
    const [isSuggesting, setIsSuggesting] = useState(false);

    // Poll for updates every 5 seconds
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/hangouts/${hangoutId}/status`);
                if (res.ok) {
                    const data = await res.json();

                    // Merge new votes into existing options
                    setOptions(prevOptions => {
                        return prevOptions.map(opt => {
                            const updatedOption = data.activityOptions.find((o: any) => o.id === opt.id);
                            if (updatedOption) {
                                return {
                                    ...opt,
                                    votes: updatedOption.votes.map((v: any) => ({
                                        userId: v.profileId || v.guestId || "unknown",
                                        value: v.value
                                    }))
                                };
                            }
                            return opt;
                        });
                    });
                }
            } catch (err) {
                console.error("Polling failed", err);
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [hangoutId]);

    const handleVote = async (optionId: string, value: number) => {
        // Optimistic UI
        setOptions(prev => prev.map(opt => {
            if (opt.id === optionId) {
                return { ...opt, userVote: value };
            }
            return opt;
        }));

        try {
            await fetch(`/api/hangouts/${hangoutId}/vote`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    activityOptionId: optionId,
                    vote: value
                })
            });
        } catch (err) {
            console.error("Vote failed:", err);
            // Revert on failure
        }
    };

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        setIsSharing(true);
        setTimeout(() => setIsSharing(false), 2000);
    };

    const handleSuggestOption = async (activity: any) => {
        try {
            const res = await fetch(`/api/hangouts/${hangoutId}/options`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cachedEventId: activity.id })
            });

            if (res.ok) {
                const newOption = await res.json();
                // Add to local state
                setOptions(prev => [...prev, {
                    id: newOption.id,
                    activity: {
                        id: activity.id,
                        name: activity.title,
                        category: activity.type,
                        rating: activity.rating || null,
                        address: activity.address || null,
                        imageUrl: activity.imageUrl || null
                    },
                    votes: [],
                    userVote: 0
                }]);
                setIsSuggesting(false);
            }
        } catch (err) {
            console.error("Suggestion failed:", err);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Voting Options</h2>
                <div className="flex items-center gap-4">
                    {allowParticipantSuggestions && (
                        <button
                            onClick={() => setIsSuggesting(true)}
                            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400 hover:text-amber-300 transition-colors"
                        >
                            <Plus className="w-3 h-3" />
                            Suggest
                        </button>
                    )}
                    <button
                        onClick={handleShare}
                        className="flex items-center gap-2 text-xs font-medium text-violet-300 hover:text-white transition-colors"
                    >
                        <Share2 className="w-4 h-4" />
                        {isSharing ? "Link Copied!" : "Share Invite"}
                    </button>
                </div>
            </div>

            {/* Suggestions Search Module */}
            <AnimatePresence>
                {isSuggesting && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="bg-slate-900 border border-violet-500/20 rounded-2xl p-4 mb-6">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-xs font-bold text-violet-300 uppercase tracking-widest flex items-center gap-2">
                                    <Sparkles className="w-3 h-3" />
                                    Suggest something else
                                </span>
                                <button onClick={() => setIsSuggesting(false)} className="text-slate-500 hover:text-white">
                                    Cancel
                                </button>
                            </div>
                            <ActivitySuggestions
                                hasFriendsSelected={true}
                                onSelectCallback={handleSuggestOption}
                                selectedActivityIds={options.map(o => o.activity.id)}
                                isMultiSelect={false}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="space-y-4">
                {options.map((option) => (
                    <motion.div
                        key={option.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                            "group relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/40 backdrop-blur-md transition-all duration-300",
                            option.userVote === 1 ? "border-violet-500/30 bg-violet-900/10" : "hover:bg-slate-900/60"
                        )}
                    >
                        <div className="flex gap-4 p-4">
                            {/* Image / Icon Placeholder */}
                            <div className="w-20 h-20 rounded-xl bg-slate-800 shrink-0 flex items-center justify-center border border-white/10 text-slate-600">
                                <MapPin className="w-8 h-8" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="font-semibold text-slate-200 truncate pr-2">{option.activity.name}</h3>
                                    {option.activity.rating && (
                                        <div className="flex items-center gap-1 text-amber-400 text-xs font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">
                                            <Star className="w-3 h-3 fill-current" />
                                            {option.activity.rating}
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-slate-400 mb-3 truncate">{option.activity.address}</p>

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => handleVote(option.id, 1)}
                                        className={cn(
                                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                                            option.userVote === 1
                                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                                : "bg-white/5 text-slate-400 border-white/5 hover:bg-emerald-500/10 hover:text-emerald-200"
                                        )}
                                    >
                                        <ThumbsUp className="w-3.5 h-3.5" />
                                        Yes ({option.votes.length + (option.userVote === 1 ? 1 : 0)}) {/* Simplified logic */}
                                    </button>
                                    <button
                                        onClick={() => handleVote(option.id, -1)}
                                        className={cn(
                                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                                            option.userVote === -1
                                                ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                                                : "bg-white/5 text-slate-400 border-white/5 hover:bg-rose-500/10 hover:text-rose-200"
                                        )}
                                    >
                                        <ThumbsDown className="w-3.5 h-3.5" />
                                        No
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
