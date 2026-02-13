"use client";

import { useState } from "react";
import { updateProfile } from "@/app/actions/profile-actions";
import { useRouter } from "next/navigation";
import { TagInput } from "@/components/ui/tag-input";
import { Sparkles, Brain, Star, Fingerprint, Plus } from "lucide-react";

interface ProfileEditorProps {
    initialData: {
        bio?: string | null;
        mbti?: string | null;
        enneagram?: string | null;
        zodiac?: string | null;
        customPersonality?: string | null;
        dietaryPreferences?: string[];
        interests?: string[];
    };
}

const MBTI_OPTIONS = ["INTJ", "INTP", "ENTJ", "ENTP", "INFJ", "INFP", "ENFJ", "ENFP", "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP"];
const ENNEAGRAM_OPTIONS = ["1 - The Reformer", "2 - The Helper", "3 - The Achiever", "4 - The Individualist", "5 - The Investigator", "6 - The Loyalist", "7 - The Enthusiast", "8 - The Challenger", "9 - The Peacemaker"];
const ZODIAC_OPTIONS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

export function ProfileEditor({ initialData }: ProfileEditorProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    if (!isEditing) {
        return (
            <div className="w-full max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500 delay-150">
                {/* Header/Title */}
                <div className="flex justify-between items-center px-2">
                    <div>
                        <h2 className="text-4xl font-serif font-bold text-foreground">My Profile</h2>
                        <p className="text-muted-foreground mt-1 text-sm">Your unique social signature</p>
                    </div>
                    <button
                        onClick={() => setIsEditing(true)}
                        className="px-6 py-2.5 bg-primary hover:bg-primary/90 rounded-full text-primary-foreground text-sm font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
                    >
                        Update
                    </button>
                </div>

                {/* Bento Grid Layout */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Bio - Large 2x2 Card */}
                    <div className="col-span-2 row-span-2 glass-card p-6 flex flex-col justify-between group h-full min-h-[220px]">
                        <div className="flex justify-between items-start">
                            <span className="text-2xl">📝</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">The Bio</span>
                        </div>
                        <p className="text-lg md:text-xl text-foreground font-medium leading-relaxed mt-4">
                            {initialData.bio ? `"${initialData.bio}"` : <span className="text-muted-foreground italic">No bio yet...</span>}
                        </p>
                    </div>

                    {/* MBTI - 1x1 Card */}
                    <div className="col-span-1 glass-card p-4 flex flex-col justify-between items-center text-center aspect-square hover:bg-white/5 transition-colors">
                        <span className="text-2xl mb-2">🧩</span>
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">MBTI</span>
                            <span className="text-lg font-bold text-foreground">{initialData.mbti || "—"}</span>
                        </div>
                    </div>

                    {/* Enneagram - 1x1 Card */}
                    <div className="col-span-1 glass-card p-4 flex flex-col justify-between items-center text-center aspect-square hover:bg-white/5 transition-colors">
                        <span className="text-2xl mb-2">⚡</span>
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Enneagram</span>
                            <span className="text-lg font-bold text-foreground">{initialData.enneagram?.split(" ")[0] || "—"}</span>
                        </div>
                    </div>

                    {/* Zodiac - 1x1 Card */}
                    <div className="col-span-1 glass-card p-4 flex flex-col justify-between items-center text-center aspect-square hover:bg-white/5 transition-colors">
                        <span className="text-2xl mb-2">🌙</span>
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Zodiac</span>
                            <span className="text-lg font-bold text-foreground">{initialData.zodiac || "—"}</span>
                        </div>
                    </div>

                    {/* Custom Identity - 1x1 Card */}
                    <div className="col-span-1 glass-card p-4 flex flex-col justify-between items-center text-center aspect-square hover:bg-white/5 transition-colors">
                        <span className="text-2xl mb-2">🎨</span>
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Identity</span>
                            <span className="text-sm font-bold text-foreground truncate w-full px-1">{initialData.customPersonality || "—"}</span>
                        </div>
                    </div>
                </div>

                {/* Interests & Food Section */}
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="glass-card p-6 rounded-2xl">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                            Interests
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {initialData.interests?.length ? (
                                initialData.interests.map((tag) => (
                                    <span key={tag} className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-sm">
                                        #{tag}
                                    </span>
                                ))
                            ) : (
                                <span className="text-muted-foreground italic text-sm">Not added yet</span>
                            )}
                        </div>
                    </div>

                    <div className="glass-card p-6 rounded-2xl">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                            Dietary
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {initialData.dietaryPreferences?.length ? (
                                initialData.dietaryPreferences.map((tag) => (
                                    <span key={tag} className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-sm">
                                        {tag}
                                    </span>
                                ))
                            ) : (
                                <span className="text-muted-foreground italic text-sm">No restrictions</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-3xl mx-auto glass-card p-8 relative overflow-hidden animate-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-serif font-bold mb-8 flex items-center gap-3 text-foreground">
                <span className="text-2xl">✨</span> Refine your profile
            </h2>

            <form
                action={async (formData) => {
                    setLoading(true);
                    try {
                        await updateProfile(formData);
                        setIsEditing(false);
                        router.refresh();
                    } catch (err) {
                        alert("Failed to update profile");
                    } finally {
                        setLoading(false);
                    }
                }}
                className="space-y-8"
            >
                <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">The Bio</label>
                    <textarea
                        name="bio"
                        defaultValue={initialData.bio || ""}
                        className="w-full bg-input/50 border border-white/10 rounded-2xl p-4 min-h-[120px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none resize-none text-foreground placeholder:text-muted-foreground"
                        placeholder="What defines you?"
                    />
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">MBTI</label>
                        <select name="mbti" defaultValue={initialData.mbti || ""} className="w-full bg-input/50 border border-white/10 rounded-xl p-3 focus:border-primary outline-none appearance-none cursor-pointer text-foreground">
                            <option value="">Select—</option>
                            {MBTI_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Enneagram</label>
                        <select name="enneagram" defaultValue={initialData.enneagram || ""} className="w-full bg-input/50 border border-white/10 rounded-xl p-3 focus:border-primary outline-none appearance-none cursor-pointer text-foreground">
                            <option value="">Select—</option>
                            {ENNEAGRAM_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Zodiac</label>
                        <select name="zodiac" defaultValue={initialData.zodiac || ""} className="w-full bg-input/50 border border-white/10 rounded-xl p-3 focus:border-primary outline-none appearance-none cursor-pointer text-foreground">
                            <option value="">Select—</option>
                            {ZODIAC_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Custom Identity</label>
                    <input
                        name="customPersonality"
                        defaultValue={initialData.customPersonality || ""}
                        className="w-full bg-input/50 border border-white/10 rounded-xl p-4 focus:border-primary outline-none text-foreground placeholder:text-muted-foreground"
                        placeholder="e.g. Minimalist, Night Owl, Foodie..."
                    />
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    <TagInput
                        name="interests"
                        label="Interests"
                        placeholder="Add interests..."
                        initialTags={initialData.interests}
                    />
                    <TagInput
                        name="dietaryPreferences"
                        label="Dietary"
                        placeholder="Add dietary needs..."
                        initialTags={initialData.dietaryPreferences}
                    />
                </div>

                <div className="pt-6 flex gap-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 py-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl font-bold transition-all disabled:opacity-50 shadow-xl shadow-primary/10 active:scale-[0.98]"
                    >
                        {loading ? "Re-syncing..." : "Update"}
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="px-8 py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-bold transition-all border border-white/10 text-foreground"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}
