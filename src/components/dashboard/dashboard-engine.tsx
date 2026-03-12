"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Calendar, ArrowRight, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useUser, SignInButton } from "@clerk/nextjs";
import { FriendSelector } from "./friend-selector";
import { ActivitySuggestions } from "./activity-suggestions";
import { InviteModal } from "./invite-modal";
import { LocationPrompt } from "@/components/ui/location-prompt";
import { LocationSearch } from "@/components/ui/location-search";
import { useLocation } from "@/hooks/use-location";
import { useProfile } from "@/hooks/use-profile";
import { cn } from "@/lib/utils";

export function DashboardEngine() {
    const router = useRouter();
    const { isSignedIn } = useUser();
    const location = useLocation();
    const { profile } = useProfile();

    // Auth guard — shouldn't render for unauthenticated users
    if (!isSignedIn) {
        return (
            <div className="glass p-8 rounded-[24px] text-center space-y-4">
                <p className="text-slate-400">Sign in to create plans with your friends.</p>
                <SignInButton mode="modal">
                    <button className="px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl">
                        Sign In
                    </button>
                </SignInButton>
            </div>
        );
    }

    const [currentStep, setCurrentStep] = useState(1);
    const [isMultiDay, setIsMultiDay] = useState(false);
    const [endDatePickerValue, setEndDatePickerValue] = useState("");

    // Zip Code Override State
    const [zipOverride, setZipOverride] = useState<{
        zip: string;
        city: string;
        state: string;
        lat: number;
        lng: number;
    } | null>(null);
    const [isEditingZip, setIsEditingZip] = useState(false);

    // Determine effective location: Override > Browser > Profile > Default
    const effectiveLocation = zipOverride
        ? { lat: zipOverride.lat, lng: zipOverride.lng }
        : (location.permissionStatus === 'granted' && location.coords.lat !== 37.7749)
            ? location.coords
            : (profile?.homeLatitude && profile?.homeLongitude)
                ? { lat: profile.homeLatitude, lng: profile.homeLongitude }
                : location.coords;

    const handleLocationSelect = (loc: any) => {
        setZipOverride(loc);
        setIsEditingZip(false);
    };

    const [selectedFriends, setSelectedFriends] = useState<any[]>([]);
    const [allowGuestsToInvite, setAllowGuestsToInvite] = useState(false);
    const [isPublic, setIsPublic] = useState(false);
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
        if (isMultiDay && !endDatePickerValue) {
            toast.error("Please select an end date for the multi-day event.");
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
                    endDate: isMultiDay && endDatePickerValue ? new Date(endDatePickerValue).toISOString() : undefined,
                    isMultiDay,
                    description,
                    isVotingEnabled,
                    allowGuestsToInvite,
                    visibility: isPublic ? "PUBLIC" : "FRIENDS_ONLY"
                }),
            });

            if (res.ok) {
                const data = await res.json();

                // Construct invite message
                const inviteUrl = `${window.location.origin}/hangouts/${data.slug}`;

                // Check for guests (non-app users)
                const guests = selectedFriends.filter(f => f.isGuest);

                if (guests.length > 0 && !isMultiDay) {
                    setCreatedHangoutData({ inviteUrl, slug: data.slug });
                    setShowInviteModal(true);
                    toast.success("Hangout created! Invite your guests.");
                } else {
                    toast.success("Hangout created!");
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

                {/* Multi-Day Toggle */}
                <div className="flex items-center justify-between bg-slate-900/50 p-4 rounded-xl border border-white/5 mb-6">
                    <div className="space-y-0.5">
                        <label className="text-sm font-medium text-slate-200">Planning a Multi-Day Event?</label>
                        <p className="text-xs text-slate-500">Skip the crew selection for now and build your itinerary first.</p>
                    </div>
                    <button
                        onClick={() => {
                            const nextState = !isMultiDay;
                            setIsMultiDay(nextState);
                            if (nextState) {
                                setCurrentStep(2); // Skip 'Who'
                            } else if (currentStep === 2 && selectedFriends.length === 0) {
                                setCurrentStep(1); // Go back to 'Who' if unchecked and no friends selected
                            }
                        }}
                        className={cn(
                            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ml-4",
                            isMultiDay ? "bg-primary" : "bg-slate-700"
                        )}
                    >
                        <span
                            className={cn(
                                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                isMultiDay ? "translate-x-6" : "translate-x-1"
                            )}
                        />
                    </button>
                </div>

                {/* Step 1: WHO */}
                {!isMultiDay && (
                    <div className={cn("space-y-6 transition-all duration-500", currentStep > 1 && "opacity-50 pointer-events-none")}>
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-serif font-bold text-white tracking-tight">
                                Who's joining you?
                            </h2>
                            {currentStep > 1 && (
                                <button
                                    onClick={() => setCurrentStep(1)}
                                    className="text-xs font-medium text-primary hover:text-primary/80 pointer-events-auto cursor-pointer underline underline-offset-4"
                                >
                                    Edit Crew
                                </button>
                            )}
                        </div>

                        <FriendSelector selected={selectedFriends} onSelect={setSelectedFriends} />

                        {selectedFriends.length > 0 && currentStep === 1 && (
                            <motion.button
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                onClick={() => setCurrentStep(2)}
                                className="w-full py-4 rounded-2xl bg-white text-black font-bold text-lg shadow-xl shadow-white/10 hover:scale-[1.01] hover:shadow-white/20 transition-all flex items-center justify-center gap-2"
                            >
                                Let's Pick a Plan <ArrowRight className="w-5 h-5" />
                            </motion.button>
                        )}
                    </div>
                )}

                {/* Divider */}
                <motion.div
                    animate={{ height: selectedFriends.length > 0 ? 40 : 0 }}
                    className="h-10"
                />

                {/* Step 2: WHAT (AI Suggestions) */}
                <AnimatePresence mode="wait">
                    {(selectedFriends.length > 0 || isMultiDay) && (
                        <motion.div
                            key="step-2"
                            initial={{ opacity: 0, height: 0, y: 20 }}
                            animate={{
                                opacity: currentStep === 2 ? 1 : 0.4,
                                height: 'auto',
                                y: 0,
                                filter: currentStep > 2 ? 'grayscale(0.5)' : 'none'
                            }}
                            className={cn("space-y-6 overflow-hidden transition-all", currentStep !== 2 && "pointer-events-none")}
                        >
                            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-8" />

                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-serif font-bold text-white tracking-tight">
                                        What is the activity?
                                    </h2>

                                    <div className="flex items-center gap-3">
                                        {/* Zip Location Display */}
                                        <div className={cn(
                                            "flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all cursor-pointer group",
                                            isEditingZip ? "w-48 sm:w-64" : "w-auto"
                                        )}
                                            onClick={(e) => {
                                                if (!isEditingZip) {
                                                    e.stopPropagation();
                                                    setIsEditingZip(true);
                                                }
                                            }}>
                                            <MapPin className="w-3 h-3 text-primary shrink-0" />
                                            {isEditingZip ? (
                                                <div className="flex-1" onClick={e => e.stopPropagation()}>
                                                    <LocationSearch
                                                        onSelect={handleLocationSelect}
                                                        placeholder="City or Zip..."
                                                        className="h-6"
                                                    />
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-200 truncate">
                                                    {zipOverride ? `${zipOverride.city}, ${zipOverride.state}` : (profile?.homeCity || "Nearby")}
                                                </span>
                                            )}
                                        </div>

                                        {currentStep > 2 && (
                                            <button
                                                onClick={() => setCurrentStep(2)}
                                                className="text-xs font-medium text-primary hover:text-primary/80 pointer-events-auto cursor-pointer underline underline-offset-4"
                                            >
                                                Edit Activity
                                            </button>
                                        )}
                                        {isVotingEnabled && (
                                            <div
                                                className={cn(
                                                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border",
                                                    "bg-primary/20 border-primary/50 text-primary shadow-[0_0_10px_rgba(251,191,36,0.2)]"
                                                )}
                                            >
                                                <Zap className="w-3 h-3 text-primary" />
                                                Vote Mode
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <ActivitySuggestions
                                    hasFriendsSelected={selectedFriends.length > 0 || isMultiDay}
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
                                <label className="text-xs font-semibold text-primary uppercase tracking-wider block">
                                    Add a Note (Optional)
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="What is the activity? (e.g. Celebrating Rick's birthday!)"
                                    className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary/50 appearance-none resize-none h-20 placeholder:text-muted-foreground"
                                />
                                {/* Settings Toggle */}
                                <div className="flex items-center justify-between bg-slate-900/50 p-4 rounded-xl border border-white/5">
                                    <div className="space-y-0.5">
                                        <label className="text-sm font-medium text-slate-200">Allow guests to invite others?</label>
                                        <p className="text-xs text-slate-500">If enabled, guests will see an invite button to share with friends.</p>
                                    </div>
                                    <button
                                        onClick={() => setAllowGuestsToInvite(!allowGuestsToInvite)}
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

                                {/* Visibility Toggle */}
                                <div className="flex items-center justify-between bg-slate-900/50 p-4 rounded-xl border border-white/5">
                                    <div className="space-y-0.5">
                                        <label className="text-sm font-medium text-slate-200">Public Plan?</label>
                                        <p className="text-xs text-slate-500">If enabled, your plan will appear in the Public Discover tab.</p>
                                    </div>
                                    <button
                                        onClick={() => setIsPublic(!isPublic)}
                                        className={cn(
                                            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                                            isPublic ? "bg-primary" : "bg-slate-700"
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                                isPublic ? "translate-x-6" : "translate-x-1"
                                            )}
                                        />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-6 pt-4 border-t border-white/5">
                                <div className="space-y-4">
                                    <h2 className="text-2xl font-serif font-bold text-white tracking-tight">
                                        When's it happening?
                                    </h2>

                                    {!isMultiDay && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => handleDateSelect('tonight')}
                                                className={cn(
                                                    "p-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 border shadow-lg",
                                                    selectionMode === 'tonight'
                                                        ? "bg-primary text-black border-primary shadow-primary/20 scale-[1.02]"
                                                        : "bg-slate-800/60 border-white/5 text-slate-400 hover:bg-slate-800 hover:border-white/10 hover:text-white"
                                                )}
                                            >
                                                <Zap className="w-4 h-4" />
                                                Tonight
                                            </button>
                                            <button
                                                onClick={() => handleDateSelect('tomorrow')}
                                                className={cn(
                                                    "p-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 border shadow-lg",
                                                    selectionMode === 'tomorrow'
                                                        ? "bg-primary text-black border-primary shadow-primary/20 scale-[1.02]"
                                                        : "bg-slate-800/60 border-white/5 text-slate-400 hover:bg-slate-800 hover:border-white/10 hover:text-white"
                                                )}
                                            >
                                                <Calendar className="w-4 h-4" />
                                                Tomorrow
                                            </button>
                                        </div>
                                    )}

                                    <div className="relative group">
                                        <label className="text-xs text-slate-400 mb-1 block">Start Date & Time</label>
                                        <input
                                            type="datetime-local"
                                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-4 text-sm font-medium text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 appearance-none transition-all"
                                            value={datePickerValue}
                                            onChange={(e) => {
                                                setDatePickerValue(e.target.value);
                                                handleDateSelect(e.target.value);
                                            }}
                                        />
                                        <Calendar className="w-4 h-4 text-slate-500 absolute right-4 top-[38px] pointer-events-none group-focus-within:text-primary transition-colors" />
                                    </div>

                                    <AnimatePresence>
                                        {isMultiDay && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="relative group overflow-hidden mt-2"
                                            >
                                                <label className="text-xs text-slate-400 mb-1 block">End Date & Time</label>
                                                <input
                                                    type="datetime-local"
                                                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-4 text-sm font-medium text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 appearance-none transition-all"
                                                    value={endDatePickerValue}
                                                    onChange={(e) => setEndDatePickerValue(e.target.value)}
                                                />
                                                <Calendar className="w-4 h-4 text-slate-500 absolute right-4 top-[38px] pointer-events-none group-focus-within:text-primary transition-colors" />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <button
                                    onClick={handleCreateHangout}
                                    disabled={isCreating}
                                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-amber-400 text-black font-bold text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] hover:shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none group"
                                >
                                    {isCreating ? (
                                        <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <span>{isMultiDay ? "Create Event" : "Send Invites"}</span>
                                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
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
