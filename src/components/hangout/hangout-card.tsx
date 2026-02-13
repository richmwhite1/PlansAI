"use client";

import NextLink from "next/link";
import { format } from "date-fns";
import { MapPin, Calendar, Clock, Check, X, Compass } from "lucide-react";
import { cn } from "@/lib/utils";

interface HangoutCardProps {
    hangout: any;
    variant: "pending" | "upcoming" | "past";
}

export function HangoutCard({ hangout, variant }: HangoutCardProps) {
    const statusColors: any = {
        PLANNING: "bg-amber-500/20 text-amber-400 border-amber-500/30",
        VOTING: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        CONFIRMED: "bg-green-500/20 text-green-400 border-green-500/30",
        ACTIVE: "bg-primary/20 text-primary border-primary/30",
        COMPLETED: "bg-slate-500/20 text-slate-400 border-slate-500/30",
        CANCELLED: "bg-rose-500/20 text-rose-400 border-rose-500/30"
    };

    const rsvpLabels: any = {
        GOING: { label: "Going", color: "text-green-400", icon: Check },
        MAYBE: { label: "Maybe", color: "text-amber-400", icon: Clock },
        NOT_GOING: { label: "Not Going", color: "text-rose-400", icon: X },
        PENDING: { label: "Pending", color: "text-slate-400", icon: Clock }
    };

    const rsvp = rsvpLabels[hangout.myRsvp] || rsvpLabels.PENDING;
    const RsvpIcon = rsvp.icon;

    return (
        <NextLink
            href={`/hangouts/${hangout.slug}`}
            className="block p-4 glass-card hover:bg-white/5 hover:border-white/10 transition-all group"
        >
            <div className="flex gap-4">
                <div className="w-16 h-16 rounded-lg bg-slate-800 shrink-0 overflow-hidden">
                    {(hangout.finalActivity?.imageUrl || hangout.activity?.image) ? (
                        <img
                            src={hangout.finalActivity?.imageUrl || hangout.activity?.image}
                            alt=""
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <img
                            src="/images/hangout-placeholder.png"
                            alt=""
                            className="w-full h-full object-cover opacity-80"
                        />
                    )}
                </div>

                {/* Center: Details */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="min-w-0">
                            <h3 className="font-medium text-slate-200 truncate group-hover:text-white transition-colors">
                                {hangout.title}
                            </h3>
                            <div className="flex items-center gap-2">
                                <p className="text-[10px] text-slate-500 font-medium">
                                    {hangout.isCreator ? "Created by you" : `By ${hangout.creator.displayName || hangout.creator.name || "someone"}`}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium", statusColors[hangout.status])}>
                                {hangout.status}
                            </span>
                            {hangout.visibility === "PUBLIC" && (
                                <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-[0.15em] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                                    <Compass className="w-2.5 h-2.5" />
                                    Public Plan
                                </span>
                            )}
                        </div>
                    </div>

                    {hangout.scheduledFor ? (
                        <p className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(hangout.scheduledFor), "EEE, MMM d 'at' h:mm a")}
                        </p>
                    ) : (
                        <p className="text-xs text-slate-500 flex items-center gap-1.5 mb-1 italic">
                            <Clock className="w-3 h-3" />
                            To be scheduled
                        </p>
                    )}

                    <div className="flex items-center gap-3">
                        <div className={cn("flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider", rsvp.color)}>
                            <RsvpIcon className="w-3 h-3" />
                            {rsvp.label}
                        </div>
                        {hangout.finalActivity && (
                            <p className="text-xs text-slate-500 flex items-center gap-1.5 truncate">
                                <MapPin className="w-3 h-3" />
                                {hangout.finalActivity.name}
                            </p>
                        )}
                    </div>
                </div>

                {/* Right: Participants */}
                <div className="flex flex-col items-end justify-center gap-2">
                    <div className="flex -space-x-2">
                        {hangout.participants?.slice(0, 3).map((p: any) => (
                            <div
                                key={p.id}
                                title={p.profile?.displayName || p.guest?.displayName || "Participant"}
                                className="block w-6 h-6 rounded-full bg-slate-700 ring-2 ring-slate-950 overflow-hidden"
                            >
                                {p.profile?.avatarUrl ? (
                                    <img src={p.profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[8px] text-slate-400 font-bold bg-slate-800">
                                        {(p.profile?.displayName || p.guest?.displayName || "?").charAt(0)}
                                    </div>
                                )}
                            </div>
                        ))}
                        {(hangout.participants?.length || 0) > 3 && (
                            <div className="w-6 h-6 rounded-full bg-slate-800 ring-2 ring-slate-950 flex items-center justify-center text-[10px] text-slate-400 font-medium">
                                +{(hangout.participants?.length || 0) - 3}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </NextLink>
    );
}
