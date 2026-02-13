"use client";


import { ProfileHero } from "./ProfileHero";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Sparkles, Zap, Star, Clock, ShieldAlert, MessageCircle, ArrowLeft, Send, MapPin, Utensils, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface ProfileViewerProps {
    profile: {
        id: string;
        displayName: string | null;
        avatarUrl: string | null;
        bio?: string | null;
        mbti?: string | null;
        enneagram?: string | null;
        zodiac?: string | null;
        customPersonality?: string | null;
        dietaryPreferences?: string[];
        interests?: string[];
        socialEnergy?: number | null;
        vibeTags?: string[];
        budgetComfort?: number | null;
        availabilityWindows?: string[];
        dealbreakers?: string[];
        funFacts?: string[];
        transportMode?: string | null;
        cuisinePreferences?: string[];
        drinkPreferences?: string[];
    };
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
        <div className="w-full max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500 delay-150 pb-24">
            {/* Header / Nav */}
            <div className="flex items-center gap-4 px-2">
                <Link href="/friends" className="p-2 -ml-2 hover:bg-white/5 rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6 text-muted-foreground" />
                </Link>
                <h2 className="text-xl font-serif font-bold text-foreground">Profile</h2>
            </div>

            {/* Hero Section */}
            <div className="animate-in fade-in zoom-in-95 duration-700">
                <ProfileHero
                    profile={profile}
                    isOwner={false}
                    onMessage={handleMessage}
                />
            </div>

            {/* Data Grid / Spec Sheet */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Column 1: Core Logistics */}
                <div className="space-y-6">
                    <section>
                        <h3 className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest mb-4 border-b border-border pb-2">
                            Logistics Profile
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-border/50">
                                <span className="text-sm font-medium text-muted-foreground">Transport Mode</span>
                                <span className="text-sm font-bold text-foreground">{profile.transportMode || "Not Specified"}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-border/50">
                                <span className="text-sm font-medium text-muted-foreground">Social Battery</span>
                                <span className="text-sm font-bold text-foreground">{ENERGY_LABELS[Math.max(0, (profile.socialEnergy || 3) - 1)]?.split(" ")[0]} ({profile.socialEnergy}/5)</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-border/50">
                                <span className="text-sm font-medium text-muted-foreground">Budget Tier</span>
                                <span className="text-sm font-bold text-foreground">{BUDGET_LABELS[Math.max(0, (profile.budgetComfort || 2) - 1)]?.split(" ")[0]}</span>
                            </div>
                            <div className="py-2">
                                <span className="text-sm font-medium text-muted-foreground block mb-2">Availability</span>
                                <div className="flex flex-wrap gap-2">
                                    {profile.availabilityWindows?.length ? (
                                        profile.availabilityWindows.map(w => (
                                            <span key={w} className="px-2 py-1 bg-muted/50 border border-border rounded text-xs font-mono text-foreground">
                                                {w}
                                            </span>
                                        ))
                                    ) : <span className="text-sm text-foreground/50 italic">Unspecified</span>}
                                </div>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest mb-4 border-b border-border pb-2">
                            Planning Priorities
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {profile.vibeTags?.length ? (
                                profile.vibeTags.map(tag => (
                                    <span key={tag} className="px-3 py-1 bg-foreground text-background text-xs font-bold uppercase tracking-wide rounded-sm">
                                        {tag}
                                    </span>
                                ))
                            ) : <span className="text-sm text-foreground/50 italic">No priorities set</span>}
                        </div>
                    </section>
                </div>

                {/* Column 2: Personal Preferences */}
                <div className="space-y-6">
                    <section>
                        <h3 className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest mb-4 border-b border-border pb-2">
                            Personal Data
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-border/50">
                                <span className="text-sm font-medium text-muted-foreground">MBTI</span>
                                <span className="text-sm font-mono text-foreground">{profile.mbti || "—"}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-border/50">
                                <span className="text-sm font-medium text-muted-foreground">Zodiac</span>
                                <span className="text-sm font-mono text-foreground">{profile.zodiac || "—"}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-border/50">
                                <span className="text-sm font-medium text-muted-foreground">Enneagram</span>
                                <span className="text-sm font-mono text-foreground">{profile.enneagram?.split("-")[0].trim() || "—"}</span>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest mb-4 border-b border-border pb-2">
                            Preferences
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h4 className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Cuisines</h4>
                                <div className="flex flex-wrap gap-1">
                                    {profile.cuisinePreferences?.length ? (
                                        profile.cuisinePreferences.map(c => <span key={c} className="text-xs text-foreground bg-muted/30 px-1.5 py-0.5 rounded-sm border border-border/50">{c}</span>)
                                    ) : <span className="text-xs text-muted-foreground">–</span>}
                                </div>
                            </div>
                            <div>
                                <h4 className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Drinks</h4>
                                <div className="flex flex-wrap gap-1">
                                    {profile.drinkPreferences?.length ? (
                                        profile.drinkPreferences.map(d => <span key={d} className="text-xs text-foreground bg-muted/30 px-1.5 py-0.5 rounded-sm border border-border/50">{d}</span>)
                                    ) : <span className="text-xs text-muted-foreground">–</span>}
                                </div>
                            </div>
                            <div className="col-span-2">
                                <h4 className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Interests</h4>
                                <div className="flex flex-wrap gap-1">
                                    {profile.interests?.length ? (
                                        profile.interests.map(i => <span key={i} className="text-xs text-foreground bg-muted/30 px-1.5 py-0.5 rounded-sm border border-border/50">{i}</span>)
                                    ) : <span className="text-xs text-muted-foreground">–</span>}
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            {/* Dealbreakers & Fun Facts */}
            <div className="grid md:grid-cols-2 gap-4">
                {profile.dealbreakers && profile.dealbreakers.length > 0 && (
                    <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
                        <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-sm font-bold text-red-500 uppercase tracking-wide mb-1">Negative Constraints</h3>
                            <p className="text-sm text-foreground/80 leading-relaxed">
                                {profile.dealbreakers.join(", ")}
                            </p>
                        </div>
                    </div>
                )}

                {profile.funFacts && profile.funFacts.length > 0 && (
                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4 flex items-start gap-3">
                        <MessageCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-sm font-bold text-blue-500 uppercase tracking-wide mb-1">Subject Notes</h3>
                            <div className="space-y-1">
                                {profile.funFacts.map((fact, i) => (
                                    <p key={i} className="text-sm text-foreground/80 leading-relaxed">
                                        • {fact}
                                    </p>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
