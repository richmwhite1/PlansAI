
"use client";

import { Edit3, MessageCircle, MapPin, Activity, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileHeroProps {
    profile: {
        id: string;
        displayName: string | null;
        avatarUrl: string | null;
        bio?: string | null;
        city?: string | null;
        travelRadiusMiles?: number | null;
        hangoutCount?: number | null;
        trustScore?: number | null;
    };
    isOwner: boolean;
    onEdit?: () => void;
    onMessage?: () => void;
}

export function ProfileHero({ profile, isOwner, onEdit, onMessage }: ProfileHeroProps) {
    return (
        <div className="w-full bg-card border border-border rounded-xl osverflow-hidden shadow-sm">
            <div className="p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-6">

                {/* Avatar - Strict Square/Circle */}
                <div className="shrink-0">
                    <img
                        src={profile.avatarUrl || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"}
                        alt={profile.displayName || "User"}
                        className="w-24 h-24 md:w-32 md:h-32 rounded-lg object-cover grayscale-[0.2] border border-border"
                    />
                </div>

                {/* Main Info */}
                <div className="flex-1 text-center md:text-left space-y-3">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground uppercase">
                            {profile.displayName || "Unknown Subject"}
                        </h1>
                        <p className="text-sm font-mono text-muted-foreground mt-1 uppercase tracking-wider flex items-center justify-center md:justify-start gap-2">
                            User Dossier <span className="text-xs opacity-50">#{profile.id.slice(-6)}</span>
                        </p>
                    </div>

                    <p className="text-base text-muted-foreground leading-relaxed max-w-2xl">
                        {profile.bio || "No summary available."}
                    </p>

                    {/* Key Stats Row */}
                    <div className="flex flex-wrap gap-4 md:gap-8 justify-center md:justify-start pt-2">
                        <div className="flex items-center gap-2 text-sm text-foreground/80">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <span>Radius: {profile.travelRadiusMiles || 25} mi</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-foreground/80">
                            <Activity className="w-4 h-4 text-muted-foreground" />
                            <span>Activity: {profile.hangoutCount || 0} events</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-foreground/80">
                            <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                            <span>Trust: {Math.round((profile.trustScore || 0.5) * 100)}/100</span>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 shrink-0">
                    {isOwner ? (
                        <button
                            onClick={onEdit}
                            className="flex items-center gap-2 px-5 py-2 bg-foreground text-background text-sm font-medium uppercase tracking-wide rounded-md hover:opacity-90 transition-opacity"
                        >
                            <Edit3 className="w-4 h-4" />
                            Update Record
                        </button>
                    ) : (
                        <button
                            onClick={onMessage}
                            className="flex items-center gap-2 px-5 py-2 bg-foreground text-background text-sm font-medium uppercase tracking-wide rounded-md hover:opacity-90 transition-opacity"
                        >
                            <MessageCircle className="w-4 h-4" />
                            Contact
                        </button>
                    )}
                </div>
            </div>

            {/* Technical Detail Bar */}
            <div className="bg-muted/50 px-6 py-2 border-t border-border flex justify-between items-center text-[10px] md:text-xs font-mono text-muted-foreground uppercase tracking-widest">
                <span>Status: Active</span>
                <span>Verified: Yes</span>
            </div>
        </div>
    );
}
