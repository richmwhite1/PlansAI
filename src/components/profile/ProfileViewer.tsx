"use client";


import { ProfileHero } from "./ProfileHero";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Sparkles, Zap, Star, Clock, ShieldAlert, MessageCircle, ArrowLeft, Send, MapPin, Utensils, DollarSign, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useState, useEffect } from "react";

import { ExtendedProfile } from "@/lib/profile-utils";

interface ProfileViewerProps {
    profile: NonNullable<ExtendedProfile>;
}

interface HangoutHistoryItem {
    hangoutId: string;
    title: string;
    date: string;
    activity: {
        name: string;
        category: string;
        imageUrl: string | null;
        rating: number | null;
        address: string | null;
    };
    userRating: number | null;
    reflection: string | null;
    vibes: string[];
    participantCount: number;
}

const ENERGY_LABELS = ["🐢 Very Introverted", "🌿 Introverted", "⚖️ Ambivert", "🌟 Extroverted", "🔥 Very Extroverted"];
const BUDGET_LABELS = ["$ Free/Cheap", "$$ Moderate", "$$$ Nice", "$$$$ Luxury"];

export function ProfileViewer({ profile }: ProfileViewerProps) {
    const { user } = useUser();
    const router = useRouter();
    const [hangoutHistory, setHangoutHistory] = useState<HangoutHistoryItem[]>([]);

    useEffect(() => {
        fetch(`/api/users/${profile.id}/hangout-history`)
            .then(r => r.json())
            .then(data => {
                if (data.history) setHangoutHistory(data.history);
            })
            .catch(() => { });
    }, [profile.id]);

    const handleMessage = async () => {
        try {
            const res = await fetch("/api/messages/conversations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ profileId: profile.id })
            });
            if (res.ok) {
                const data = await res.json();
                router.push(`/messages/${data.conversation.id}`);
            }
        } catch (error) {
            console.error("Failed to start conversation", error);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700 delay-150 pb-32">
            {/* Header / Nav */}
            <div className="flex items-center gap-4 px-2">
                <Link href="/friends" className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <h2 className="text-xl font-serif font-bold text-slate-200">The Profile</h2>
            </div>

            {/* Hero Section */}
            <div className="animate-in fade-in zoom-in-95 duration-700">
                <ProfileHero
                    profile={profile}
                    isOwner={false}
                    onMessage={handleMessage}
                />
            </div>

            {/* Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* About & Personality */}
                <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-6 md:p-8 space-y-8">
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-violet-500/10 rounded-xl">
                                <Zap className="w-5 h-5 text-violet-400" />
                            </div>
                            <h3 className="text-xl font-serif font-bold text-white">Personality</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-800/30 rounded-2xl p-4 border border-white/5">
                                <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1 font-bold">MBTI</span>
                                <span className="text-lg font-bold text-white tracking-wide">{profile.mbti || "—"}</span>
                            </div>
                            <div className="bg-slate-800/30 rounded-2xl p-4 border border-white/5">
                                <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1 font-bold">Zodiac</span>
                                <span className="text-lg font-bold text-white tracking-wide">{profile.zodiac || "—"}</span>
                            </div>
                            <div className="col-span-2 bg-slate-800/30 rounded-2xl p-4 border border-white/5">
                                <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1 font-bold">Enneagram</span>
                                <span className="text-lg font-bold text-white tracking-wide">{profile.enneagram || "—"}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-white/5">
                        <span className="text-sm font-medium text-slate-400 block">Planning Priorities</span>
                        <div className="flex flex-wrap gap-2">
                            {profile.vibeTags?.length ? (
                                profile.vibeTags.map(tag => (
                                    <span key={tag} className="px-3 py-1.5 bg-white text-black text-xs font-bold uppercase tracking-wide rounded-lg shadow-lg shadow-white/10">
                                        {tag}
                                    </span>
                                ))
                            ) : <span className="text-sm text-slate-600 italic">No priorities set</span>}
                        </div>
                    </div>
                </div>

                {/* Logistics & Vibe */}
                <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-6 md:p-8 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <MapPin className="w-5 h-5 text-primary" />
                        </div>
                        <h3 className="text-xl font-serif font-bold text-white">Vibe & Velocity</h3>
                    </div>

                    <div className="space-y-6">
                        <div className="flex justify-between items-center group">
                            <span className="text-sm font-medium text-slate-500 group-hover:text-slate-400 transition-colors">On the Move</span>
                            <span className="text-base font-bold text-slate-200">{profile.transportMode || "Not Specified"}</span>
                        </div>
                        <div className="w-full h-px bg-white/5" />

                        <div className="flex justify-between items-center group">
                            <span className="text-sm font-medium text-slate-500 group-hover:text-slate-400 transition-colors">Social Battery</span>
                            <div className="text-right">
                                <span className="block text-base font-bold text-slate-200">{ENERGY_LABELS[Math.max(0, (profile.socialEnergy || 3) - 1)]?.split(" ").slice(1).join(" ")}</span>
                                <div className="flex gap-1 mt-1 justify-end">
                                    {[1, 2, 3, 4, 5].map((level) => (
                                        <div
                                            key={level}
                                            className={cn(
                                                "w-1.5 h-1.5 rounded-full transition-all duration-500",
                                                (profile.socialEnergy || 3) >= level ? "bg-primary" : "bg-slate-800"
                                            )}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="w-full h-px bg-white/5" />

                        <div className="flex justify-between items-center group">
                            <span className="text-sm font-medium text-slate-500 group-hover:text-slate-400 transition-colors">Budget Vibe</span>
                            <span className="text-base font-bold text-primary font-serif italic">{BUDGET_LABELS[Math.max(0, (profile.budgetComfort || 2) - 1)]?.split(" ").slice(1).join(" ")}</span>
                        </div>

                        <div className="pt-4 border-t border-white/5">
                            <span className="text-sm font-medium text-slate-400 block mb-3">Usually Free...</span>
                            <div className="flex flex-wrap gap-2">
                                {profile.availabilityWindows?.length ? (
                                    profile.availabilityWindows.map(w => (
                                        <span key={w} className="px-3 py-1.5 bg-slate-800/50 border border-white/5 rounded-lg text-xs font-medium text-slate-300">
                                            {w}
                                        </span>
                                    ))
                                ) : <span className="text-sm text-slate-600 italic">Unspecified</span>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Fun Facts (Full Width) */}
                {(profile.funFacts?.length ?? 0) > 0 && (
                    <div className="md:col-span-2 bg-primary/5 border border-white/5 rounded-3xl p-6 md:p-8 space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-500/10 rounded-xl">
                                <MessageCircle className="w-5 h-5 text-amber-400" />
                            </div>
                            <h3 className="text-xl font-serif font-bold text-white">A Little Extra</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {profile.funFacts?.map((fact, i) => (
                                <div key={i} className="bg-white/5 p-4 rounded-2xl border border-white/5 text-slate-200 text-sm leading-relaxed">
                                    {fact}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Preferences Card (Full Width) */}
                <div className="md:col-span-2 bg-slate-900/40 border border-white/5 rounded-3xl p-6 md:p-8 space-y-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/10 rounded-xl">
                            <Utensils className="w-5 h-5 text-emerald-400" />
                        </div>
                        <h3 className="text-xl font-serif font-bold text-white">The Menu</h3>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cuisines</h4>
                            <div className="flex flex-wrap gap-2">
                                {profile.cuisinePreferences?.length ? (
                                    profile.cuisinePreferences.map(c => (
                                        <span key={c} className="text-sm text-slate-300 bg-slate-800/50 px-3 py-1 rounded-full border border-white/10">{c}</span>
                                    ))
                                ) : <span className="text-sm text-slate-600 italic">–</span>}
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Drinks</h4>
                            <div className="flex flex-wrap gap-2">
                                {profile.drinkPreferences?.length ? (
                                    profile.drinkPreferences.map(d => (
                                        <span key={d} className="text-sm text-slate-300 bg-slate-800/50 px-3 py-1 rounded-full border border-white/10">{d}</span>
                                    ))
                                ) : <span className="text-sm text-slate-600 italic">–</span>}
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Passions</h4>
                            <div className="flex flex-wrap gap-2">
                                {profile.interests?.length ? (
                                    profile.interests.map(i => (
                                        <span key={i} className="text-sm text-slate-300 bg-slate-800/50 px-3 py-1 rounded-full border border-white/10">{i}</span>
                                    ))
                                ) : <span className="text-sm text-slate-600 italic">–</span>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── Past Adventures (Full Width) ─── */}
                {hangoutHistory.length > 0 && (
                    <div className="md:col-span-2 bg-slate-900/40 border border-white/5 rounded-3xl p-6 md:p-8 space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-xl">
                                <Calendar className="w-5 h-5 text-primary" />
                            </div>
                            <h3 className="text-xl font-serif font-bold text-white">Past Adventures</h3>
                            <span className="ml-auto text-xs text-slate-500 font-medium">{hangoutHistory.length} hangouts</span>
                        </div>

                        <div className="space-y-3">
                            {hangoutHistory.map((h) => (
                                <div key={h.hangoutId} className="flex items-center gap-4 bg-white/5 rounded-2xl p-4 border border-white/5 hover:border-white/10 transition-colors">
                                    {/* Activity image */}
                                    <div className="w-12 h-12 rounded-xl bg-slate-800 overflow-hidden shrink-0 border border-white/10">
                                        {h.activity.imageUrl ? (
                                            <img src={h.activity.imageUrl} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <MapPin className="w-5 h-5 text-slate-600" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-white text-sm truncate">{h.activity.name}</p>
                                        <p className="text-xs text-slate-500">
                                            {new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            {h.participantCount > 1 && ` • ${h.participantCount} people`}
                                        </p>
                                        {h.vibes.length > 0 && (
                                            <div className="flex gap-1 mt-1">
                                                {h.vibes.slice(0, 3).map((v: string) => (
                                                    <span key={v} className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">#{v}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Star rating */}
                                    {h.userRating && (
                                        <div className="flex items-center gap-0.5 shrink-0">
                                            {[1, 2, 3, 4, 5].map(s => (
                                                <Star
                                                    key={s}
                                                    className={cn(
                                                        "w-3.5 h-3.5",
                                                        s <= h.userRating! ? "text-amber-400 fill-amber-400" : "text-slate-700"
                                                    )}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Dealbreakers & Notes */}
                {(profile.dealbreakers?.length ?? 0) > 0 && (
                    <div className="md:col-span-2 bg-red-500/5 border border-red-500/10 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-6">
                        <div className="p-3 bg-red-500/10 rounded-2xl shrink-0">
                            <ShieldAlert className="w-6 h-6 text-red-500" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-lg font-serif font-bold text-red-200">The Hard Boundaries</h3>
                            <p className="text-red-200/80 leading-relaxed text-sm">
                                {profile.dealbreakers?.join(", ")}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
