"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Calendar, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FriendSelector } from "./friend-selector";
import { ActivitySuggestions } from "./activity-suggestions";
import { LocationPrompt } from "@/components/ui/location-prompt";
import { useLocation } from "@/hooks/use-location";
import { cn } from "@/lib/utils";

export function DashboardEngine() {
    const router = useRouter();
    const location = useLocation();
    const [selectedFriends, setSelectedFriends] = useState<any[]>([]);
    const [selectedActivities, setSelectedActivities] = useState<any[]>([]);
    const [isVotingEnabled, setIsVotingEnabled] = useState(false);
    const [description, setDescription] = useState("");
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [datePickerValue, setDatePickerValue] = useState("");
    const [selectionMode, setSelectionMode] = useState<'tonight' | 'tomorrow' | 'custom' | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const handleToggleActivity = (activity: any) => {
        if (isVotingEnabled) {
            setSelectedActivities(prev => {
                const exists = prev.find(a => a.id === activity.id);
                if (exists) {
                    return prev.filter(a => a.id !== activity.id);
                }
                return [...prev, activity];
            });
        } else {
            setSelectedActivities([activity]);
        }
    };

    const handleDateSelect = (mode: 'tonight' | 'tomorrow' | string) => {
        let actualDate: Date;
        if (mode === 'tonight') {
            actualDate = new Date();
            // If it's already past 7pm, 'tonight' means 7pm tomorrow
            if (actualDate.getHours() >= 19) {
                actualDate.setDate(actualDate.getDate() + 1);
            }
            actualDate.setHours(19, 0, 0, 0);
            setSelectionMode('tonight');
        } else if (mode === 'tomorrow') {
            actualDate = new Date();
            actualDate.setDate(actualDate.getDate() + 1);
            actualDate.setHours(19, 0, 0, 0);
            setSelectionMode('tomorrow');
        } else {
            actualDate = new Date(mode);
            setSelectionMode('custom');
        }
        setSelectedDate(actualDate.toISOString());

        // Format for datetime-local: YYYY-MM-DDTHH:mm
        const year = actualDate.getFullYear();
        const month = String(actualDate.getMonth() + 1).padStart(2, '0');
        const day = String(actualDate.getDate()).padStart(2, '0');
        const hours = String(actualDate.getHours()).padStart(2, '0');
        const minutes = String(actualDate.getMinutes()).padStart(2, '0');
        setDatePickerValue(`${year}-${month}-${day}T${hours}:${minutes}`);
    };

    const handleCreateHangout = async () => {
        if (selectedActivities.length === 0) {
            toast.error("Please select at least one activity/option.");
            return;
        }
        if (!selectedDate) {
            toast.error("Please select a date/time.");
            return;
        }

        setIsCreating(true);

        try {
            const res = await fetch("/api/hangouts/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    friendIds: selectedFriends.map(f => f.id),
                    activityIds: selectedActivities.map(a => a.id),
                    when: selectedDate,
                    description,
                    isVotingEnabled
                }),
            });

            if (res.ok) {
                const data = await res.json();
                toast.success("Invites sent!");
                // Redirect to hangout page
                router.push(`/hangouts/${data.slug}`);
            } else {
                console.error("Failed to create hangout");
                toast.error("Failed to create hangout. Please try again.");
            }
        } catch (error) {
            console.error("Network error:", error);
            toast.error("Network error. Please try again.");
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="glass p-1 rounded-[24px] relative group transition-all duration-500">
            {/* Background Pulse when gathering */}
            <div className={cn(
                "absolute inset-0 bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 blur-xl transition-opacity duration-1000 rounded-[24px]",
                selectedFriends.length > 0 ? "opacity-100 animate-pulse" : "opacity-30 group-hover:opacity-60"
            )} />

            <div className="bg-slate-900/40 backdrop-blur-xl rounded-[20px] border border-white/5 p-6 relative overflow-hidden transition-all duration-500">

                {/* Location Permission Prompt */}
                <LocationPrompt
                    permissionStatus={location.permissionStatus}
                    loading={location.loading}
                    error={location.error}
                    onRequestLocation={location.requestLocation}
                />

                {location.permissionStatus !== "granted" && <div className="h-4" />}

                {/* Step 1: WHO */}
                <div className="space-y-4">
                    <label className="text-xs font-semibold text-violet-300 uppercase tracking-wider block flex items-center gap-2">
                        1. Who are you with?
                        {selectedFriends.length > 0 && <span className="text-slate-500 font-normal normal-case">• {selectedFriends.length} friends added</span>}
                    </label>
                    <FriendSelector selected={selectedFriends} onSelect={setSelectedFriends} />
                </div>

                {/* Divider */}
                <motion.div
                    animate={{ height: selectedFriends.length > 0 ? 24 : 0 }}
                    className="h-6"
                />

                {/* Step 2: WHAT (AI Suggestions) */}
                <AnimatePresence>
                    {selectedFriends.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, y: 20 }}
                            animate={{ opacity: 1, height: 'auto', y: 0 }}
                            exit={{ opacity: 0, height: 0, y: 20 }}
                            className="space-y-4 overflow-hidden"
                        >
                            <div className="h-px bg-white/5 mb-6" />

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                                        Options
                                    </label>
                                    <button
                                        onClick={() => {
                                            const newVal = !isVotingEnabled;
                                            setIsVotingEnabled(newVal);
                                            // If turning off voting, keep only the first selected activity
                                            if (!newVal && selectedActivities.length > 1) {
                                                setSelectedActivities([selectedActivities[0]]);
                                            }
                                        }}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border",
                                            isVotingEnabled
                                                ? "bg-violet-600/20 border-violet-500/50 text-violet-300 ring-2 ring-violet-500/20"
                                                : "bg-white/5 border-white/5 text-slate-500 hover:text-slate-300"
                                        )}
                                    >
                                        <Sparkles className={cn("w-3 h-3", isVotingEnabled ? "text-violet-300" : "text-slate-500")} />
                                        Vote on Options
                                    </button>
                                </div>

                                <ActivitySuggestions
                                    hasFriendsSelected={selectedFriends.length > 0}
                                    onSelectCallback={handleToggleActivity}
                                    location={location.coords}
                                    friendIds={selectedFriends.map(f => f.id)}
                                    selectedActivityIds={selectedActivities.map(a => a.id)}
                                    isMultiSelect={isVotingEnabled}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Optional Description */}
                <AnimatePresence>
                    {selectedActivities.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-6 pt-6 border-t border-white/5 space-y-4"
                        >
                            <label className="text-xs font-semibold text-violet-300 uppercase tracking-wider block">
                                Add a Note (Optional)
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="What's the vibe? (e.g. Celebrating Rick's birthday!)"
                                className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-violet-500/50 appearance-none resize-none h-20 placeholder:text-slate-600"
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Step 3: WHEN (Calendar Toggle) */}
                <AnimatePresence>
                    {selectedActivities.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-6 pt-6 border-t border-white/5 space-y-4"
                        >
                            <label className="text-xs font-semibold text-violet-300 uppercase tracking-wider block">
                                3. When?
                            </label>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => handleDateSelect('tonight')}
                                    className={cn(
                                        "p-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2",
                                        selectionMode === 'tonight'
                                            ? "bg-violet-600/20 border border-violet-500/50 text-violet-200"
                                            : "bg-white/5 border border-white/5 text-slate-400 hover:bg-white/10"
                                    )}
                                >
                                    <Sparkles className="w-4 h-4" />
                                    Tonight
                                </button>
                                <button
                                    onClick={() => handleDateSelect('tomorrow')}
                                    className={cn(
                                        "p-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2",
                                        selectionMode === 'tomorrow'
                                            ? "bg-violet-600/20 border border-violet-500/50 text-violet-200"
                                            : "bg-white/5 border border-white/5 text-slate-400 hover:bg-white/10"
                                    )}
                                >
                                    <Calendar className="w-4 h-4" />
                                    Tomorrow
                                </button>
                            </div>

                            {/* Custom Date Picker */}
                            <div className="relative group">
                                <input
                                    type="datetime-local"
                                    className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-violet-500/50 appearance-none"
                                    value={datePickerValue}
                                    onChange={(e) => {
                                        setDatePickerValue(e.target.value);
                                        handleDateSelect(e.target.value);
                                    }}
                                />
                                <Calendar className="w-4 h-4 text-slate-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>

                            <button
                                onClick={handleCreateHangout}
                                disabled={isCreating}
                                className="w-full py-4 mt-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold shadow-lg shadow-violet-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                            >
                                {isCreating ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>Send Invites <ArrowRight className="w-4 h-4" /></>
                                )}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>
        </div>
    );
}
