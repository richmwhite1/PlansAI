"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
    MapPin, Calendar, Compass, Loader2, Users,
    Search, Sparkles, Check, Send, Star,
    Ticket, Utensils, Music, Footprints, Camera,
    UserPlus, X, ExternalLink, Clock
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { FriendSelector } from "@/components/dashboard/friend-selector";
import { InviteModal } from "@/components/dashboard/invite-modal";
import { toast } from "sonner";
import { HangoutCard } from "@/components/hangout/hangout-card";
import { SCENARIO_TEMPLATES, type ScenarioTemplate } from "@/lib/ai/scenarios";

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
    matchPercentage?: number;
    reason?: string;
}

interface DiscoverEvent {
    id: string;
    name: string;
    description: string | null;
    category: string;
    venue: string;
    address: string | null;
    latitude: number;
    longitude: number;
    imageUrl: string | null;
    startsAt: string;
    ticketUrl: string | null;
    eventUrl: string | null;
    priceRange: string | null;
    performers: string[];
    matchPercentage?: number;
    reason?: string;
}

const PLACE_CATEGORIES = [
    { id: "all", name: "All", icon: Compass },
    { id: "restaurant", name: "Dining", icon: Utensils },
    { id: "activity", name: "Activities", icon: Footprints },
    { id: "bar", name: "Nightlife", icon: Music },
    { id: "sightseeing", name: "Sightsee", icon: Camera },
];

export default function DiscoverPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"plans" | "events" | "places">("events");

    // Filters & Search
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [targetDate, setTargetDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

    // AI Search for Events
    const [isEventSearching, setIsEventSearching] = useState(false);
    const [eventResults, setEventResults] = useState<DiscoverEvent[]>([]);
    const [eventSearchQuery, setEventSearchQuery] = useState("");
    const [hasEventSearched, setHasEventSearched] = useState(false);
    const [selectedScenario, setSelectedScenario] = useState<string | null>(null);

    // AI Search for Places
    const [isPlaceSearching, setIsPlaceSearching] = useState(false);
    const [placeResults, setPlaceResults] = useState<Activity[]>([]);
    const [placeSearchQuery, setPlaceSearchQuery] = useState("");

    // Local Search for Plans
    const [planSearchQuery, setPlanSearchQuery] = useState("");

    // Selection for Hangout Creation
    const [selectedActivityIds, setSelectedActivityIds] = useState<Set<string>>(new Set());
    const [isCreating, setIsCreating] = useState(false);

    // People Selection
    const [selectedFriends, setSelectedFriends] = useState<Friend[]>([]);
    const [isPublic, setIsPublic] = useState(false);
    const [showFriendSelector, setShowFriendSelector] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [createdHangoutData, setCreatedHangoutData] = useState<{ inviteUrl: string; slug: string } | null>(null);

    // User location (could be improved with geolocation API)
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                () => setUserLocation({ lat: 40.7608, lng: -111.8910 }) // Default: SLC
            );
        } else {
            setUserLocation({ lat: 40.7608, lng: -111.8910 });
        }
    }, []);

    const fetcher = (url: string) => fetch(url).then(r => r.json());

    const discoverKey = (() => {
        const params = new URLSearchParams();
        params.append("type", activeTab === "plans" ? "hangouts" : "activities");
        if (activeTab === "places" && selectedCategory !== "all") {
            params.append("category", selectedCategory);
        }
        return `/api/discover?${params.toString()}`;
    })();

    const { data: discoverData, isLoading } = useSWR(
        activeTab !== "events" ? discoverKey : null,
        fetcher,
        { revalidateOnFocus: false, dedupingInterval: 30000 }
    );

    const hangouts: DiscoverableHangout[] = discoverData?.hangouts || [];
    const activities: Activity[] = discoverData?.activities || [];

    const visibleHangouts = planSearchQuery.trim()
        ? hangouts.filter(h => h.title.toLowerCase().includes(planSearchQuery.toLowerCase()) || (h.activity && h.activity.name.toLowerCase().includes(planSearchQuery.toLowerCase())))
        : hangouts;

    // Event Search Handler
    const handleEventSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!eventSearchQuery.trim() || !userLocation) return;

        setIsEventSearching(true);
        setHasEventSearched(true);

        const scenario = SCENARIO_TEMPLATES.find(s => s.id === selectedScenario);
        const searchRadius = scenario?.defaultRadius || 50;

        try {
            const res = await fetch("/api/events/discover", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query: eventSearchQuery,
                    latitude: userLocation.lat,
                    longitude: userLocation.lng,
                    targetDate,
                    radiusMiles: searchRadius,
                    scenario: selectedScenario,
                })
            });
            const data = await res.json();
            if (data.events) {
                setEventResults(data.events);
            }
        } catch (err) {
            console.error("Event search failed:", err);
            toast.error("Failed to search for events");
        } finally {
            setIsEventSearching(false);
        }
    };

    // Place Search Handler
    const handlePlaceSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!placeSearchQuery.trim() || !userLocation) return;

        setIsPlaceSearching(true);
        try {
            const res = await fetch("/api/ai/find-activities", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query: placeSearchQuery,
                    latitude: userLocation.lat,
                    longitude: userLocation.lng,
                    radius: 25000,
                    scenario: selectedScenario
                })
            });
            const data = await res.json();
            if (data.activities) {
                setPlaceResults(data.activities);
            }
        } catch (err) {
            console.error("Place search failed:", err);
            toast.error("Failed to search for places");
        } finally {
            setIsPlaceSearching(false);
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

                    {/* Three Tabs */}
                    <div className="flex p-1 bg-white/5 rounded-xl border border-white/5">
                        <button
                            onClick={() => { setActiveTab("events"); setSelectedActivityIds(new Set()); }}
                            className={cn(
                                "flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-1.5",
                                activeTab === "events" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-white"
                            )}
                        >
                            <Ticket className="w-4 h-4" />
                            Events
                        </button>
                        <button
                            onClick={() => { setActiveTab("places"); setSelectedActivityIds(new Set()); }}
                            className={cn(
                                "flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-1.5",
                                activeTab === "places" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-white"
                            )}
                        >
                            <MapPin className="w-4 h-4" />
                            Places
                        </button>
                        <button
                            onClick={() => { setActiveTab("plans"); setSelectedActivityIds(new Set()); }}
                            className={cn(
                                "flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-1.5",
                                activeTab === "plans" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-white"
                            )}
                        >
                            <Users className="w-4 h-4" />
                            Plans
                        </button>
                    </div>
                </div>

                {/* ─── EVENTS TAB ─── */}
                {activeTab === "events" && (
                    <div className="space-y-6">
                        {/* Date Picker */}
                        <div className="flex items-center gap-3">
                            <div className="relative flex-1">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                                <input
                                    type="date"
                                    value={targetDate}
                                    onChange={(e) => setTargetDate(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-foreground outline-none focus:border-primary/50 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                                />
                            </div>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setTargetDate(format(new Date(), 'yyyy-MM-dd'))}
                                    className={cn(
                                        "px-3 py-3 rounded-xl text-xs font-bold border transition-all",
                                        targetDate === format(new Date(), 'yyyy-MM-dd')
                                            ? "bg-primary text-primary-foreground border-primary"
                                            : "bg-white/5 border-white/10 text-muted-foreground hover:text-white"
                                    )}
                                >
                                    Today
                                </button>
                                <button
                                    onClick={() => {
                                        const d = new Date();
                                        const dayOfWeek = d.getDay();
                                        const daysToSat = (6 - dayOfWeek + 7) % 7 || 7;
                                        d.setDate(d.getDate() + daysToSat);
                                        setTargetDate(format(d, 'yyyy-MM-dd'));
                                    }}
                                    className="px-3 py-3 rounded-xl text-xs font-bold bg-white/5 border border-white/10 text-muted-foreground hover:text-white transition-all"
                                >
                                    Sat
                                </button>
                            </div>
                        </div>

                        {/* Event Search Bar */}
                        <form onSubmit={handleEventSearch} className="relative group">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                <Sparkles className="w-5 h-5 text-primary" />
                            </div>
                            <input
                                type="text"
                                value={eventSearchQuery}
                                onChange={(e) => setEventSearchQuery(e.target.value)}
                                placeholder="Search events (e.g. 'live music', 'comedy shows', 'food festivals')"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-12 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all"
                            />
                            <button
                                type="submit"
                                disabled={isEventSearching || !eventSearchQuery.trim()}
                                className="absolute right-3 top-2.5 p-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-xl disabled:opacity-50 transition-colors"
                            >
                                {isEventSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            </button>
                        </form>

                        {/* Scenario Templates */}
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                            {SCENARIO_TEMPLATES.map(scenario => (
                                <button
                                    key={scenario.id}
                                    onClick={() => setSelectedScenario(selectedScenario === scenario.id ? null : scenario.id)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold whitespace-nowrap transition-all",
                                        selectedScenario === scenario.id
                                            ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                                            : "bg-white/5 border-white/5 text-muted-foreground hover:border-white/20 hover:text-foreground"
                                    )}
                                >
                                    <span>{scenario.emoji}</span>
                                    {scenario.name}
                                </button>
                            ))}
                        </div>

                        {/* Quick Suggestions */}
                        {eventResults.length === 0 && !isEventSearching && (
                            <div className="flex flex-wrap gap-2">
                                {["Live Music", "Comedy Shows", "Sports", "Food Festivals", "Art Exhibits", "Concerts"].map(q => (
                                    <button
                                        key={q}
                                        onClick={() => { setEventSearchQuery(q); }}
                                        className="px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-xs font-medium text-muted-foreground hover:text-white hover:border-white/20 transition-all"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Loading */}
                        {isEventSearching && (
                            <div className="py-16 flex flex-col items-center gap-3">
                                <div className="relative">
                                    <Sparkles className="w-10 h-10 text-primary animate-pulse" />
                                </div>
                                <p className="text-sm text-muted-foreground">AI is searching the web for real events...</p>
                                <p className="text-xs text-slate-600">This may take a few seconds</p>
                            </div>
                        )}

                        {/* Event Results */}
                        {eventResults.length > 0 && (
                            <div className="space-y-3">
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
                                    {eventResults.length} Events Found for {format(new Date(targetDate + 'T00:00:00'), 'EEEE, MMM d')}
                                </p>
                                {eventResults.map((event) => {
                                    const isSelected = selectedActivityIds.has(event.id);
                                    return (
                                        <motion.div
                                            key={event.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={cn(
                                                "relative rounded-2xl border bg-card/50 overflow-hidden transition-all",
                                                isSelected ? "border-primary shadow-lg shadow-primary/10 ring-1 ring-primary/30" : "border-white/5 hover:border-white/15"
                                            )}
                                        >
                                            {/* Clickable card body → ticket/event URL */}
                                            <a
                                                href={event.ticketUrl || event.eventUrl || `https://www.google.com/search?q=${encodeURIComponent(event.name + ' ' + (event.address || ''))}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block p-4 cursor-pointer hover:bg-white/5 transition-colors"
                                            >
                                                <div className="flex gap-4">
                                                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/20 flex items-center justify-center shrink-0">
                                                        <Ticket className="w-7 h-7 text-primary" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-2 mb-1">
                                                            <h3 className="font-bold text-white text-sm leading-tight">{event.name}</h3>
                                                            <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
                                                        </div>
                                                        <p className="text-xs text-primary font-medium flex items-center gap-1 mb-1">
                                                            <MapPin className="w-3 h-3" />
                                                            {event.venue}
                                                        </p>

                                                        {/* AI Match Feedback for Events */}
                                                        {event.matchPercentage ? (
                                                            <div className="bg-primary/10 border border-primary/20 rounded-lg p-2 mb-2">
                                                                <div className="flex items-center gap-1 mb-1">
                                                                    <Sparkles className="w-3 h-3 text-primary" />
                                                                    <span className="text-[10px] font-bold text-primary">{event.matchPercentage}% AI Match</span>
                                                                </div>
                                                                <p className="text-[10px] text-primary/80 leading-tight">{event.reason}</p>
                                                            </div>
                                                        ) : event.description && (
                                                            <p className="text-xs text-slate-500 line-clamp-2 mb-2">{event.description}</p>
                                                        )}

                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            {event.priceRange && (
                                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                                    {event.priceRange}
                                                                </span>
                                                            )}
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                                                {event.category}
                                                            </span>
                                                            {event.performers.length > 0 && (
                                                                <span className="text-[10px] text-slate-500 truncate">
                                                                    feat. {event.performers.slice(0, 2).join(", ")}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </a>

                                            {/* Selection checkbox — separate from the link */}
                                            <div className="absolute top-4 right-4" onClick={(e) => e.preventDefault()}>
                                                <button
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleActivitySelection(event.id); }}
                                                    className={cn(
                                                        "w-7 h-7 rounded-full flex items-center justify-center transition-all border-2",
                                                        isSelected
                                                            ? "bg-primary border-primary text-white shadow-lg shadow-primary/30"
                                                            : "bg-transparent border-white/20 text-transparent hover:border-primary/50"
                                                    )}
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Empty States */}
                        {!hasEventSearched && eventResults.length === 0 && (
                            <div className="text-center py-16 bg-gradient-to-b from-primary/5 to-transparent rounded-3xl border border-dashed border-primary/10">
                                <Sparkles className="w-12 h-12 text-primary/40 mx-auto mb-4" />
                                <h2 className="text-lg font-semibold text-white mb-2">What are you in the mood for?</h2>
                                <p className="text-slate-400 max-w-xs mx-auto text-sm">
                                    Search for concerts, comedy shows, food festivals, sports games — anything happening on {format(new Date(targetDate + 'T00:00:00'), 'MMM d')}.
                                </p>
                            </div>
                        )}

                        {hasEventSearched && !isEventSearching && eventResults.length === 0 && (
                            <div className="text-center py-16 bg-white/5 rounded-3xl border border-dashed border-white/10">
                                <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                                <h2 className="text-lg font-semibold text-white mb-2">No events found</h2>
                                <p className="text-slate-400 max-w-xs mx-auto text-sm">
                                    We couldn't find any events matching your search on this date. Try a different date or search term.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* ─── PLACES TAB ─── */}
                {activeTab === "places" && (
                    <div className="space-y-6">
                        {/* Categories */}
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                            {PLACE_CATEGORIES.map(cat => {
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

                        {/* Place Search Bar */}
                        <form onSubmit={handlePlaceSearch} className="relative group">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                <Sparkles className="w-5 h-5 text-primary" />
                            </div>
                            <input
                                type="text"
                                value={placeSearchQuery}
                                onChange={(e) => setPlaceSearchQuery(e.target.value)}
                                placeholder="Search for specific places, trails, or vibes..."
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-12 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all"
                            />
                            <button
                                type="submit"
                                disabled={isPlaceSearching || !placeSearchQuery.trim()}
                                className="absolute right-3 top-2.5 p-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-xl disabled:opacity-50 transition-colors"
                            >
                                {isPlaceSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            </button>
                        </form>

                        {/* Activities Grid */}
                        {isLoading || isPlaceSearching ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="rounded-2xl border border-white/5 bg-card/50 overflow-hidden animate-pulse">
                                        <div className="h-16 bg-slate-800" />
                                        <div className="p-4 space-y-3">
                                            <div className="h-5 bg-slate-800 rounded-lg w-3/4" />
                                            <div className="h-3 bg-slate-800/60 rounded w-1/2" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (placeResults.length > 0 || activities.length > 0) ? (
                            <div className="grid grid-cols-1 gap-3">
                                {(placeResults.length > 0 ? placeResults : activities).map(activity => {
                                    const isSelected = selectedActivityIds.has(activity.id);
                                    return (
                                        <div
                                            key={activity.id}
                                            className={cn(
                                                "relative rounded-2xl border bg-card/50 p-4 transition-all",
                                                isSelected ? "border-primary shadow-lg shadow-primary/10" : "border-white/5 hover:border-white/20"
                                            )}
                                        >
                                            <a
                                                href={`https://www.google.com/search?q=${encodeURIComponent(activity.name + ' ' + (activity.address || activity.city || ''))}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex gap-4 cursor-pointer"
                                            >
                                                <div className="w-20 h-20 rounded-xl bg-slate-800 overflow-hidden shrink-0 border border-white/10">
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
                                                    <div className="text-xs text-muted-foreground mb-1 font-medium capitalize flex items-center gap-1.5">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                        {activity.category} {activity.subcategory && `• ${activity.subcategory}`}
                                                    </div>

                                                    {/* Match Reason or Description */}
                                                    {activity.matchPercentage ? (
                                                        <div className="bg-primary/10 border border-primary/20 rounded-lg p-2 mb-2">
                                                            <div className="flex items-center gap-1 mb-1">
                                                                <Sparkles className="w-3 h-3 text-primary" />
                                                                <span className="text-[10px] font-bold text-primary">{activity.matchPercentage}% AI Match</span>
                                                            </div>
                                                            <p className="text-[10px] text-primary/80 leading-tight">{activity.reason}</p>
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-slate-500 line-clamp-2 mb-2">{activity.description || activity.address}</p>
                                                    )}

                                                    <div className="flex flex-wrap gap-1.5">
                                                        {activity.vibes.slice(0, 3).map(vibe => (
                                                            <span key={vibe} className="text-[10px] px-2 py-0.5 bg-white/5 rounded-full text-slate-400 border border-white/5">
                                                                #{vibe}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </a>

                                            {/* Selection checkbox */}
                                            <div className="absolute top-3 right-3">
                                                <button
                                                    onClick={() => toggleActivitySelection(activity.id)}
                                                    className={cn(
                                                        "w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all",
                                                        isSelected ? "bg-primary border-primary text-white" : "border-white/20 bg-black/20 text-transparent hover:border-primary/50"
                                                    )}
                                                >
                                                    <Check className="w-3.5 h-3.5 stroke-[3px]" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                                <Search className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                                <h2 className="text-xl font-semibold text-white mb-2">No places found</h2>
                                <p className="text-slate-400 max-w-xs mx-auto text-sm">
                                    Try a different category or check back later.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* ─── PLANS TAB ─── */}
                {activeTab === "plans" && (
                    <div className="space-y-4">
                        {/* Plan Search Bar */}
                        <div className="relative group mb-6">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                <Search className="w-5 h-5 text-slate-400" />
                            </div>
                            <input
                                type="text"
                                value={planSearchQuery}
                                onChange={(e) => setPlanSearchQuery(e.target.value)}
                                placeholder="Search public plans..."
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all"
                            />
                        </div>

                        {isLoading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="rounded-2xl border border-white/5 bg-card/50 overflow-hidden animate-pulse">
                                        <div className="h-32 bg-slate-800" />
                                        <div className="p-4 space-y-3">
                                            <div className="h-5 bg-slate-800 rounded-lg w-3/4" />
                                            <div className="h-3 bg-slate-800/60 rounded w-1/2" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : visibleHangouts.length > 0 ? (
                            visibleHangouts.map(hangout => (
                                <HangoutCard
                                    key={hangout.id}
                                    hangout={hangout}
                                    variant="upcoming"
                                />
                            ))
                        ) : (
                            <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                                <Compass className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                                <h2 className="text-xl font-semibold text-white mb-2">No public plans yet</h2>
                                <p className="text-slate-400 max-w-xs mx-auto text-sm">
                                    Be the first to create a public hangout!
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Selection FAB */}
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
