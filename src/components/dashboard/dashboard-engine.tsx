"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Calendar, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FriendSelector } from "./friend-selector";
import { ActivitySuggestions } from "./activity-suggestions";
import { InviteModal } from "./invite-modal";
import { LocationPrompt } from "@/components/ui/location-prompt";
import { useLocation } from "@/hooks/use-location";
import { useProfile } from "@/hooks/use-profile";
import { cn } from "@/lib/utils";

export function DashboardEngine() {
    const router = useRouter();
    const location = useLocation();
    const { profile } = useProfile();
    const [currentStep, setCurrentStep] = useState(1);

    // Determine effective location: Browser > Profile > Default
    const effectiveLocation = (location.permissionStatus === 'granted' && location.coords.lat !== 37.7749)
        ? location.coords
        : (profile?.homeLatitude && profile?.homeLongitude)
            ? { lat: profile.homeLatitude, lng: profile.homeLongitude }
            : location.coords;

    const [selectedFriends, setSelectedFriends] = useState<any[]>([]);
    const [allowGuestsToInvite, setAllowGuestsToInvite] = useState(false);
    const [selectedActivities, setSelectedActivities] = useState<any[]>([]);
    const [isVotingEnabled, setIsVotingEnabled] = useState(false);
    const [description, setDescription] = useState("");
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [datePickerValue, setDatePickerValue] = useState("");
    const [selectionMode, setSelectionMode] = useState<'tonight' | 'tomorrow' | 'custom' | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [createdHangoutData, setCreatedHangoutData] = useState<{ inviteUrl: string; slug: string } | null>(null);

    // Sync voting mode with selection count
    const handleToggleActivity = (activity: any) => {
        setSelectedActivities(prev => {
            const exists = prev.find(a => a.id === activity.id);
            let next;
            if (exists) {
                next = prev.filter(a => a.id !== activity.id);
            } else {
                next = [...prev, activity];
            }

            // Auto-enable voting if more than one option
            if (next.length > 1) {
                setIsVotingEnabled(true);
            } else if (next.length <= 1) {
                setIsVotingEnabled(false);
            }

            return next;
        });
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
                    friendIds: selectedFriends.filter(f => !f.isGuest).map(f => f.id),
                    guests: selectedFriends.filter(f => f.isGuest).map(f => ({ name: f.name })),
                    activities: selectedActivities, // Send full objects
                    when: selectedDate,
                    description,
                    isVotingEnabled,
                    allowGuestsToInvite
                }),
            });

            if (res.ok) {
                const data = await res.json();

                // Construct invite message
                const inviteUrl = `${window.location.origin}/hangouts/${data.slug}`;

                // Display date logic
                const displayDate = selectedDate ? new Date(selectedDate).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' }) : "soon";
                const shareText = `Let's hang out! 📅 ${displayDate}\n${description ? `"${description}"\n` : ""}🔗 ${inviteUrl}`;

                // Check for guests (non-app users)
                const guests = selectedFriends.filter(f => f.isGuest);

                if (guests.length > 0) {
                    // Show modal for manual invites
                    setCreatedHangoutData({ inviteUrl, slug: data.slug });
                    setShowInviteModal(true);
                    toast.success("Hangout created! Invite your guests.");
                } else {
                    // Standard share flow if supported
                    if (typeof navigator !== 'undefined' && navigator.share) {
                        try {
                            await navigator.share({
                                title: 'Join my plan on Plans',
                                text: shareText,
                                url: inviteUrl
                            });
                            toast.success("Invites sent via share!");
                        } catch (err) {
                            console.log("Share cancelled or failed", err);
                            toast.success("Hangout created!");
                        }
                    } else {
                        // Fallback copy
                        try {
                            await navigator.clipboard.writeText(shareText);
                            toast.success("Invite link copied to clipboard!");
                        } catch (err) {
                            console.error("Clipboard failed", err);
                            toast.success("Hangout created!");
                        }
                    }

                    // Redirect immediately if no guests
                    router.push(`/hangouts/${data.slug}`);
                }
            } else {
                const errData = await res.json().catch(() => ({}));
                console.error("Failed to create hangout", errData);
                toast.error(`Failed to create: ${errData.details || "Unknown error"}`);
            }
        } catch (error) {
            console.error("Network error:", error);
            toast.error("Network error. Please try again.");
        } finally {
            setIsCreating(false);
        }
    };

    // Auto-advance removed to allow multi-select
    // useEffect(() => {
    //     if (selectedFriends.length > 0 && currentStep === 1) {
    //         setCurrentStep(2);
    //     }
    // }, [selectedFriends]);

    return (
        <div className="glass p-1 rounded-[24px] relative group transition-all duration-500">
            {/* Background Pulse when gathering */}
            <div className={cn(
                "absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent blur-xl transition-opacity duration-1000 rounded-[24px]",
                selectedFriends.length > 0 ? "opacity-100 animate-pulse" : "opacity-0 group-hover:opacity-30"
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
                <div className={cn("space-y-4 transition-all duration-500", currentStep > 1 && "opacity-50 pointer-events-none")}>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block flex items-center gap-2">
                        1. Who are you with?
                        {selectedFriends.length > 0 && <span className="text-slate-500 font-normal normal-case">• {selectedFriends.length} friends added</span>}
                        {currentStep > 1 && (
                            <button
                                onClick={() => setCurrentStep(1)}
                                className="ml-auto text-[10px] text-primary hover:text-primary/80 pointer-events-auto cursor-pointer underline"
                            >
                                Edit
                            </button>
                        )}
                    </label>
                    <FriendSelector selected={selectedFriends} onSelect={setSelectedFriends} />

                    {selectedFriends.length > 0 && currentStep === 1 && (
                        <motion.button
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={() => setCurrentStep(2)}
                            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold transition-all flex items-center justify-center gap-2 hover:bg-primary/90"
                        >
                            Continue <ArrowRight className="w-4 h-4" />
                        </motion.button>
                    )}
                </div>

                {/* Divider */}
                <motion.div
                    animate={{ height: selectedFriends.length > 0 ? 32 : 0 }}
                    className="h-8"
                />

                {/* Step 2: WHAT (AI Suggestions) */}
                <AnimatePresence>
                    {selectedFriends.length > 0 && (
                        <motion.div
                            key="step-2"
                            initial={{ opacity: 0, height: 0, y: 20 }}
                            animate={{
                                opacity: currentStep === 2 ? 1 : 0.5,
                                height: 'auto',
                                y: 0,
                                filter: currentStep > 2 ? 'grayscale(0.5)' : 'none'
                            }}
                            className={cn("space-y-4 overflow-hidden transition-all", currentStep !== 2 && "pointer-events-none")}
                        >
                            <div className="h-px bg-white/5 mb-6" />

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold text-violet-300 uppercase tracking-wider block flex items-center gap-2">
                                        2. Pick What to Do
                                        {currentStep > 2 && (
                                            <button
                                                onClick={() => setCurrentStep(2)}
                                                className="ml-auto text-[10px] text-violet-400 hover:text-violet-300 pointer-events-auto cursor-pointer underline"
                                            >
                                                Edit
                                            </button>
                                        )}
                                    </label>
                                    <div
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border",
                                            isVotingEnabled
                                                ? "bg-primary/20 border-primary/50 text-primary ring-2 ring-primary/20"
                                                : "bg-white/5 border-white/5 text-slate-500"
                                        )}
                                    >
                                        <Sparkles className={cn("w-3 h-3", isVotingEnabled ? "text-primary" : "text-slate-500")} />
                                        {isVotingEnabled ? "Voting Enabled" : "Single Choice"}
                                    </div>
                                </div>

                                <ActivitySuggestions
                                    hasFriendsSelected={selectedFriends.length > 0}
                                    onSelectCallback={handleToggleActivity}
                                    location={effectiveLocation}
                                    friendIds={selectedFriends.map(f => f.id)}
                                    selectedActivityIds={selectedActivities.map(a => a.id)}
                                    isMultiSelect={isVotingEnabled}
                                />

                                {selectedActivities.length > 0 && currentStep === 2 && (
                                    <motion.button
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        onClick={() => setCurrentStep(3)}
                                        className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center gap-2 pointer-events-auto cursor-pointer"
                                    >
                                        Next <ArrowRight className="w-4 h-4" />
                                    </motion.button>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Optional Description & Step 3 */}
                <AnimatePresence>
                    {currentStep >= 3 && (
                        <motion.div
                            key="step-3"
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="mt-8 space-y-8"
                        >
                            <div className="space-y-4">
                                <label className="text-xs font-semibold text-violet-300 uppercase tracking-wider block">
                                    Add a Note (Optional)
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="What's the vibe? (e.g. Celebrating Rick's birthday!)"
                                    className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary/50 appearance-none resize-none h-20 placeholder:text-muted-foreground"
                                />
                                {/* Settings Toggle */}
                                <div className="flex items-center justify-between bg-slate-900/50 p-4 rounded-xl border border-white/5">
                                    <div className="space-y-0.5">
                                        <label className="text-sm font-medium text-slate-200">Allow guests to invite others?</label>
                                        <p className="text-xs text-slate-500">If enabled, guests will see an invite button to share with friends.</p>
                                    </div>
                                    <button
                                        className={cn(
                                            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                                            allowGuestsToInvite ? "bg-primary" : "bg-slate-700"
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                                allowGuestsToInvite ? "translate-x-6" : "translate-x-1"
                                            )}
                                        />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-6 pt-4 border-t border-white/5">
                                <div className="space-y-3">
                                    <label className="text-xs font-semibold text-violet-300 uppercase tracking-wider block">
                                        3. When?
                                    </label>

                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => handleDateSelect('tonight')}
                                            className={cn(
                                                "p-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 border",
                                                selectionMode === 'tonight'
                                                    ? "bg-primary/20 border-primary/50 text-primary shadow-[0_0_15px_rgba(212,163,115,0.1)]"
                                                    : "bg-slate-800/40 border-white/5 text-muted-foreground hover:bg-slate-800/60 hover:border-white/10"
                                            )}
                                        >
                                            <Sparkles className="w-4 h-4" />
                                            Tonight
                                        </button>
                                        <button
                                            onClick={() => handleDateSelect('tomorrow')}
                                            className={cn(
                                                "p-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 border",
                                                selectionMode === 'tomorrow'
                                                    ? "bg-primary/20 border-primary/50 text-primary shadow-[0_0_15px_rgba(212,163,115,0.1)]"
                                                    : "bg-slate-800/40 border-white/5 text-muted-foreground hover:bg-slate-800/60 hover:border-white/10"
                                            )}
                                        >
                                            <Calendar className="w-4 h-4" />
                                            Tomorrow
                                        </button>
                                    </div>

                                    <div className="relative group">
                                        <input
                                            type="datetime-local"
                                            className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary/50 appearance-none transition-colors"
                                            value={datePickerValue}
                                            onChange={(e) => {
                                                setDatePickerValue(e.target.value);
                                                handleDateSelect(e.target.value);
                                            }}
                                        />
                                        <Calendar className="w-4 h-4 text-slate-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none group-focus-within:text-violet-400 transition-colors" />
                                    </div>
                                </div>

                                <button
                                    onClick={handleCreateHangout}
                                    disabled={isCreating}
                                    className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none group"
                                >
                                    {isCreating ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <span>Send Invites</span>
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Invite Modal */}
            {createdHangoutData && (
                <InviteModal
                    isOpen={showInviteModal}
                    onClose={() => {
                        setShowInviteModal(false);
                        if (createdHangoutData) router.push(`/hangouts/${createdHangoutData.slug}`);
                    }}
                    onDone={() => {
                        setShowInviteModal(false);
                        if (createdHangoutData) router.push(`/hangouts/${createdHangoutData.slug}`);
                    }}
                    inviteUrl={createdHangoutData.inviteUrl}
                    guests={selectedFriends.filter(f => f.isGuest)}
                />
            )}
        </div>
    );
}
