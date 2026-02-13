"use client";


import { ProfileHero } from "./ProfileHero";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Sparkles, Zap, Star, Clock, ShieldAlert, MessageCircle, ArrowLeft, Send, MapPin, Utensils, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

import { ExtendedProfile } from "@/lib/profile-utils";

interface ProfileViewerProps {
    profile: NonNullable<ExtendedProfile>;
}

const ENERGY_LABELS = ["🐢 Very Introverted", "🌿 Introverted", "⚖️ Ambivert", "🌟 Extroverted", "🔥 Very Extroverted"];
const BUDGET_LABELS = ["$ Free/Cheap", "$$ Moderate", "$$$ Nice", "$$$$ Luxury"];

export function ProfileViewer({ profile }: ProfileViewerProps) {
    const { user } = useUser();
    const router = useRouter();

    // Check if this is the current user viewing themselves (shouldn't happen often if routing is correct, but good safety)
    const isMe = user?.id === profile.id; // Note: profile.id is internal ID, user.id is Clerk ID. 
    // Actually, we can't easily check isMe here without the local profile ID of the logged in user.
    // For now, we'll assume the parent component handles the "Edit" redirections if it's the own user.

    const handleMessage = async () => {
        // Optimistically redirect to messages with this user
        // We'll need an API to find/create conversation, but for now let's just go to messages
        // Improve: Call API to get conversation ID then redirect
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
                <h2 className="text-xl font-serif font-bold text-slate-200">Executive Profile</h2>
            </div>

            {/* Hero Section */}
            <div className="animate-in fade-in zoom-in-95 duration-700">
                <ProfileHero
                    profile={profile}
                    isOwner={false}
                    onMessage={handleMessage}
                />
            </div>

            {/* Executive Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Logistics Card */}
                <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-6 md:p-8 space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <MapPin className="w-5 h-5 text-primary" />
                        </div>
                        <h3 className="text-xl font-serif font-bold text-white">Logistics</h3>
                    </div>

                    <div className="space-y-5">
                        <div className="flex justify-between items-center group">
                            <span className="text-sm font-medium text-slate-500 group-hover:text-slate-400 transition-colors">Transport</span>
                            <span className="text-base font-bold text-slate-200">{profile.transportMode || "Not Specified"}</span>
                        </div>
                        <div className="w-full h-px bg-white/5" />

                        <div className="flex justify-between items-center group">
                            <span className="text-sm font-medium text-slate-500 group-hover:text-slate-400 transition-colors">Social Battery</span>
                            <div className="text-right">
                                <span className="block text-base font-bold text-slate-200">{ENERGY_LABELS[Math.max(0, (profile.socialEnergy || 3) - 1)]?.split(" ")[0]}</span>
                                <div className="flex gap-1 mt-1 justify-end">
                                    {[1, 2, 3, 4, 5].map((level) => (
                                        <div
                                            key={level}
                                            className={cn(
                                                "w-1.5 h-1.5 rounded-full",
                                                (profile.socialEnergy || 3) >= level ? "bg-primary" : "bg-slate-800"
                                            )}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="w-full h-px bg-white/5" />

                        <div className="flex justify-between items-center group">
                            <span className="text-sm font-medium text-slate-500 group-hover:text-slate-400 transition-colors">Budget Tier</span>
                            <span className="text-base font-bold text-primary font-serif italic">{BUDGET_LABELS[Math.max(0, (profile.budgetComfort || 2) - 1)]}</span>
                        </div>

                        <div className="pt-2">
                            <span className="text-sm font-medium text-slate-500 block mb-3">Availability Windows</span>
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

                {/* Personal Data Card */}
                <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-6 md:p-8 space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-violet-500/10 rounded-xl">
                            <Zap className="w-5 h-5 text-violet-400" />
                        </div>
                        <h3 className="text-xl font-serif font-bold text-white">Personality</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-800/30 rounded-2xl p-4 border border-white/5">
                            <span className="text-xs text-slate-500 uppercase tracking-wider block mb-1">MBTI</span>
                            <span className="text-lg font-bold text-white">{profile.mbti || "—"}</span>
                        </div>
                        <div className="bg-slate-800/30 rounded-2xl p-4 border border-white/5">
                            <span className="text-xs text-slate-500 uppercase tracking-wider block mb-1">Zodiac</span>
                            <span className="text-lg font-bold text-white">{profile.zodiac || "—"}</span>
                        </div>
                        <div className="col-span-2 bg-slate-800/30 rounded-2xl p-4 border border-white/5">
                            <span className="text-xs text-slate-500 uppercase tracking-wider block mb-1">Enneagram</span>
                            <span className="text-lg font-bold text-white">{profile.enneagram || "—"}</span>
                        </div>
                    </div>

                    <div className="pt-2">
                        <span className="text-sm font-medium text-slate-500 block mb-3">Planning Priorities</span>
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

                {/* Preferences Card (Full Width) */}
                <div className="md:col-span-2 bg-slate-900/40 border border-white/5 rounded-3xl p-6 md:p-8 space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-500/10 rounded-xl">
                            <Utensils className="w-5 h-5 text-emerald-400" />
                        </div>
                        <h3 className="text-xl font-serif font-bold text-white">Tastes & Preferences</h3>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div>
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Cuisines</h4>
                            <div className="flex flex-wrap gap-2">
                                {profile.cuisinePreferences?.length ? (
                                    profile.cuisinePreferences.map(c => (
                                        <span key={c} className="text-sm text-slate-300 bg-slate-800/50 px-3 py-1 rounded-full border border-white/5">{c}</span>
                                    ))
                                ) : <span className="text-sm text-slate-600 italic">–</span>}
                            </div>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Drinks</h4>
                            <div className="flex flex-wrap gap-2">
                                {profile.drinkPreferences?.length ? (
                                    profile.drinkPreferences.map(d => (
                                        <span key={d} className="text-sm text-slate-300 bg-slate-800/50 px-3 py-1 rounded-full border border-white/5">{d}</span>
                                    ))
                                ) : <span className="text-sm text-slate-600 italic">–</span>}
                            </div>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Interests</h4>
                            <div className="flex flex-wrap gap-2">
                                {profile.interests?.length ? (
                                    profile.interests.map(i => (
                                        <span key={i} className="text-sm text-slate-300 bg-slate-800/50 px-3 py-1 rounded-full border border-white/5">{i}</span>
                                    ))
                                ) : <span className="text-sm text-slate-600 italic">–</span>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dealbreakers & Notes */}
                {(profile.dealbreakers?.length ?? 0) > 0 && (
                    <div className="md:col-span-2 bg-red-500/5 border border-red-500/10 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-4 text-center md:text-left">
                        <div className="p-3 bg-red-500/10 rounded-full shrink-0">
                            <ShieldAlert className="w-6 h-6 text-red-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-serif font-bold text-red-200 mb-2">Hard Constraints</h3>
                            <p className="text-red-200/80 leading-relaxed">
                                {profile.dealbreakers?.join(", ")}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
