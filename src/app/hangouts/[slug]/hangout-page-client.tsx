"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { MapPin, Calendar, Sparkles, Users } from "lucide-react";
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
import { GuestClaimUI } from "@/components/hangout/guest-claim-ui";

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
    const [selectedPhoto, setSelectedPhoto] = useState<any>(null);

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

    const handleToggleMandatory = async (participantId: string, current: boolean) => {
        // Optimistic update
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
                // Revert on failure
                setParticipants((prev: any[]) => prev.map((p: any) =>
                    p.id === participantId ? { ...p, isMandatory: current } : p
                ));
                toast.error("Failed to update");
            }
        } catch (error) {
            console.error("Failed to toggle mandatory:", error);
            // Revert on failure
            setParticipants((prev: any[]) => prev.map((p: any) =>
                p.id === participantId ? { ...p, isMandatory: current } : p
            ));
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
            {/* Hero Header */}
            <div className="relative h-[50vh] min-h-[400px] w-full overflow-hidden group">
                <div className="absolute inset-0 bg-slate-900">
                    {hangout.finalActivity?.imageUrl ? (
                        <img
                            src={hangout.finalActivity.imageUrl}
                            alt="Location"
                            className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-1000"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-800" />
                    )}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent z-10" />
                <div className="absolute inset-0 bg-black/20 z-10" />

                <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 z-20">
                    <div className="container mx-auto max-w-2xl px-4 md:px-0 animate-in slide-in-from-bottom-5 fade-in duration-700">
                        <div className="flex items-center justify-between mb-6">
                            <span className="inline-block px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20 text-xs font-bold uppercase tracking-widest shadow-lg">
                                {hangout.status}
                            </span>
                            <ShareButton hangoutId={hangout.id} />
                        </div>
                        <h1 className="text-5xl md:text-7xl font-serif font-bold text-white mb-4 leading-tight shadow-xl drop-shadow-lg">
                            {hangout.title}
                        </h1>
                        <div className="flex flex-wrap items-center gap-6 text-sm md:text-base text-white/90 font-medium">
                            {hangout.scheduledFor && (
                                <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-lg border border-white/10 backdrop-blur-sm">
                                    <Calendar className="w-4 h-4 text-primary" />
                                    <span>{format(new Date(hangout.scheduledFor), "EEE, MMM do @ h:mm a")}</span>
                                </div>
                            )}
                            {hangout.finalActivity && hangout.status !== "VOTING" && (
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hangout.finalActivity.name + ' ' + (hangout.finalActivity.address || ''))}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 hover:text-primary transition-colors bg-black/30 px-3 py-1.5 rounded-lg border border-white/10 backdrop-blur-sm"
                                >
                                    <MapPin className="w-4 h-4 text-primary" />
                                    <span>{hangout.finalActivity.name}</span>
                                </a>
                            )}
                            {hangout.status === "VOTING" && (
                                <div className="flex items-center gap-2 text-primary bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20 backdrop-blur-sm">
                                    <Sparkles className="w-4 h-4" />
                                    <span className="font-bold uppercase tracking-wider">Voting in Progress</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto max-w-2xl p-6 space-y-8">
                {/* Participants */}
                <div className="glass-card p-6 rounded-2xl">
                    <h2 className="text-2xl font-serif font-semibold text-foreground mb-4 flex items-center justify-between">
                        Who's Going?
                        <span className="text-xs font-sans font-normal text-muted-foreground bg-white/5 px-2 py-1 rounded-full">{participants.length}</span>
                    </h2>
                    <div className="flex flex-col gap-3">
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
                                                <Sparkles className="w-2.5 h-2.5 text-white" />
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
                                                    href={`sms:${p.guest.phone || ''}?body=${encodeURIComponent(`Hey ${p.guest.displayName}, join my hangout here: https://plans.ai/h/${hangout.slug}?guestToken=${p.guest.token}`)}`}
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

                {/* Feedback Trigger (Post-Hangout) */}
                <FeedbackTrigger
                    hangoutId={hangout.id}
                    hangoutTitle={hangout.title}
                    isParticipant={!!currentUserParticipant}
                    hasFeedback={hangout.feedbacks.some((f: any) => f.profileId === currentUserParticipant?.profileId)}
                    isPast={!!hangout.scheduledFor && new Date(hangout.scheduledFor) < new Date()}
                />

                {/* Guest Join / Participation */}
                {!currentUserParticipant ? (
                    <GuestJoinForm hangoutId={hangout.id} />
                ) : (
                    <>
                        {/* Your RSVP & Description */}
                        <div className="glass p-6 rounded-2xl border border-white/5 bg-slate-900/50">
                            <h2 className="text-lg font-semibold text-white mb-4">Your Response</h2>
                            <div className="flex gap-4 mb-8">
                                {hangout.status !== "VOTING" && <RsvpButtons hangoutId={hangout.id} currentStatus={currentUserParticipant?.rsvpStatus} />}
                            </div>

                            {/* Polaroid Vibe Section */}
                            <div className="mb-8 relative group">
                                <div className="absolute inset-0 bg-white transform rotate-1 rounded-xl shadow-xl z-0 transition-transform group-hover:rotate-2 duration-500" />
                                <div className="relative z-10 bg-[#fafafa] p-6 pb-12 rounded-xl shadow-inner border border-stone-200">
                                    <div className="flex items-center justify-between mb-4 border-b border-stone-300 pb-2 border-dashed">
                                        <label className="text-xs font-bold text-stone-500 uppercase tracking-widest flex items-center gap-2">
                                            <span className="text-lg">📸</span> The Note
                                        </label>
                                        {userId === hangout.creator.clerkId && !isEditingDescription && (
                                            <button
                                                onClick={() => setIsEditingDescription(true)}
                                                className="text-xs font-bold text-stone-400 hover:text-stone-600 uppercase tracking-wider"
                                            >
                                                Edit Note
                                            </button>
                                        )}
                                    </div>

                                    {isEditingDescription ? (
                                        <div className="space-y-3">
                                            <textarea
                                                value={editedDescription}
                                                onChange={(e) => setEditedDescription(e.target.value)}
                                                className="w-full bg-white border border-stone-300 rounded-lg px-4 py-3 text-lg font-serif text-stone-800 focus:outline-none focus:border-stone-500 focus:ring-1 focus:ring-stone-500 resize-none h-32 leading-relaxed"
                                                placeholder="Write a note about the plan..."
                                                autoFocus
                                            />
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => setIsEditingDescription(false)}
                                                    className="px-3 py-1.5 text-xs font-bold text-stone-500 hover:text-stone-800 uppercase"
                                                >
                                                    Discard
                                                </button>
                                                <button
                                                    onClick={handleSaveDescription}
                                                    disabled={isSaving}
                                                    className="px-4 py-1.5 text-xs bg-stone-800 text-white rounded-lg font-bold hover:bg-stone-700 disabled:opacity-50 uppercase tracking-wider"
                                                >
                                                    {isSaving ? "Saving..." : "Pin Note"}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="relative min-h-[60px]">
                                            {hangout.description ? (
                                                <p className="text-xl font-serif text-stone-800 leading-relaxed italic opacity-90">
                                                    "{hangout.description}"
                                                </p>
                                            ) : (
                                                userId === hangout.creator.clerkId ? (
                                                    <button
                                                        onClick={() => setIsEditingDescription(true)}
                                                        className="text-stone-400 italic text-lg hover:text-stone-600 w-full text-left"
                                                    >
                                                        Add a handwritten note...
                                                    </button>
                                                ) : (
                                                    <span className="text-stone-400 italic">No note attached yet.</span>
                                                )
                                            )}
                                        </div>
                                    )}
                                </div>
                                {/* Tape effect */}
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-8 bg-white/20 backdrop-blur-sm border border-white/30 skew-y-1 shadow-sm z-20" />
                            </div>
                        </div>
                    </>
                )}

                {/* Shared Gallery */}
                <div className="glass p-6 rounded-2xl border border-white/5 bg-slate-900/50">
                    <PhotoGallery
                        hangoutId={hangout.id}
                        initialPhotos={hangout.photos.map((p: any) => ({
                            id: p.id,
                            url: p.url,
                            caption: p.caption,
                            uploader: {
                                displayName: p.uploader.displayName,
                                avatarUrl: p.uploader.avatarUrl
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
                                    <AvatarImage src={selectedPhoto.uploader.avatarUrl} />
                                    <AvatarFallback>{selectedPhoto.uploader.displayName?.[0]}</AvatarFallback>
                                </Avatar>
                                <span>Uploaded by {selectedPhoto.uploader.displayName}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Activity Details & Voting */}
                {(hangout.status === "PLANNING" || hangout.status === "VOTING") && hangout.activityOptions.length > 1 ? (
                    <div className="space-y-8">
                        <HangoutVoting
                            hangoutId={hangout.id}
                            currentUserIds={profile ? [profile.id] : []}
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
                                userVote: opt.votes.find((v: any) => v.profileId === profile?.id)?.value || 0
                            }))}
                            allowParticipantSuggestions={hangout.allowParticipantSuggestions}
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
                                    options={hangout.timeOptions.map((t: any) => ({
                                        id: t.id,
                                        startTime: t.startTime,
                                        endTime: t.endTime || null,
                                        votes: t.votes
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
                                    title={hangout.title}
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
                                            <div className="w-full h-full flex items-center justify-center text-slate-600">
                                                <MapPin className="w-8 h-8" />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(act.name + ' ' + (act.address || ''))}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group/link"
                                        >
                                            <h3 className="font-bold text-slate-200 group-hover/link:text-violet-400 transition-colors">{act.name}</h3>
                                            <p className="text-sm text-slate-400 mb-2 group-hover/link:text-slate-300 transition-colors">{act.address}</p>
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

            {/* Guest Claim Modal */}
            {guestsToClaim.length > 0 && (
                <GuestClaimUI hangoutId={hangout.id} guests={guestsToClaim} />
            )}
        </div>
    );
}
