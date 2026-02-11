"use client";

import { useState } from "react";
import { format } from "date-fns";
import { MapPin, Calendar, Sparkles, Users } from "lucide-react";
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

interface HangoutPageClientProps {
    hangout: any;
    userId: string | null;
    profile: any;
    currentUserParticipant: any;
}

export function HangoutPageClient({ hangout, userId, profile, currentUserParticipant }: HangoutPageClientProps) {
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

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-violet-500/30">
            {/* Header / Hero */}
            <div className="relative h-64 md:h-80 w-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent z-10" />
                <div className="absolute inset-0 bg-slate-900" />

                <div className="absolute bottom-0 left-0 w-full p-6 z-20">
                    <div className="container mx-auto max-w-2xl">
                        <span className="inline-block px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 text-xs font-semibold uppercase tracking-wider mb-2 border border-violet-500/30">
                            {hangout.status}
                        </span>
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                            {hangout.title}
                        </h1>
                        <div className="flex items-center gap-4 text-sm text-slate-300">
                            {hangout.scheduledFor && (
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="w-4 h-4 text-violet-400" />
                                    <span>{format(new Date(hangout.scheduledFor), "EEEE, MMM do 'at' h:mm a")}</span>
                                </div>
                            )}
                            {hangout.finalActivity && hangout.status !== "VOTING" && (
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hangout.finalActivity.name + ' ' + (hangout.finalActivity.address || ''))}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 hover:text-violet-400 transition-colors"
                                >
                                    <MapPin className="w-4 h-4 text-violet-400" />
                                    <span>{hangout.finalActivity.name}</span>
                                </a>
                            )}
                            {hangout.status === "VOTING" && (
                                <div className="flex items-center gap-1.5 text-amber-400">
                                    <Sparkles className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Voting in Progress</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto max-w-2xl p-6 space-y-8">
                {/* Participants */}
                <div className="glass p-6 rounded-2xl border border-white/5 bg-slate-900/50">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center justify-between">
                        Who's Going?
                        <span className="text-xs font-normal text-slate-500 bg-white/5 px-2 py-1 rounded-full">{hangout.participants.length}</span>
                    </h2>
                    <div className="flex flex-wrap gap-3">
                        {hangout.participants.map((p: any) => (
                            <div key={p.id} className="flex items-center gap-2 bg-white/5 p-2 pr-4 rounded-full border border-white/5">
                                <Avatar className="w-8 h-8 border border-white/10">
                                    <AvatarImage src={p.profile?.avatarUrl || undefined} />
                                    <AvatarFallback className="text-xs bg-slate-800 text-slate-400">
                                        {p.profile?.displayName?.slice(0, 2).toUpperCase() || "??"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-slate-200">
                                        {p.profile?.displayName || "Guest"}
                                    </span>
                                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                                        {p.rsvpStatus}
                                    </span>
                                </div>
                            </div>
                        ))}
                        <ShareButton hangoutId={hangout.id} />
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
                                <ShareButton hangoutId={hangout.id} />
                                {hangout.status !== "VOTING" && <RsvpButtons hangoutId={hangout.id} currentStatus={currentUserParticipant?.rsvpStatus} />}
                            </div>

                            {/* Description Block */}
                            <div className="mb-8">
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                        The Vibe
                                    </label>
                                </div>
                                {isEditingDescription ? (
                                    <div className="space-y-3">
                                        <textarea
                                            value={editedDescription}
                                            onChange={(e) => setEditedDescription(e.target.value)}
                                            className="w-full bg-slate-800 border border-violet-500/30 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-violet-500/50 resize-none h-24"
                                            placeholder="What's the vibe?"
                                        />
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => setIsEditingDescription(false)}
                                                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-300"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleSaveDescription}
                                                disabled={isSaving}
                                                className="px-4 py-1.5 text-xs bg-violet-600 text-white rounded-lg font-bold hover:bg-violet-500 disabled:opacity-50"
                                            >
                                                {isSaving ? "Saving..." : "Save Changes"}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        {hangout.description ? (
                                            <div className="group relative">
                                                <p className="text-slate-300 italic text-sm border-l-2 border-violet-500/30 pl-4 py-1 bg-white/5 rounded-r-xl pr-4">
                                                    "{hangout.description}"
                                                </p>
                                                {userId === hangout.creator.clerkId && (
                                                    <button
                                                        onClick={() => setIsEditingDescription(true)}
                                                        className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 text-[10px] text-violet-400 font-bold uppercase"
                                                    >
                                                        Edit
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            userId === hangout.creator.clerkId && (
                                                <button
                                                    onClick={() => setIsEditingDescription(true)}
                                                    className="text-xs text-slate-500 hover:text-violet-400 transition-colors border border-dashed border-white/10 rounded-xl px-4 py-2 w-full text-left"
                                                >
                                                    Add a description for your hangout...
                                                </button>
                                            )
                                        )}
                                    </div>
                                )}
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
        </div>
    );
}
