"use client";

import { useRouter } from "next/navigation";

import { useState, useEffect } from "react";
import { ThumbsUp, ThumbsDown, Share2, MapPin, Star, MoreVertical, Plus, Search, Sparkles } from "lucide-react";
import { ShareButton } from "./share-button";
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
    votingEndsAt?: Date | string | null;
    isCreator?: boolean;
    initialThreshold?: number;
    totalParticipants: number;
}

export function HangoutVoting({
    hangoutId,
    options: initialOptions,
    allowParticipantSuggestions,
    votingEndsAt,
    isCreator,
    initialThreshold = 60,
    totalParticipants
}: HangoutVotingProps) {
    const router = useRouter();
    const [options, setOptions] = useState(initialOptions);
    const [isSharing, setIsSharing] = useState(false);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [consensusThreshold, setConsensusThreshold] = useState(initialThreshold);
    const [isFinalizing, setIsFinalizing] = useState(false);

    // Poll for updates every 5 seconds
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/hangouts/${hangoutId}/status`);
                if (res.ok) {
                    const data = await res.json();

                    if (data.status === "CONFIRMED") {
                        router.refresh();
                        return; // Stop processing updates if confirmed
                    }

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

    // Check if any option meets consensus when options or threshold changes
    useEffect(() => {
        if (!isCreator || isFinalizing) return;

        const checkConsensus = async () => {
            const winner = options.find(opt => {
                const yesVotes = opt.votes.filter(v => v.value === 1).length;
                const percentage = (yesVotes / totalParticipants) * 100;
                return percentage >= consensusThreshold;
            });

            if (winner) {
                setIsFinalizing(true);
                try {
                    // Reusing end-voting endpoint which picks the current leader
                    // In this case, the 'winner' we found IS a leader meeting the threshold.
                    const res = await fetch(`/api/hangouts/${hangoutId}/end-voting`, { method: "POST" });
                    if (res.ok) {
                        router.refresh();
                    }
                } catch (err) {
                    console.error("Auto-finalization failed:", err);
                    setIsFinalizing(false);
                }
            }
        };

        checkConsensus();
    }, [options, consensusThreshold, isCreator, isFinalizing, totalParticipants, hangoutId]);

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

    const handleThresholdChange = async (val: number) => {
        setConsensusThreshold(val);
        // Persist threshold change
        try {
            await fetch(`/api/hangouts/${hangoutId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ consensusThreshold: val })
            });
        } catch (err) {
            console.error("Failed to save threshold:", err);
        }
    };

    // Consolidate share logic to the main ShareButton component

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
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">Voting Options</h2>
                        {votingEndsAt && (
                            <p className="text-xs text-muted-foreground mt-1">
                                Voting ends: {format(new Date(votingEndsAt), "MMM d, h:mm a")}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        {isCreator && (
                            <EndVotingButton hangoutId={hangoutId} />
                        )}
                        {allowParticipantSuggestions && (
                            <button
                                onClick={() => setIsSuggesting(true)}
                                className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary hover:text-primary/80 transition-colors"
                            >
                                <Plus className="w-3 h-3" />
                                Suggest
                            </button>
                        )}
                    </div>
                </div>

                {/* Organizer Consensus Slider */}
                {isCreator && (
                    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                                <Sparkles className="w-3 h-3" />
                                Consensus Threshold
                            </label>
                            <span className="text-sm font-bold text-primary">{consensusThreshold}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={consensusThreshold}
                            onChange={(e) => handleThresholdChange(parseInt(e.target.value))}
                            className="w-full h-1.5 bg-primary/20 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <p className="text-[10px] text-primary/60">
                            Lower the threshold to finalize the plan when enough people agree.
                            Current: {Math.ceil((consensusThreshold / 100) * totalParticipants)} / {totalParticipants} "Yes" votes.
                        </p>
                    </div>
                )}
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
                        <div className="bg-card border border-primary/20 rounded-2xl p-4 mb-6">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                                    <Sparkles className="w-3 h-3" />
                                    Suggest something else
                                </span>
                                <button onClick={() => setIsSuggesting(false)} className="text-muted-foreground hover:text-foreground">
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
                {options.map((option) => {
                    const yesVotes = option.votes.filter(v => v.value === 1).length;
                    const percentage = Math.round((yesVotes / totalParticipants) * 100);
                    const meetsConsensus = percentage >= consensusThreshold;

                    return (
                        <motion.div
                            key={option.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                                "group relative overflow-hidden rounded-2xl border border-white/5 bg-card/40 backdrop-blur-md transition-all duration-300",
                                option.userVote === 1 ? "border-primary/30 bg-primary/10" : "hover:bg-card/60",
                                meetsConsensus && isCreator && "border-emerald-500/50 bg-emerald-500/5"
                            )}
                        >
                            <div className="flex gap-4 p-4 pb-2">
                                {/* Image / Icon Placeholder */}
                                <div className="w-20 h-20 rounded-xl bg-muted/50 shrink-0 flex items-center justify-center border border-white/10 text-muted-foreground">
                                    <MapPin className="w-8 h-8" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="font-semibold text-foreground truncate pr-2">{option.activity.name}</h3>
                                        {option.activity.rating && (
                                            <div className="flex items-center gap-1 text-primary text-xs font-bold bg-primary/10 px-1.5 py-0.5 rounded">
                                                <Star className="w-3 h-3 fill-current" />
                                                {option.activity.rating}
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-3 truncate">{option.activity.address}</p>

                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => handleVote(option.id, 1)}
                                            className={cn(
                                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                                                option.userVote === 1
                                                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                                    : "bg-white/5 text-muted-foreground border-white/5 hover:bg-emerald-500/10 hover:text-emerald-200"
                                            )}
                                        >
                                            <ThumbsUp className="w-3.5 h-3.5" />
                                            Yes ({yesVotes})
                                        </button>
                                        <button
                                            onClick={() => handleVote(option.id, -1)}
                                            className={cn(
                                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                                                option.userVote === -1
                                                    ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                                                    : "bg-white/5 text-muted-foreground border-white/5 hover:bg-rose-500/10 hover:text-rose-200"
                                            )}
                                        >
                                            <ThumbsDown className="w-3.5 h-3.5" />
                                            No
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Consensus Bar */}
                            <div className="px-4 pb-4 mt-2">
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Consensus</span>
                                    <span className={cn(
                                        "text-[10px] font-bold",
                                        meetsConsensus ? "text-emerald-400" : "text-slate-400"
                                    )}>
                                        {percentage}%
                                    </span>
                                </div>
                                <div className="relative h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${percentage}%` }}
                                        className={cn(
                                            "absolute top-0 left-0 h-full transition-colors",
                                            meetsConsensus ? "bg-emerald-500" : "bg-primary/40"
                                        )}
                                    />
                                    {isCreator && (
                                        <div
                                            className="absolute top-0 bottom-0 w-0.5 bg-primary/40 z-10"
                                            style={{ left: `${consensusThreshold}%` }}
                                        />
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}

function EndVotingButton({ hangoutId }: { hangoutId: string }) {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleEndVoting = async () => {
        if (!confirm("Are you sure you want to end voting early? The current leader will be selected as the final plan.")) return;

        setIsLoading(true);
        try {
            const res = await fetch(`/api/hangouts/${hangoutId}/end-voting`, { method: "POST" });
            if (res.ok) {
                router.refresh();
            } else {
                alert("Failed to end voting. Please try again.");
            }
        } catch (err) {
            console.error("Failed to end voting:", err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <button
            onClick={handleEndVoting}
            disabled={isLoading}
            className="text-xs font-bold text-amber-500 hover:text-amber-400 uppercase tracking-wider border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
        >
            {isLoading ? "Ending..." : "End Voting"}
        </button>
    );
}
