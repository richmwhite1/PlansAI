"use client";

import { useState } from "react";
import { updateProfile } from "@/app/actions/profile-actions";
import { useRouter } from "next/navigation";
import { TagInput } from "@/components/ui/tag-input";
import { Sparkles, Brain, Star, Fingerprint, Plus, Zap, Heart, Clock, DollarSign, ShieldAlert, MessageCircle, MapPin, Wine, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProfileHero } from "./ProfileHero";

interface ProfileEditorProps {
    initialData: {
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

const MBTI_OPTIONS = ["INTJ", "INTP", "ENTJ", "ENTP", "INFJ", "INFP", "ENFJ", "ENFP", "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP"];
const ENNEAGRAM_OPTIONS = ["1 - The Reformer", "2 - The Helper", "3 - The Achiever", "4 - The Individualist", "5 - The Investigator", "6 - The Loyalist", "7 - The Enthusiast", "8 - The Challenger", "9 - The Peacemaker"];
const ZODIAC_OPTIONS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

const VIBE_TAG_OPTIONS = [
    "Foodie", "Night Owl", "Early Bird", "Adventure Seeker", "Homebody",
    "Music Lover", "Bookworm", "Fitness Buff", "Art Enthusiast", "Movie Buff",
    "Board Gamer", "Sports Fan", "Nature Lover", "Tech Geek", "Traveler",
    "Coffee Snob", "Wine Connoisseur", "Dog Person", "Cat Person", "Karaoke King/Queen",
];

const AVAILABILITY_OPTIONS = [
    "Weekday mornings", "Weekday afternoons", "Weekday evenings",
    "Weekend mornings", "Weekend afternoons", "Weekend evenings",
    "Late nights", "Anytime!",
];

const ENERGY_LABELS = ["🐢 Very Introverted", "🌿 Introverted", "⚖️ Ambivert", "🌟 Extroverted", "🔥 Very Extroverted"];
const BUDGET_LABELS = ["$ Free/Cheap", "$$ Moderate", "$$$ Nice", "$$$$ Luxury"];

function calculateCompleteness(data: ProfileEditorProps["initialData"]): number {
    let filled = 0;
    let total = 10;
    if (data.bio) filled++;
    if (data.mbti) filled++;
    if (data.zodiac) filled++;
    if (data.socialEnergy) filled++;
    if (data.vibeTags?.length) filled++;
    if (data.budgetComfort) filled++;
    if (data.interests?.length) filled++;
    if (data.dietaryPreferences?.length) filled++;
    if (data.availabilityWindows?.length) filled++;
    if (data.funFacts?.length) filled++;
    return Math.round((filled / total) * 100);
}

export function ProfileEditor({ initialData }: ProfileEditorProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    // Edit form state
    const [socialEnergy, setSocialEnergy] = useState(initialData.socialEnergy || 3);
    const [budgetComfort, setBudgetComfort] = useState(initialData.budgetComfort || 2);
    const [vibeTags, setVibeTags] = useState<string[]>(initialData.vibeTags || []);
    const [availability, setAvailability] = useState<string[]>(initialData.availabilityWindows || []);
    const [dealbreakers, setDealbreakers] = useState<string[]>(initialData.dealbreakers || []);
    const [funFacts, setFunFacts] = useState<string[]>(initialData.funFacts || []);
    const [newFunFact, setNewFunFact] = useState("");

    const completeness = calculateCompleteness(initialData);

    if (!isEditing) {
        return (
            <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 delay-150 pb-24">
                {/* Hero Section */}
                <ProfileHero
                    profile={initialData as any}
                    isOwner={true}
                    onEdit={() => setIsEditing(true)}
                />

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
                                    <span className="text-sm font-bold text-foreground">{initialData.transportMode || "Not Specified"}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-border/50">
                                    <span className="text-sm font-medium text-muted-foreground">Social Battery</span>
                                    <span className="text-sm font-bold text-foreground">{ENERGY_LABELS[Math.max(0, (initialData.socialEnergy || 3) - 1)]?.split(" ")[0]} ({initialData.socialEnergy}/5)</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-border/50">
                                    <span className="text-sm font-medium text-muted-foreground">Budget Tier</span>
                                    <span className="text-sm font-bold text-foreground">{BUDGET_LABELS[Math.max(0, (initialData.budgetComfort || 2) - 1)]?.split(" ")[0]}</span>
                                </div>
                                <div className="py-2">
                                    <span className="text-sm font-medium text-muted-foreground block mb-2">Availability</span>
                                    <div className="flex flex-wrap gap-2">
                                        {initialData.availabilityWindows?.length ? (
                                            initialData.availabilityWindows.map(w => (
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
                                {initialData.vibeTags?.length ? (
                                    initialData.vibeTags.map(tag => (
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
                                    <span className="text-sm font-mono text-foreground">{initialData.mbti || "—"}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-border/50">
                                    <span className="text-sm font-medium text-muted-foreground">Zodiac</span>
                                    <span className="text-sm font-mono text-foreground">{initialData.zodiac || "—"}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-border/50">
                                    <span className="text-sm font-medium text-muted-foreground">Enneagram</span>
                                    <span className="text-sm font-mono text-foreground">{initialData.enneagram?.split("-")[0].trim() || "—"}</span>
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
                                        {initialData.cuisinePreferences?.length ? (
                                            initialData.cuisinePreferences.map(c => <span key={c} className="text-xs text-foreground bg-muted/30 px-1.5 py-0.5 rounded-sm border border-border/50">{c}</span>)
                                        ) : <span className="text-xs text-muted-foreground">–</span>}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Drinks</h4>
                                    <div className="flex flex-wrap gap-1">
                                        {initialData.drinkPreferences?.length ? (
                                            initialData.drinkPreferences.map(d => <span key={d} className="text-xs text-foreground bg-muted/30 px-1.5 py-0.5 rounded-sm border border-border/50">{d}</span>)
                                        ) : <span className="text-xs text-muted-foreground">–</span>}
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Interests</h4>
                                    <div className="flex flex-wrap gap-1">
                                        {initialData.interests?.length ? (
                                            initialData.interests.map(i => <span key={i} className="text-xs text-foreground bg-muted/30 px-1.5 py-0.5 rounded-sm border border-border/50">{i}</span>)
                                        ) : <span className="text-xs text-muted-foreground">–</span>}
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>

                {/* Dealbreakers Alert */}
                {initialData.dealbreakers && initialData.dealbreakers.length > 0 && (
                    <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
                        <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-sm font-bold text-red-500 uppercase tracking-wide mb-1">Negative Constraints</h3>
                            <p className="text-sm text-foreground/80 leading-relaxed">
                                {initialData.dealbreakers.join(", ")}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ============================================================
    // EDIT MODE
    // ============================================================
    return (
        <div className="w-full max-w-3xl mx-auto glass-card p-6 md:p-8 relative overflow-hidden animate-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-serif font-bold mb-6 flex items-center gap-3 text-foreground">
                <span className="text-2xl">✨</span> Edit Your Profile
            </h2>

            <form
                action={async (formData) => {
                    // Append array fields
                    formData.set("vibeTags", vibeTags.join(","));
                    formData.set("availabilityWindows", availability.join(","));
                    formData.set("dealbreakers", dealbreakers.join(","));
                    formData.set("funFacts", funFacts.join(","));
                    formData.set("socialEnergy", String(socialEnergy));
                    formData.set("budgetComfort", String(budgetComfort));

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
                {/* Bio */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">📝 Bio</label>
                    <textarea
                        name="bio"
                        defaultValue={initialData.bio || ""}
                        className="w-full bg-input/50 border border-white/10 rounded-2xl p-4 min-h-[100px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none resize-none text-foreground placeholder:text-muted-foreground"
                        placeholder="What defines you? What should friends know?"
                    />
                </div>

                {/* Logistics Section */}
                <div className="space-y-6 border-b border-border pb-6">
                    <h3 className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5" /> Logistics Profile
                    </h3>

                    <div className="grid md:grid-cols-2 gap-4">
                        {/* Transport Mode */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Transport Mode</label>
                            <select
                                name="transportMode"
                                defaultValue={initialData.transportMode || ""}
                                className="w-full bg-input/50 border border-white/10 rounded-md p-2.5 text-sm focus:border-foreground outline-none cursor-pointer"
                            >
                                <option value="">Select—</option>
                                <option value="CAR">Car</option>
                                <option value="PUBLIC">Public Transit</option>
                                <option value="WALK">Walk / Bike</option>
                            </select>
                        </div>

                        {/* Social Energy Slider */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex justify-between">
                                <span>Social Battery</span>
                                <span className="text-foreground">{ENERGY_LABELS[socialEnergy - 1]}</span>
                            </label>
                            <input
                                type="range"
                                min="1"
                                max="5"
                                value={socialEnergy}
                                onChange={(e) => setSocialEnergy(parseInt(e.target.value))}
                                className="w-full accent-foreground"
                            />
                        </div>
                    </div>

                    {/* Availability Windows */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5" /> Availability
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {AVAILABILITY_OPTIONS.map((opt) => (
                                <button
                                    key={opt}
                                    type="button"
                                    onClick={() => setAvailability(prev => prev.includes(opt) ? prev.filter(a => a !== opt) : [...prev, opt])}
                                    className={cn(
                                        "px-3 py-1.5 rounded-sm text-xs font-mono transition-all border",
                                        availability.includes(opt)
                                            ? "bg-foreground text-background border-foreground"
                                            : "bg-muted/20 text-muted-foreground border-border hover:border-foreground/50"
                                    )}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Preferences Section */}
                <div className="space-y-6 border-b border-border pb-6">
                    <h3 className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        <Utensils className="w-3.5 h-3.5" /> Dining & Drinks
                    </h3>

                    <div className="grid md:grid-cols-2 gap-6">
                        <TagInput
                            name="cuisinePreferences"
                            label="Cuisines"
                            placeholder="e.g. Sushi, Italian..."
                            initialTags={initialData.cuisinePreferences}
                        />
                        <TagInput
                            name="drinkPreferences"
                            label="Drinks"
                            placeholder="e.g. Cocktails, Coffee..."
                            initialTags={initialData.drinkPreferences}
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <DollarSign className="w-3.5 h-3.5" /> Budget Comfort
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                            {BUDGET_LABELS.map((label, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => setBudgetComfort(i + 1)}
                                    className={cn(
                                        "py-2 rounded-md text-xs font-medium transition-all border",
                                        budgetComfort === i + 1
                                            ? "bg-foreground text-background border-foreground shadow-sm"
                                            : "bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10"
                                    )}
                                >
                                    {label.split(" ")[0]}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Vibe Tags (Renamed to Planning Priorities) */}
                <div className="space-y-3 border-b border-border pb-6">
                    <label className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5" /> Planning Priorities
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {VIBE_TAG_OPTIONS.map((tag) => (
                            <button
                                key={tag}
                                type="button"
                                onClick={() => setVibeTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                                className={cn(
                                    "px-3 py-1.5 rounded-sm text-xs font-medium transition-all border",
                                    vibeTags.includes(tag)
                                        ? "bg-foreground text-background border-foreground"
                                        : "bg-muted/20 text-muted-foreground border-border hover:border-foreground/50"
                                )}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Interests & Dietary */}
                <div className="grid md:grid-cols-2 gap-6">
                    <TagInput
                        name="interests"
                        label="Interests"
                        placeholder="Add interests..."
                        initialTags={initialData.interests}
                    />
                    <TagInput
                        name="dietaryPreferences"
                        label="Dietary Restrictions"
                        placeholder="Add restrictions..."
                        initialTags={initialData.dietaryPreferences}
                    />
                </div>

                {/* Dealbreakers */}
                <div className="space-y-3">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        <ShieldAlert className="w-3.5 h-3.5" /> Dealbreakers
                        <span className="text-[10px] text-muted-foreground font-normal normal-case">(things you never want to do)</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {dealbreakers.map((d, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => setDealbreakers(prev => prev.filter((_, idx) => idx !== i))}
                                className="px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-xs font-medium hover:bg-red-500/20 transition-colors"
                            >
                                🚫 {d} ×
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="e.g. No horror movies"
                            className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-red-500/50"
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    const val = (e.target as HTMLInputElement).value.trim();
                                    if (val && !dealbreakers.includes(val)) {
                                        setDealbreakers(prev => [...prev, val]);
                                        (e.target as HTMLInputElement).value = "";
                                    }
                                }
                            }}
                        />
                    </div>
                </div>

                {/* Fun Facts */}
                <div className="space-y-3">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        <MessageCircle className="w-3.5 h-3.5" /> Fun Facts
                        <span className="text-[10px] text-muted-foreground font-normal normal-case">(things your friends might not know)</span>
                    </label>
                    <div className="space-y-2">
                        {funFacts.map((fact, i) => (
                            <div key={i} className="flex items-start gap-2">
                                <div className="flex-1 px-4 py-3 bg-gradient-to-r from-primary/5 to-purple-500/5 border border-primary/10 rounded-2xl rounded-tl-sm text-sm text-foreground">
                                    💬 {fact}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFunFacts(prev => prev.filter((_, idx) => idx !== i))}
                                    className="text-muted-foreground hover:text-red-400 transition-colors mt-2"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newFunFact}
                            onChange={(e) => setNewFunFact(e.target.value)}
                            placeholder="e.g. I've been to 30 countries"
                            className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    if (newFunFact.trim()) {
                                        setFunFacts(prev => [...prev, newFunFact.trim()]);
                                        setNewFunFact("");
                                    }
                                }
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => {
                                if (newFunFact.trim()) {
                                    setFunFacts(prev => [...prev, newFunFact.trim()]);
                                    setNewFunFact("");
                                }
                            }}
                            className="px-3 py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-xl transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Submit */}
                <div className="pt-4 flex gap-3">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 py-3.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl font-bold transition-all disabled:opacity-50 shadow-xl shadow-primary/10 active:scale-[0.98]"
                    >
                        {loading ? "Saving..." : "Save Profile"}
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="px-6 py-3.5 bg-white/5 hover:bg-white/10 rounded-2xl font-bold transition-all border border-white/10 text-foreground"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}
