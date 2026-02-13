"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
    ArrowLeft, MapPin, Calendar, Compass, Loader2, Users,
    Search, Sparkles, Filter, Check, Plus, Send, Info, Star,
    Ticket, ShoppingBag, Utensils, Music, Footprints, Camera,
    UserPlus, X
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { FriendSelector } from "@/components/dashboard/friend-selector";
import { InviteModal } from "@/components/dashboard/invite-modal";
import { toast } from "sonner";
import { HangoutCard } from "@/components/hangout/hangout-card";

interface Friend {
    id: string;
    name: string;
    avatar: string;
    phone?: string;
    isGuest?: boolean;
}

interface DiscoverableHangout {
    id: string;
    slug: string;
    title: string;
    status: string;
    date: string;
    creator: {
        name: string;
        avatar: string;
    };
    activity?: {
        name: string;
        category: string;
        image?: string;
        rating?: number;
        address?: string;
    };
    participantCount: number;
    previewParticipants: { id: string; avatar?: string }[];
}

interface Activity {
    id: string;
    name: string;
    description: string | null;
    category: string;
    subcategory: string | null;
    address: string | null;
    city: string | null;
    rating: number | null;
    imageUrl: string | null;
    vibes: string[];
}

const CATEGORIES = [
    { id: "all", name: "All", icon: Compass },
    { id: "restaurant", name: "Dining", icon: Utensils },
    { id: "activity", name: "Activities", icon: Footprints },
    { id: "bar", name: "Nightlife", icon: Music },
    { id: "shopping", name: "Shopping", icon: ShoppingBag },
    { id: "sightseeing", name: "Sightsee", icon: Camera },
];

export default function DiscoverPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"plans" | "explore">("plans");

    // Filters & Search
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");

    // AI Assistant
    const [aiPrompt, setAiPrompt] = useState("");
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiReasoning, setAiReasoning] = useState<string | null>(null);
    const [aiActivities, setAiActivities] = useState<Activity[]>([]);

    // Selection for Hangout Creation
    const [selectedActivityIds, setSelectedActivityIds] = useState<Set<string>>(new Set());
    const [isCreating, setIsCreating] = useState(false);

    // People Selection
    const [selectedFriends, setSelectedFriends] = useState<Friend[]>([]);
    const [isPublic, setIsPublic] = useState(false);
    const [showFriendSelector, setShowFriendSelector] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [createdHangoutData, setCreatedHangoutData] = useState<{ inviteUrl: string; slug: string } | null>(null);

    const fetcher = (url: string) => fetch(url).then(r => r.json());

    const discoverKey = (() => {
        const params = new URLSearchParams();
        params.append("type", activeTab === "plans" ? "hangouts" : "activities");
        if (activeTab === "explore" && selectedCategory !== "all") {
            params.append("category", selectedCategory);
        }
        return `/api/discover?${params.toString()}`;
    })();

    const { data: discoverData, isLoading } = useSWR(discoverKey, fetcher, {
        revalidateOnFocus: false,
        dedupingInterval: 30000, // 30s dedup
    });

    const hangouts: DiscoverableHangout[] = discoverData?.hangouts || [];
    const activities: Activity[] = aiActivities.length > 0 ? aiActivities : (discoverData?.activities || []);

    const handleAiSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!aiPrompt.trim()) return;

        setIsAiLoading(true);
        setActiveTab("explore");
        try {
            const res = await fetch("/api/discover/ai-ideas", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: aiPrompt })
            });
            const data = await res.json();
            if (data.suggestions) {
                setAiActivities(data.suggestions);
                setAiReasoning(data.reasoning);
            }
        } catch (err) {
            console.error("AI Assistant failed:", err);
        } finally {
            setIsAiLoading(false);
        }
    };

    const toggleActivitySelection = (id: string) => {
        const newSet = new Set(selectedActivityIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedActivityIds(newSet);
    };

    const handleCreateHangout = async () => {
        if (selectedActivityIds.size === 0) return;

        setIsCreating(true);
        try {
            const hasGuests = selectedFriends.some(f => f.isGuest);

            const res = await fetch("/api/hangouts/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    activityIds: Array.from(selectedActivityIds),
                    status: selectedActivityIds.size > 1 ? "VOTING" : "PLANNING",
                    friendIds: selectedFriends.filter(f => !f.isGuest).map(f => f.id),
                    guests: selectedFriends.filter(f => f.isGuest).map(f => ({ name: f.name })),
                    visibility: isPublic ? "PUBLIC" : "FRIENDS_ONLY"
                })
            });
            const data = await res.json();

            if (data.slug) {
                if (hasGuests) {
                    const inviteUrl = `${window.location.origin}/hangouts/${data.slug}`;
                    setCreatedHangoutData({ inviteUrl, slug: data.slug });
                    setShowInviteModal(true);
                    toast.success("Hangout created! Invite your guests.");
                } else {
                    toast.success("Hangout created!");
                    router.push(`/hangouts/${data.slug}`);
                }
            }
        } catch (err) {
            console.error("Failed to create hangout:", err);
            toast.error("Failed to create hangout");
            setIsCreating(false);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <main className="container mx-auto max-w-2xl px-6 py-6 pb-32">
                <div className="mb-8 space-y-6">
                    {/* Header Title */}
                    <div className="flex items-center gap-2 mb-4">
                        <Compass className="w-5 h-5 text-primary" />
                        <h1 className="text-xl font-bold text-white">Discover</h1>
                    </div>

                    {/* Tabs */}
                    <div className="flex p-1 bg-white/5 rounded-xl border border-white/5">
                        <button
                            onClick={() => { setActiveTab("plans"); setSelectedActivityIds(new Set()); setAiReasoning(null); }}
                            className={cn(
                                "flex-1 py-2 text-sm font-medium rounded-lg transition-all",
                                activeTab === "plans" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-white"
                            )}
                        >
                            Public Plans
                        </button>
                        <button
                            onClick={() => { setActiveTab("explore"); setAiReasoning(null); }}
                            className={cn(
                                "flex-1 py-2 text-sm font-medium rounded-lg transition-all",
                                activeTab === "explore" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-white"
                            )}
                        >
                            Explore Events
                        </button>
                    </div>
                </div>

                {/* Content */}
                {activeTab === "explore" && (
                    <div className="mb-8 space-y-6">
                        {/* AI Search Bar */}
                        <form onSubmit={handleAiSubmit} className="relative group">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                <Sparkles className="w-5 h-5 text-primary" />
                            </div>
                            <input
                                type="text"
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                placeholder="Ask AI for ideas (e.g. 'Chill Saturday hike')"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-12 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all"
                            />
                            <button
                                type="submit"
                                disabled={isAiLoading || !aiPrompt.trim()}
                                className="absolute right-3 top-2.5 p-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-xl disabled:opacity-50 transition-colors"
                            >
                                {isAiLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            </button>
                        </form>

                        {/* Reasoning Alert */}
                        <AnimatePresence>
                            {aiReasoning && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex gap-3"
                                >
                                    <Info className="w-5 h-5 text-primary shrink-0" />
                                    <p className="text-sm text-primary-foreground leading-relaxed">{aiReasoning}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Categories */}
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                            {CATEGORIES.map(cat => {
                                const Icon = cat.icon;
                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCategory(cat.id)}
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium whitespace-nowrap transition-all",
                                            selectedCategory === cat.id
                                                ? "bg-foreground text-background border-foreground"
                                                : "bg-white/5 border-white/5 text-muted-foreground hover:border-white/20 hover:text-foreground"
                                        )}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {cat.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Content */}
                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="rounded-2xl border border-white/5 bg-card/50 overflow-hidden animate-pulse">
                                <div className="h-32 bg-slate-800" />
                                <div className="p-4 space-y-3">
                                    <div className="h-5 bg-slate-800 rounded-lg w-3/4" />
                                    <div className="h-3 bg-slate-800/60 rounded w-1/2" />
                                    <div className="h-3 bg-slate-800/40 rounded w-1/3" />
                                    <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                                        <div className="w-5 h-5 rounded-full bg-slate-800" />
                                        <div className="h-3 bg-slate-800/40 rounded w-24" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : activeTab === "plans" ? (
                    <div className="space-y-4">
                        {hangouts.length > 0 ? (
                            hangouts.map(hangout => (
                                <HangoutCard
                                    key={hangout.id}
                                    hangout={hangout}
                                    variant="upcoming"
                                />
                            ))
                        ) : (
                            <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                                <Compass className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                                <h2 className="text-xl font-semibold text-white mb-2">No plans nearby</h2>
                                <p className="text-slate-400 max-w-xs mx-auto text-sm">
                                    Be the first to start a public hangout or explore activities!
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {activities.length > 0 ? (
                            activities.map(activity => {
                                const isSelected = selectedActivityIds.has(activity.id);
                                return (
                                    <div
                                        key={activity.id}
                                        onClick={() => toggleActivitySelection(activity.id)}
                                        className={cn(
                                            "relative glass-card rounded-2xl border bg-card/50 p-4 transition-all duration-300 cursor-pointer",
                                            isSelected ? "border-primary shadow-lg shadow-primary/10" : "border-white/5 hover:border-white/20 active:scale-[0.98]"
                                        )}
                                    >
                                        <div className="flex gap-4">
                                            <div className="w-24 h-24 rounded-xl bg-slate-800 overflow-hidden shrink-0 border border-white/10">
                                                {activity.imageUrl ? (
                                                    <img src={activity.imageUrl} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-slate-800">
                                                        <MapPin className="w-8 h-8 text-slate-600" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start gap-2 mb-1">
                                                    <h3 className="font-bold text-white truncate">{activity.name}</h3>
                                                    {activity.rating && (
                                                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/10 shrink-0">
                                                            <Star className="w-2.5 h-2.5 fill-current" />
                                                            {activity.rating}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-muted-foreground mb-2 font-medium capitalize flex items-center gap-1.5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                    {activity.category} {activity.subcategory && `• ${activity.subcategory}`}
                                                </div>
                                                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{activity.description || activity.address}</p>

                                                <div className="mt-3 flex flex-wrap gap-1.5">
                                                    {activity.vibes.slice(0, 3).map(vibe => (
                                                        <span key={vibe} className="text-[10px] px-2 py-0.5 bg-white/5 rounded-full text-slate-400 border border-white/5">
                                                            #{vibe}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Selection Indicator */}
                                        <div className={cn(
                                            "absolute top-3 right-3 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                                            isSelected ? "bg-primary border-primary" : "border-white/20 bg-black/20"
                                        )}>
                                            {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                                <Search className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                                <h2 className="text-xl font-semibold text-white mb-2">No activities found</h2>
                                <p className="text-slate-400 max-w-xs mx-auto text-sm">
                                    Try a different category or ask the AI for specialized ideas!
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Selection FAB (Float Action Button) */}
            <AnimatePresence>
                {selectedActivityIds.size > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 100 }}
                        className="fixed bottom-8 left-0 right-0 z-50 px-6 pointer-events-none"
                    >
                        <div className="container mx-auto max-w-2xl pointer-events-auto">
                            <div className="bg-primary rounded-3xl p-4 shadow-2xl shadow-primary/20 border border-primary/20 flex items-center justify-between gap-4">
                                <div className="pl-2 flex items-center gap-4">
                                    <div>
                                        <p className="text-primary-foreground font-bold text-lg">{selectedActivityIds.size} Selected</p>
                                        <p className="text-primary-foreground/80 text-xs">
                                            {selectedActivityIds.size === 1 ? "Start a new plan" : "Start a group vote"}
                                        </p>
                                    </div>
                                    <div className="h-8 w-px bg-primary-foreground/20 mx-1" />
                                    <button
                                        onClick={() => setShowFriendSelector(true)}
                                        className="flex flex-col items-center gap-0.5 group"
                                    >
                                        <div className="relative">
                                            <div className="w-10 h-10 rounded-full bg-background/20 flex items-center justify-center border border-white/10 group-hover:bg-background/30 transition-colors">
                                                <UserPlus className="w-5 h-5 text-primary-foreground" />
                                            </div>
                                            {selectedFriends.length > 0 && (
                                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-white text-primary rounded-full text-[10px] font-bold flex items-center justify-center border-2 border-primary">
                                                    {selectedFriends.length}
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-[10px] font-bold text-primary-foreground/90 uppercase tracking-tighter">People</span>
                                    </button>
                                </div>
                                <button
                                    onClick={handleCreateHangout}
                                    disabled={isCreating}
                                    className="bg-background text-primary font-bold px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-white/90 transition-colors shadow-lg disabled:opacity-50"
                                >
                                    {isCreating ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            {selectedActivityIds.size === 1 ? "Go!" : "Create Vote"}
                                            <Send className="w-5 h-5" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Friend Selector Drawer/Modal */}
            <AnimatePresence>
                {showFriendSelector && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowFriendSelector(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
                        />
                        <motion.div
                            initial={{ opacity: 0, y: "100%" }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: "100%" }}
                            className="fixed bottom-0 left-0 right-0 z-[70] bg-slate-900 border-t border-white/10 rounded-t-[32px] p-6 max-h-[85vh] overflow-y-auto"
                        >
                            <div className="max-w-xl mx-auto space-y-6">
                                <div className="flex items-center justify-between sticky top-0 bg-slate-900 z-10 pb-4">
                                    <h2 className="text-2xl font-serif font-bold text-white italic">Add People</h2>
                                    <button
                                        onClick={() => setShowFriendSelector(false)}
                                        className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 transition-colors"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                <FriendSelector
                                    selected={selectedFriends}
                                    onSelect={setSelectedFriends}
                                />

                                {/* Visibility Toggle */}
                                <div className="space-y-4 pt-4 border-t border-white/5">
                                    <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
                                        <div className="space-y-0.5">
                                            <label className="text-sm font-medium text-slate-200">Public Plan?</label>
                                            <p className="text-xs text-slate-500">Enable to show this plan in the Public Discover tab.</p>
                                        </div>
                                        <button
                                            onClick={() => setIsPublic(!isPublic)}
                                            className={cn(
                                                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                                                isPublic ? "bg-primary" : "bg-slate-700"
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                                    isPublic ? "translate-x-6" : "translate-x-1"
                                                )}
                                            />
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-4 pb-8 sticky bottom-0 bg-slate-900">
                                    <button
                                        onClick={() => setShowFriendSelector(false)}
                                        className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.01] transition-all"
                                    >
                                        Done
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Invite Modal for Guests */}
            {createdHangoutData && (
                <InviteModal
                    isOpen={showInviteModal}
                    onClose={() => {
                        setShowInviteModal(false);
                        router.push(`/hangouts/${createdHangoutData.slug}`);
                    }}
                    onDone={() => {
                        setShowInviteModal(false);
                        router.push(`/hangouts/${createdHangoutData.slug}`);
                    }}
                    inviteUrl={createdHangoutData.inviteUrl}
                    guests={selectedFriends.filter(f => f.isGuest)}
                />
            )}
        </div>
    );
}
