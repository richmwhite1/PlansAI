
"use client";

import { Edit3, MessageCircle, MapPin, Activity, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileHeroProps {
    profile: {
        id: string;
        displayName: string | null;
        avatarUrl: string | null;
        bio?: string | null;
        homeCity?: string | null;
        homeState?: string | null;
        homeZipcode?: string | null;
        travelRadiusMiles?: number | null;
        hangoutCount?: number;
        trustScore?: number;
        _count?: {
            friendshipsA: number;
            friendshipsB: number;
            hangoutsCreated: number;
            participants: number;
        };
    };
    isOwner: boolean;
    onEdit?: () => void;
    onMessage?: () => void;
}

export function ProfileHero({ profile, isOwner, onEdit, onMessage }: ProfileHeroProps) {
    // Calculate Stats
    const friendCount = (profile._count?.friendshipsA || 0) + (profile._count?.friendshipsB || 0);
    const experienceCount = (profile._count?.hangoutsCreated || 0) + (profile._count?.participants || 0); // Created + Attended

    // Format Location
    const locationString = profile.homeCity && profile.homeState
        ? `${profile.homeCity}, ${profile.homeState}`
        : (profile.homeZipcode ? `Zip: ${profile.homeZipcode}` : "Location Unset");

    return (
        <div className="w-full relative overflow-hidden rounded-3xl bg-slate-900/40 border border-white/10 shadow-2xl">
            {/* Ambient Background */}
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative p-6 md:p-10 flex flex-col md:flex-row items-center md:items-start gap-8">
                {/* Avatar - Premium & Full Color */}
                <div className="shrink-0 relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-amber-400/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    <img
                        src={profile.avatarUrl || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"}
                        alt={profile.displayName || "User"}
                        className="relative w-28 h-28 md:w-36 md:h-36 rounded-2xl object-cover border-2 border-white/10 shadow-xl"
                    />
                    {isOwner && (
                        <button
                            onClick={onEdit}
                            className="absolute -bottom-2 -right-2 p-2 bg-slate-900 border border-white/10 rounded-xl text-primary hover:text-white hover:bg-primary/20 transition-colors shadow-lg"
                        >
                            <Edit3 className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Main Info */}
                <div className="flex-1 text-center md:text-left space-y-4">
                    <div className="space-y-1">
                        <h1 className="text-3xl md:text-4xl font-serif font-bold text-white tracking-tight">
                            {profile.displayName || "Unknown Subject"}
                        </h1>
                        <p className="text-sm font-medium text-primary uppercase tracking-widest flex items-center justify-center md:justify-start gap-2">
                            Member <span className="text-white/20">|</span> Since 2024
                        </p>
                    </div>

                    <p className="text-lg text-slate-300 font-light leading-relaxed max-w-2xl">
                        {profile.bio || "Crafting the perfect plans, one invite at a time."}
                    </p>

                    {/* Key Stats Row - Gold Accents */}
                    <div className="flex flex-wrap gap-6 justify-center md:justify-start pt-4">
                        <div className="flex flex-col gap-1">
                            <span className="text-xs text-slate-500 uppercase tracking-wider">Location</span>
                            <div className="flex items-center gap-2 text-slate-200">
                                <MapPin className="w-4 h-4 text-primary" />
                                <span className="font-serif italic">{locationString}</span>
                            </div>
                        </div>
                        <div className="w-px h-10 bg-white/5 hidden md:block" />
                        <div className="flex flex-col gap-1">
                            <span className="text-xs text-slate-500 uppercase tracking-wider">Experience</span>
                            <div className="flex items-center gap-2 text-slate-200">
                                <Activity className="w-4 h-4 text-primary" />
                                <span className="font-serif italic">{experienceCount} Plans</span>
                            </div>
                        </div>
                        <div className="w-px h-10 bg-white/5 hidden md:block" />
                        <div className="flex flex-col gap-1">
                            <span className="text-xs text-slate-500 uppercase tracking-wider">Network</span>
                            <div className="flex items-center gap-2 text-slate-200">
                                <ShieldCheck className="w-4 h-4 text-primary" />
                                <span className="font-serif italic">{friendCount} Friends</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3 shrink-0 pt-2">
                    {!isOwner && (
                        <button
                            onClick={onMessage}
                            className="flex items-center gap-2 px-6 py-3 bg-white text-black text-sm font-bold rounded-xl hover:bg-slate-200 transition-colors shadow-lg shadow-white/5"
                        >
                            <MessageCircle className="w-4 h-4" />
                            Send Message
                        </button>
                    )}
                </div>
            </div>

            {/* Decorative Gold Line */}
            <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-30" />
        </div>
    );
}
