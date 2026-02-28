"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { MapPin, Calendar, Users, Star, Zap, Camera, Plus, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HangoutVoting } from "@/components/hangout/hangout-voting";
import { AddToCalendar } from "@/components/hangout/add-to-calendar";
import { RsvpButtons } from "@/components/hangout/rsvp-buttons";
import { ShareButton } from "@/components/hangout/share-button";
import { HangoutChat } from "@/components/hangout/hangout-chat";
import { FeedbackTrigger } from "@/components/hangout/feedback-trigger";
import { SaveTemplateButton } from "@/components/hangout/save-template-button";
import { PhotoGallery } from "@/components/hangout/photo-gallery";
import { TimeVoting } from "@/components/hangout/time-voting";
import { GuestJoinForm } from "@/components/hangout/guest-join-form";
import { setGuestCookie } from "@/app/actions/guest-actions";
import { HangoutTasks } from "@/components/hangout/hangout-tasks";
import { HangoutExpenses } from "@/components/hangout/hangout-expenses";
import { ItineraryDashboard } from "@/components/hangout/itinerary-dashboard";
import { SharedDocuments } from "@/components/hangout/shared-documents";
import { EventBudget } from "@/components/hangout/event-budget";
import { InviteModal } from "@/components/dashboard/invite-modal";

interface HangoutPageClientProps {
    hangout: any;
    userId: string | null;
    profile: any;
    currentUserParticipant: any;
    guestTokenToSet?: string | null;
    guestsToClaim?: any[];
}

export function HangoutPageClient({
    hangout,
    userId,
    profile,
    currentUserParticipant,
    guestTokenToSet,
    guestsToClaim = []
}: HangoutPageClientProps) {
    useEffect(() => {
        if (guestTokenToSet) {
            setGuestCookie(guestTokenToSet).then(() => {
                console.log("Guest cookie set");
            });
        }
    }, [guestTokenToSet]);

    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [editedDescription, setEditedDescription] = useState(hangout.description || "");
    const [isSaving, setIsSaving] = useState(false);
    const [allowParticipantSuggestions, setAllowParticipantSuggestions] = useState(hangout.allowParticipantSuggestions ?? true);
    const [selectedPhoto, setSelectedPhoto] = useState<any>(null);

    const handleToggleGuestSuggestions = async (current: boolean) => {
        const newValue = !current;
        setAllowParticipantSuggestions(newValue);

        try {
            const res = await fetch(`/api/hangouts/${hangout.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ allowParticipantSuggestions: newValue })
            });
            if (!res.ok) {
                setAllowParticipantSuggestions(current); // revert on failure
                toast.error("Failed to update settings");
            }
        } catch (error) {
            console.error("Failed to update guest suggestions:", error);
            setAllowParticipantSuggestions(current); // revert on failure
        }
    };

    const [isEditingDates, setIsEditingDates] = useState(false);
    const [isSavingDates, setIsSavingDates] = useState(false);

    const formatDateForInput = (dateString?: string | null) => {
        if (!dateString) return "";
        const d = new Date(dateString);
        return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    };

    const [editedStartDate, setEditedStartDate] = useState(formatDateForInput(hangout.scheduledFor));
    const [editedEndDate, setEditedEndDate] = useState(formatDateForInput(hangout.endDate));

    const handleSaveDates = async () => {
        setIsSavingDates(true);
        try {
            const res = await fetch(`/api/hangouts/${hangout.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    scheduledFor: editedStartDate ? new Date(editedStartDate).toISOString() : null,
                    endDate: editedEndDate ? new Date(editedEndDate).toISOString() : null
                })
            });
            if (res.ok) {
                window.location.reload();
            } else {
                toast.error("Failed to update dates");
            }
        } catch (error) {
            toast.error("Error saving dates");
        } finally {
            setIsSavingDates(false);
        }
    };

    const handleSaveDescription = async () => {
        setIsSaving(true);
        try {
            const res = await fetch(`/api/hangouts/${hangout.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ description: editedDescription })
            });
            if (res.ok) {
                hangout.description = editedDescription;
                setIsEditingDescription(false);
            }
        } catch (error) {
            console.error("Failed to save description:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const [participants, setParticipants] = useState(hangout.participants);

    // Invite Modal State
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [guestsToInvite, setGuestsToInvite] = useState<{ name: string, phone?: string }[]>([]);
    const [isGeneratingLink, setIsGeneratingLink] = useState(false);

    const handleGenerateInvite = async () => {
        setIsGeneratingLink(true);
        try {
            const res = await fetch(`/api/hangouts/${hangout.id}/guests`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Guest" }),
            });
            if (res.ok) {
                const data = await res.json();
                setGuestsToInvite([{ name: data.guest.displayName }]);
                setIsInviteModalOpen(true);
            } else {
                toast.error("Failed to generate invite link");
            }
        } catch (error) {
            toast.error("Failed to generate invite");
        } finally {
            setIsGeneratingLink(false);
        }
    };

    const handleToggleMandatory = async (participantId: string, current: boolean) => {
        setParticipants((prev: any[]) => prev.map((p: any) =>
            p.id === participantId ? { ...p, isMandatory: !current } : p
        ));

        try {
            const res = await fetch(`/api/hangouts/${hangout.id}/participants/${participantId}/mandatory`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isMandatory: !current })
            });
            if (res.ok) {
                toast.success(!current ? "Marked as mandatory" : "Removed mandatory status");
            } else {
                setParticipants((prev: any[]) => prev.map((p: any) =>
                    p.id === participantId ? { ...p, isMandatory: current } : p
                ));
                toast.error("Failed to update");
            }
        } catch (error) {
            console.error("Failed to toggle mandatory:", error);
            setParticipants((prev: any[]) => prev.map((p: any) =>
                p.id === participantId ? { ...p, isMandatory: current } : p
            ));
        }
    };

    const heroImage = hangout.photos?.[0]?.url || hangout.finalActivity?.imageUrl ||
        (hangout.activityOptions && hangout.activityOptions.length > 0 ? hangout.activityOptions[0].cachedEvent?.imageUrl : null);

    const isOrganizer = userId === hangout.creator.clerkId || currentUserParticipant?.role === "ORGANIZER";

    // Helper to check if a section should be shown
    const shouldShowSection = (hasContent: boolean) => {
        if (hasContent) return true;
        if (isOrganizer) return true;
        return false;
    };

    // Helper for minimized organizer empty state
    const EmptySectionButton = ({ label, onClick, icon: Icon }: { label: string, onClick: () => void, icon?: any }) => (
        <button
            onClick={onClick}
            className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all group"
        >
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    {Icon ? <Icon className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <span className="text-sm font-medium text-slate-300">Add {label}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
        </button>
    );

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
            {/* Hero Header */}
            <div className="relative h-[65vh] min-h-[500px] w-full overflow-hidden group">
                <div className="absolute inset-0 bg-slate-950">
                    {heroImage ? (
                        <motion.img
                            initial={{ scale: 1.1, opacity: 0 }}
                            animate={{ scale: 1, opacity: 0.7 }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            src={heroImage}
                            alt="Location"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2000ms]"
                        />
                    ) : (
                        <motion.img
                            initial={{ scale: 1.1, opacity: 0 }}
                            animate={{ scale: 1, opacity: 0.4 }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            src="/images/hangout-placeholder.png"
                            alt="Community"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2000ms]"
                        />
                    )}
                </div>

                {/* Update Photo Button (Organizer only) */}
                {isOrganizer && (
                    <div className="absolute top-6 right-6 z-30">
                        <button
                            onClick={() => {
                                const gallerySection = document.getElementById('gallery-section');
                                if (gallerySection) {
                                    gallerySection.scrollIntoView({ behavior: 'smooth' });
                                }
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/20 rounded-xl text-white text-xs font-bold transition-all"
                        >
                            <Camera className="w-4 h-4" />
                            Update Photo
                        </button>
                    </div>
                )}

                {/* Advanced Gradient Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent z-10" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent z-10" />
                <div className="absolute inset-0 bg-primary/5 mix-blend-overlay z-10" />

                <div className="absolute bottom-0 left-0 w-full p-6 md:p-16 z-20">
                    <div className="container mx-auto max-w-2xl px-4 md:px-0">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="flex items-center justify-between mb-8"
                        >
                            <div className="flex items-center gap-3">
                                <span className={cn(
                                    "inline-block px-4 py-1.5 rounded-full backdrop-blur-xl text-white border text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl",
                                    hangout.status === "VOTING" ? "bg-primary/20 border-primary/30 text-primary" : "bg-white/10 border-white/20"
                                )}>
                                    {hangout.status}
                                </span>
                                {hangout.visibility === "PUBLIC" && (
                                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                                        Public
                                    </span>
                                )}
                            </div>
                            {(hangout.visibility === "PUBLIC" || userId === hangout.creator.clerkId) && (
                                <ShareButton hangoutId={hangout.id} variant="icon" className="backdrop-blur-md shadow-xl hover:bg-white/20" />
                            )}
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.4 }}
                            className="text-6xl md:text-8xl font-serif font-bold text-white mb-6 leading-[0.9] tracking-tight drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]"
                        >
                            {hangout.title}
                        </motion.h1>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.6 }}
                            className="flex flex-wrap items-center gap-4 text-sm md:text-base text-white/90 font-medium"
                        >
                            {hangout.scheduledFor && (
                                <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/10 backdrop-blur-md shadow-xl hover:bg-white/10 transition-colors cursor-default">
                                    <Calendar className="w-4 h-4 text-primary" />
                                    <span className="tracking-tight">
                                        {format(new Date(hangout.scheduledFor), "EEE, MMM do @ h:mm a")}
                                        {hangout.endDate && ` - ${format(new Date(hangout.endDate), "EEE, MMM do @ h:mm a")}`}
                                    </span>
                                </div>
                            )}
                            {(hangout.finalActivity || (hangout.activityOptions?.[0]?.cachedEvent)) && hangout.status !== "VOTING" && (
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((hangout.finalActivity?.name || hangout.activityOptions[0].cachedEvent.name) + ' ' + (hangout.finalActivity?.address || hangout.activityOptions[0].cachedEvent.address || ''))}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 hover:text-white transition-all bg-white/5 hover:bg-white/10 px-4 py-2 rounded-2xl border border-white/10 backdrop-blur-md shadow-xl group/map"
                                >
                                    <MapPin className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                                    <span className="tracking-tight">{hangout.finalActivity?.name || hangout.activityOptions[0].cachedEvent.name}</span>
                                </a>
                            )}
                            {hangout.status === "VOTING" && (
                                <div className="flex items-center gap-3 text-primary bg-primary/10 px-4 py-2 rounded-2xl border border-primary/20 backdrop-blur-md border-dashed shadow-xl">
                                    <Zap className="w-4 h-4 animate-pulse" />
                                    <span className="font-bold uppercase tracking-[0.1em] text-xs">Deciding the activity</span>
                                </div>
                            )}
                        </motion.div>
                    </div>
                </div>
            </div>

            {!currentUserParticipant && (
                <div className="fixed inset-0 z-[100] flex flex-col justify-center items-center bg-black/60 backdrop-blur-[20px] overflow-y-auto px-4 py-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="w-full max-w-md flex flex-col items-center"
                    >
                        <div className="text-center mb-10 w-full">
                            <h2 className="text-4xl md:text-5xl font-serif font-bold text-white mb-4 drop-shadow-2xl leading-tight">
                                {hangout.title}
                            </h2>
                            {hangout.scheduledFor && (
                                <p className="text-white/90 font-medium text-lg drop-shadow-md flex items-center justify-center gap-2 bg-black/20 py-2 px-4 rounded-full border border-white/10 w-fit mx-auto">
                                    <Calendar className="w-5 h-5 text-primary" />
                                    {format(new Date(hangout.scheduledFor), "EEEE, MMM do @ h:mm a")}
                                </p>
                            )}
                        </div>
                        <div className="w-full pointer-events-auto transform transition-all duration-500 rounded-3xl" style={{ boxShadow: '0 0 80px -20px rgba(212,163,115,0.3)' }}>
                            <GuestJoinForm hangoutId={hangout.id} guestsToClaim={guestsToClaim} />
                        </div>
                    </motion.div>
                </div>
            )}

            <div className={cn("container mx-auto max-w-2xl p-6 space-y-8 relative", !currentUserParticipant && "pointer-events-none select-none blur-[10px] opacity-30 h-[70vh] overflow-hidden")}>
                {/* Participants */}
                <div className="glass-card p-6 rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-serif font-semibold text-foreground flex items-center gap-2">
                            Who's Going?
                            <span className="text-xs font-sans font-normal text-muted-foreground bg-white/5 px-2 py-1 rounded-full">{participants.length}</span>
                        </h2>
                        <div className="flex items-center gap-2">
                            {(hangout.visibility === "PUBLIC" || isOrganizer) && (
                                <button
                                    onClick={handleGenerateInvite}
                                    disabled={isGeneratingLink}
                                    className="px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-full text-xs font-bold uppercase flex items-center gap-1.5 transition-colors"
                                >
                                    {isGeneratingLink ? "..." : "+ Add Guest"}
                                </button>
                            )}
                            {(hangout.visibility === "PUBLIC" || userId === hangout.creator.clerkId) && (
                                <ShareButton hangoutId={hangout.id} variant="button" />
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col gap-3 max-h-72 overflow-y-auto custom-scrollbar pr-2">
                        {participants.map((p: any) => (
                            <div key={p.id} className="flex items-center justify-between bg-white/5 p-2 pr-4 rounded-full border border-white/5 group/p">
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <Avatar className="w-10 h-10 border border-white/10">
                                            <AvatarImage src={p.profile?.avatarUrl || undefined} />
                                            <AvatarFallback className="text-xs bg-slate-800 text-slate-400">
                                                {p.profile?.displayName?.slice(0, 2).toUpperCase() || "??"}
                                            </AvatarFallback>
                                        </Avatar>
                                        {p.isMandatory && (
                                            <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-0.5 border border-slate-900 shadow-lg">
                                                <Star className="w-2.5 h-2.5 text-white" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-foreground">
                                            {p.profile?.displayName || p.guest?.displayName || "Guest"}
                                            {p.role === "CREATOR" && <span className="ml-2 text-[8px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full uppercase tracking-tighter">Host</span>}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span className={cn(
                                                "text-[10px] uppercase tracking-wider",
                                                p.rsvpStatus === "GOING" ? "text-emerald-400 font-bold" : "text-slate-500"
                                            )}>
                                                {p.rsvpStatus}
                                            </span>
                                            {/* Show SMS Invite Button for Guests who haven't RSVP'd */}
                                            {p.guest && p.rsvpStatus === "PENDING" && (userId === hangout.creator.clerkId || hangout.allowGuestsToInvite) && (
                                                <a
                                                    href={`sms:${p.guest.phone || ''}?body=${encodeURIComponent(`Hey ${p.guest.displayName}, join my hangout here: ${typeof window !== 'undefined' ? window.location.origin : ''}/hangouts/${hangout.slug}?guestToken=${p.guest.token}`)}`}
                                                    className="ml-2 text-[10px] bg-white/10 hover:bg-white/20 text-white px-2 py-0.5 rounded-full transition-colors flex items-center gap-1"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    Tap to Invite
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {userId === hangout.creator.clerkId && p.profileId !== profile?.id && (
                                    <button
                                        onClick={() => handleToggleMandatory(p.id, p.isMandatory)}
                                        className={cn(
                                            "transition-all px-3 py-1 rounded-full text-[10px] font-bold uppercase border",
                                            p.isMandatory
                                                ? "bg-amber-500/20 text-amber-400 border-amber-500/30 opacity-100"
                                                : "bg-white/5 text-slate-500 hover:text-slate-300 border-transparent hover:border-white/10"
                                        )}
                                    >
                                        {p.isMandatory ? "Mandatory" : "Optional"}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Activity Details & Voting */}
                {(hangout.status === "PLANNING" || hangout.status === "VOTING") && hangout.activityOptions.length > 1 ? (
                    <div className="space-y-8">
                        {currentUserParticipant && (
                            <div className="glass p-6 rounded-2xl border border-white/5 bg-slate-900/50">
                                <h3 className="text-sm font-bold text-slate-400 mb-3">Your Response</h3>
                                <div className="flex gap-4">
                                    <RsvpButtons hangoutId={hangout.id} currentStatus={currentUserParticipant?.rsvpStatus} />
                                </div>
                            </div>
                        )}

                        <HangoutVoting
                            hangoutId={hangout.id}
                            currentUserIds={profile ? [profile.id] : currentUserParticipant?.guestId ? [currentUserParticipant.guestId] : []}
                            options={hangout.activityOptions.map((opt: any) => ({
                                id: opt.id,
                                activity: {
                                    id: opt.cachedEvent.id,
                                    name: opt.cachedEvent.name,
                                    category: opt.cachedEvent.category,
                                    rating: opt.cachedEvent.rating,
                                    address: opt.cachedEvent.address,
                                    imageUrl: opt.cachedEvent.imageUrl
                                },
                                votes: opt.votes.map((v: any) => ({ userId: v.profileId || v.guestId || "unknown", value: v.value })),
                                userVote: opt.votes.find((v: any) => v.profileId === profile?.id || (currentUserParticipant && v.guestId === currentUserParticipant.guestId))?.value || 0
                            }))}
                            allowParticipantSuggestions={allowParticipantSuggestions}
                            votingEndsAt={hangout.votingEndsAt}
                            isCreator={userId === hangout.creator.clerkId}
                            initialThreshold={hangout.consensusThreshold}
                            totalParticipants={participants.length}
                        />

                        {hangout.timeOptions.length > 0 && (
                            <div className="glass p-6 rounded-2xl border border-white/5 bg-slate-900/50">
                                <TimeVoting
                                    hangoutId={hangout.id}
                                    isParticipant={!!currentUserParticipant}
                                    currentUserId={currentUserParticipant?.profileId || currentUserParticipant?.guestId}
                                    options={hangout.timeOptions.map((t: any) => ({
                                        id: t.id,
                                        startTime: t.startTime,
                                        endTime: t.endTime || null,
                                        votes: t.votes.map((v: any) => ({ userId: v.profileId || v.guestId || "unknown", value: v.value }))
                                    }))}
                                />
                            </div>
                        )}
                    </div>
                ) : (hangout.finalActivity || (hangout.activityOptions.length === 1 && hangout.activityOptions[0].cachedEvent)) && (
                    <div className="glass p-6 rounded-2xl border border-white/5 bg-slate-900/50">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-white">The Plan</h2>
                            {(hangout.finalActivityId || (hangout.activityOptions.length === 1 && hangout.activityOptions[0].id)) && (
                                <SaveTemplateButton
                                    hangoutId={hangout.id}
                                    title={hangout.finalActivity?.name || (hangout.activityOptions.length > 0 ? hangout.activityOptions[0].cachedEvent?.name : hangout.title) || hangout.title}
                                    type={hangout.type}
                                    activityId={hangout.finalActivityId || hangout.activityOptions[0].cachedEventId}
                                />
                            )}
                        </div>
                        {(() => {
                            const act = hangout.finalActivity || hangout.activityOptions[0].cachedEvent;
                            return (
                                <div className="flex gap-4">
                                    <div className="w-24 h-24 rounded-xl bg-slate-800 shrink-0 border border-white/10 overflow-hidden">
                                        {act.imageUrl ? (
                                            <img src={act.imageUrl} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <img src="/images/hangout-placeholder.png" alt="" className="w-full h-full object-cover opacity-70" />
                                        )}
                                    </div>
                                    <div>
                                        <a
                                            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(act.name + ' ' + (act.address || ''))}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group/link block mb-2"
                                        >
                                            <h3 className="font-bold text-slate-200 group-hover/link:text-primary transition-colors">{act.name}</h3>
                                            <p className="text-sm text-slate-400 group-hover/link:text-slate-300 transition-colors flex items-start gap-1 mt-0.5">
                                                <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                                <span>{act.address}</span>
                                            </p>
                                        </a>
                                        <div className="flex gap-2">
                                            {act.rating && (
                                                <span className="text-xs bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20">
                                                    ★ {act.rating}
                                                </span>
                                            )}
                                            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-white/5">
                                                {act.category}
                                            </span>
                                        </div>
                                        {/* Add to Calendar */}
                                        {hangout.scheduledFor && (
                                            <div className="mt-4">
                                                <AddToCalendar
                                                    title={`Plans: ${hangout.title}`}
                                                    description={hangout.description || `Hangout at ${act.name}`}
                                                    location={`${act.name}, ${act.address}`}
                                                    startTime={new Date(hangout.scheduledFor)}
                                                    compact={true}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* RSVP INTEGRATED INTO PLAN */}
                        {currentUserParticipant && (
                            <div className="mt-6 pt-6 border-t border-white/10">
                                <h3 className="text-sm font-bold text-slate-400 mb-3">Your Response</h3>
                                <div className="flex gap-4">
                                    <RsvpButtons hangoutId={hangout.id} currentStatus={currentUserParticipant?.rsvpStatus} />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Coordination Components — expand on demand, clean by default */}
                {currentUserParticipant && (
                    <div className="space-y-3">

                        {/* Note Section — shown if has content, or organizer can add */}
                        {shouldShowSection(!!hangout.description) && (
                            <div className="glass p-4 rounded-2xl border border-white/5 bg-slate-900/50">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Note</label>
                                    {isOrganizer && !isEditingDescription && (
                                        <button
                                            onClick={() => setIsEditingDescription(true)}
                                            className="text-[10px] font-bold text-primary hover:text-primary/80 uppercase tracking-wider transition-colors"
                                        >
                                            {hangout.description ? "Edit" : "+ Add"}
                                        </button>
                                    )}
                                </div>
                                {isEditingDescription ? (
                                    <div className="space-y-3">
                                        <textarea
                                            value={editedDescription}
                                            onChange={(e) => setEditedDescription(e.target.value)}
                                            className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 resize-none h-32 leading-relaxed"
                                            placeholder="Write a note about the plan..."
                                            autoFocus
                                        />
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => setIsEditingDescription(false)} className="px-3 py-1.5 text-[10px] font-bold text-slate-400 hover:text-white uppercase transition-colors">Discard</button>
                                            <button onClick={handleSaveDescription} disabled={isSaving} className="px-4 py-1.5 text-[10px] bg-primary/20 text-primary border border-primary/30 rounded-lg font-bold hover:bg-primary/40 transition-all disabled:opacity-50 uppercase tracking-wider">
                                                {isSaving ? "Saving..." : "Save"}
                                            </button>
                                        </div>
                                    </div>
                                ) : hangout.description ? (
                                    <p className="text-sm text-slate-300 leading-relaxed italic">"{hangout.description}"</p>
                                ) : null}
                            </div>
                        )}

                        {/* Tasks — HangoutTasks handles its own empty vs. full state with a + button */}
                        {shouldShowSection(hangout.tasks?.length > 0) && (
                            <HangoutTasks
                                hangoutId={hangout.id}
                                participants={hangout.participants
                                    .filter((p: any) => p.profile)
                                    .map((p: any) => ({ id: p.profile.id, displayName: p.profile.displayName, avatarUrl: p.profile.avatarUrl }))}
                                isParticipant={!!currentUserParticipant}
                                currentUserId={currentUserParticipant?.profileId}
                            />
                        )}

                        {/* Expenses — HangoutExpenses handles its own empty vs. full state with a + button */}
                        {shouldShowSection(hangout.expenses?.length > 0) && (
                            <HangoutExpenses
                                hangoutId={hangout.id}
                                participants={hangout.participants
                                    .filter((p: any) => p.profile)
                                    .map((p: any) => ({
                                        id: p.profile.id,
                                        displayName: p.profile.displayName,
                                        avatarUrl: p.profile.avatarUrl,
                                        venmoHandle: p.profile.venmoHandle,
                                        paypalHandle: p.profile.paypalHandle,
                                        zelleHandle: p.profile.zelleHandle,
                                        cashappHandle: p.profile.cashappHandle,
                                        applePayHandle: p.profile.applePayHandle,
                                    }))}
                                isParticipant={!!currentUserParticipant}
                            />
                        )}

                        {/* Event Budget — only show when has budget data (guests) or always for organizer */}
                        {(hangout.budget || isOrganizer) && (
                            <div className="glass rounded-2xl border border-white/5 bg-slate-900/50 overflow-hidden">
                                <EventBudget
                                    hangoutId={hangout.id}
                                    participants={hangout.participants
                                        .filter((p: any) => p.profile)
                                        .map((p: any) => ({
                                            id: p.profile.id,
                                            displayName: p.profile.displayName,
                                            avatarUrl: p.profile.avatarUrl,
                                            venmoHandle: p.profile.venmoHandle,
                                            paypalHandle: p.profile.paypalHandle,
                                            zelleHandle: p.profile.zelleHandle,
                                            cashappHandle: p.profile.cashappHandle,
                                            applePayHandle: p.profile.applePayHandle,
                                        }))}
                                    isOrganizer={isOrganizer}
                                    isParticipant={!!currentUserParticipant}
                                    currentUserId={currentUserParticipant?.profileId}
                                />
                            </div>
                        )}

                        {/* Shared Documents — only show when has docs (guests) or always for organizer */}
                        {(hangout.documents?.length > 0 || isOrganizer) && (
                            <div className="glass p-4 rounded-2xl border border-white/5 bg-slate-900/50">
                                <SharedDocuments
                                    hangoutId={hangout.id}
                                    isParticipant={!!currentUserParticipant}
                                    isOrganizer={isOrganizer}
                                    currentUserId={currentUserParticipant?.profileId}
                                />
                            </div>
                        )}

                        {/* Itinerary Dashboard — only for multi-day events with content */}
                        {hangout.isMultiDay && shouldShowSection(hangout.itineraryDays?.[0]?.activities?.length > 0) && (
                            <div className="glass p-4 rounded-2xl border border-white/5 bg-slate-900/50">
                                <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                                    <Calendar className="w-4 h-4 text-primary" /> Itinerary
                                </h3>
                                <ItineraryDashboard
                                    hangoutId={hangout.id}
                                    initialDays={hangout.itineraryDays}
                                    isOrganizer={isOrganizer}
                                />
                            </div>
                        )}

                        {/* Host Controls */}
                        {isOrganizer && (
                            <div className="glass p-6 rounded-2xl border border-white/5 bg-slate-900/50">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                                    <Zap className="w-4 h-4" /> Host Controls
                                </label>

                                <div className="space-y-4">
                                    <div className="flex flex-col bg-white/5 p-4 rounded-xl border border-white/10 gap-3">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5 pr-4">
                                                <label className="text-sm font-medium text-slate-200 block">Event Dates</label>
                                                <p className="text-xs text-slate-500">Update the actual date and time of the event.</p>
                                            </div>
                                            {!isEditingDates ? (
                                                <button
                                                    onClick={() => setIsEditingDates(true)}
                                                    className="px-3 py-1 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg uppercase transition-colors shrink-0"
                                                >
                                                    Edit Dates
                                                </button>
                                            ) : (
                                                <div className="flex gap-2 shrink-0">
                                                    <button
                                                        onClick={() => setIsEditingDates(false)}
                                                        className="px-3 py-1 text-xs font-bold text-slate-400 hover:text-white uppercase transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={handleSaveDates}
                                                        disabled={isSavingDates}
                                                        className="px-3 py-1 text-xs font-bold text-primary bg-primary/20 hover:bg-primary/30 rounded-lg uppercase transition-colors disabled:opacity-50"
                                                    >
                                                        {isSavingDates ? "Saving..." : "Save"}
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {isEditingDates && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                                                <div className="space-y-1">
                                                    <label className="text-xs font-medium text-slate-400 ml-1">Start Date</label>
                                                    <input
                                                        type="datetime-local"
                                                        value={editedStartDate}
                                                        onChange={(e) => setEditedStartDate(e.target.value)}
                                                        className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-primary/50"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs font-medium text-slate-400 ml-1">End Date (Optional)</label>
                                                    <input
                                                        type="datetime-local"
                                                        value={editedEndDate}
                                                        onChange={(e) => setEditedEndDate(e.target.value)}
                                                        className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-primary/50"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10">
                                        <div className="space-y-0.5 pr-4">
                                            <label className="text-sm font-medium text-slate-200 block">Allow Guests to Suggest Options</label>
                                            <p className="text-xs text-slate-500">Enable to let anyone add their own ideas to the vote.</p>
                                        </div>
                                        <button
                                            onClick={() => handleToggleGuestSuggestions(allowParticipantSuggestions)}
                                            className={cn(
                                                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0",
                                                allowParticipantSuggestions ? "bg-primary" : "bg-slate-700"
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                                    allowParticipantSuggestions ? "translate-x-6" : "translate-x-1"
                                                )}
                                            />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Feedback Trigger (Post-Hangout) */}
                <FeedbackTrigger
                    hangoutId={hangout.id}
                    hangoutTitle={hangout.title}
                    isParticipant={!!currentUserParticipant}
                    hasFeedback={hangout.feedbacks.some((f: any) => f.profileId === currentUserParticipant?.profileId)}
                    isPast={!!hangout.scheduledFor && new Date(hangout.scheduledFor) < new Date()}
                />

                {/* Shared Gallery */}
                <div id="gallery-section" className="glass p-6 rounded-2xl border border-white/5 bg-slate-900/50">
                    <PhotoGallery
                        hangoutId={hangout.id}
                        initialPhotos={hangout.photos.map((p: any) => ({
                            id: p.id,
                            url: p.url,
                            caption: p.caption,
                            uploader: {
                                displayName: p.uploader?.displayName || "Guest",
                                avatarUrl: p.uploader?.avatarUrl || null
                            }
                        }))}
                        isParticipant={!!currentUserParticipant}
                        onPhotoClick={(photo) => setSelectedPhoto(photo)}
                    />
                </div>

                {/* Lightbox Overlay */}
                {selectedPhoto && (
                    <div
                        className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-200"
                        onClick={() => setSelectedPhoto(null)}
                    >
                        <button
                            className="absolute top-4 right-4 p-2 text-white/50 hover:text-white transition-colors"
                            onClick={() => setSelectedPhoto(null)}
                        >
                            <span className="sr-only">Close</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                        <div className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                            <img
                                src={selectedPhoto.url}
                                alt={selectedPhoto.caption || "Hangout photo"}
                                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
                            />
                            {selectedPhoto.caption && (
                                <p className="mt-4 text-white text-center text-lg font-medium">{selectedPhoto.caption}</p>
                            )}
                            <div className="mt-2 flex items-center gap-2 text-white/60 text-sm">
                                <Avatar className="w-6 h-6 border border-white/10">
                                    <AvatarImage src={selectedPhoto.uploader?.avatarUrl} />
                                    <AvatarFallback>{selectedPhoto.uploader?.displayName?.[0]}</AvatarFallback>
                                </Avatar>
                                <span>Uploaded by {selectedPhoto.uploader?.displayName}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Chat & Comments */}
                {currentUserParticipant && (
                    <div className="pb-24">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="h-px bg-white/10 flex-1" />
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Community Chat</span>
                            <div className="h-px bg-white/10 flex-1" />
                        </div>
                        <HangoutChat
                            hangoutId={hangout.id}
                            currentUserId={currentUserParticipant.profileId}
                        />
                    </div>
                )}
            </div>

            <InviteModal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
                inviteUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/hangouts/${hangout.slug}`}
                guests={guestsToInvite}
                onDone={() => {
                    setIsInviteModalOpen(false);
                    window.location.reload();
                }}
            />
        </div>
    );
}
