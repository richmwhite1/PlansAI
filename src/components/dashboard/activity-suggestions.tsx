"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, MapPin, Search, X, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface Activity {
    id: string;
    title: string;
    type: string; // 'Restaurant', 'Activity', etc.
    matchPercentage: number;
    reason: string;
    imageUrl?: string;
    rating?: number;
    address?: string;
}

interface ActivitySuggestionsProps {
    hasFriendsSelected: boolean;
    onSelectCallback: (activity: Activity) => void;
    location?: { lat: number; lng: number };
    friendIds?: string[];
    selectedActivityIds?: string[];
    isMultiSelect?: boolean;
}

export function ActivitySuggestions({
    hasFriendsSelected,
    onSelectCallback,
    location = { lat: 37.7749, lng: -122.4194 }, // Default to SF
    friendIds = [],
    selectedActivityIds = [],
    isMultiSelect = false
}: ActivitySuggestionsProps) {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [trending, setTrending] = useState<Activity[]>([]);
    const [isThinking, setIsThinking] = useState(false);
    const [isLoadingTrending, setIsLoadingTrending] = useState(false);

    // Filter State
    const [activeFilter, setActiveFilter] = useState<'All' | 'Food' | 'Activity' | 'Nightlife'>('All');
    const [distanceFilter, setDistanceFilter] = useState<5 | 10 | 25>(10);

    // Search State
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<Activity[]>([]);
    const [isSearchingApi, setIsSearchingApi] = useState(false);
    const [lastQuery, setLastQuery] = useState("");

    // Fetch Trending on mount/location change
    useEffect(() => {
        setIsLoadingTrending(true);
        fetch(`/api/events/trending?lat=${location.lat}&lng=${location.lng}&radius=${distanceFilter}`)
            .then(res => res.json())
            .then(data => {
                if (data.activities) setTrending(data.activities);
            })
            .catch(console.error)
            .finally(() => setIsLoadingTrending(false));
    }, [location.lat, location.lng, distanceFilter]);

    // Fetch AI Suggestions when friends are selected
    const getAiRecommendations = () => {
        if (!hasFriendsSelected) return;
        setIsThinking(true);
        setActivities([]);

        fetch("/api/ai/suggest-activities", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                latitude: location.lat,
                longitude: location.lng,
                radius: distanceFilter * 1609, // Convert miles to meters
                friendIds
            })
        })
            .then(res => res.json())
            .then(data => {
                if (data.activities) {
                    setActivities(data.activities.map((a: any) => ({
                        id: a.id,
                        title: a.name,
                        type: a.category,
                        matchPercentage: a.matchPercentage || 85,
                        reason: a.reason || "Popular nearby",
                        imageUrl: a.imageUrl,
                        rating: a.rating,
                        address: a.address
                    })));
                }
            })
            .catch(err => console.error("Failed to fetch suggestions:", err))
            .finally(() => setIsThinking(false));
    };

    useEffect(() => {
        if (hasFriendsSelected && activities.length === 0 && !isThinking) {
            getAiRecommendations();
        }
    }, [hasFriendsSelected, friendIds]);

    const handleSearch = async (query: string) => {
        if (!query.trim()) return;
        setLastQuery(query);
        setIsSearchingApi(true);

        try {
            const res = await fetch("/api/events/search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query,
                    latitude: location.lat,
                    longitude: location.lng,
                    radius: distanceFilter * 1609,
                    friendIds
                })
            });
            const data = await res.json();
            if (data.activities) {
                setSearchResults(data.activities.map((a: any) => ({
                    id: a.id,
                    title: a.name,
                    type: a.category,
                    matchPercentage: a.matchPercentage || 0,
                    reason: a.reason || "Search result",
                    imageUrl: a.imageUrl,
                    rating: a.rating,
                    address: a.address
                })));
            }
        } catch (err) {
            console.error("Search failed:", err);
        } finally {
            setIsSearchingApi(false);
        }
    };

    const handleAiSearch = async (query: string) => {
        if (!query.trim()) return;
        setIsSearchingApi(true);
        setLastQuery(query);

        try {
            const res = await fetch("/api/ai/find-activities", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query,
                    latitude: location.lat,
                    longitude: location.lng,
                    radius: 25 * 1609, // Larger radius for AI search
                    friendIds
                })
            });
            const data = await res.json();
            if (data.activities) {
                setSearchResults(data.activities.map((a: any) => ({
                    id: a.id,
                    title: a.name,
                    type: a.category,
                    matchPercentage: a.matchPercentage || 0,
                    reason: a.reason || "AI Search result",
                    imageUrl: a.imageUrl,
                    rating: a.rating,
                    address: a.address
                })));
            }
        } catch (err) {
            console.error("AI Search failed:", err);
        } finally {
            setIsSearchingApi(false);
        }
    };

    return (
        <div className={cn(
            "relative rounded-2xl p-6 transition-all duration-500 border border-white/5 bg-slate-900/40 backdrop-blur-xl",
            hasFriendsSelected ? "ring-2 ring-violet-500/50 shadow-[0_0_30px_-5px_var(--color-violet-500)]" : "opacity-50 grayscale"
        )}>

            {/* AI Pulse Effect Overlay */}
            <AnimatePresence>
                {isThinking && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-500/20 via-fuchsia-500/20 to-violet-500/20 animate-gradient-x pointer-events-none"
                    />
                )}
            </AnimatePresence>

            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <label className={cn(
                        "text-xs font-semibold uppercase tracking-wider transition-colors",
                        hasFriendsSelected ? "text-violet-300" : "text-slate-500"
                    )}>
                        Pick What to Do
                    </label>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={getAiRecommendations}
                            disabled={!hasFriendsSelected || isThinking}
                            className="p-2 rounded-lg bg-violet-600/20 text-violet-400 hover:bg-violet-600/30 disabled:opacity-50 transition-colors"
                            title="Refresh AI Suggestions"
                        >
                            <Sparkles className={cn("w-4 h-4", isThinking && "animate-spin")} />
                        </button>
                    </div>
                </div>

                {/* Proximity & Type Filters - Mobile Friendly */}
                <div className="flex flex-wrap gap-2">
                    <div className="flex bg-slate-800/50 rounded-lg p-1 border border-white/5">
                        {(['All', 'Food', 'Activity', 'Nightlife'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setActiveFilter(f)}
                                className={cn(
                                    "px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-tight transition-all",
                                    activeFilter === f ? "bg-violet-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                                )}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                    <div className="flex bg-slate-800/50 rounded-lg p-1 border border-white/5">
                        {([5, 10, 25] as const).map((d) => (
                            <button
                                key={d}
                                onClick={() => setDistanceFilter(d)}
                                className={cn(
                                    "px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-tight transition-all",
                                    distanceFilter === d ? "bg-blue-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                                )}
                            >
                                {d}mi
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {!hasFriendsSelected ? (
                <div className="space-y-6">
                    {/* Trending Section when no friends selected */}
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                            <MapPin className="w-3 h-3" />
                            Trending Nearby
                        </h3>
                        {isLoadingTrending ? (
                            <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-slate-600" /></div>
                        ) : (
                            <div className="space-y-2">
                                {trending.map(a => (
                                    <div key={a.id} className="flex items-center gap-3 p-2 bg-white/5 rounded-xl border border-white/5 opacity-70">
                                        <div className="w-10 h-10 rounded-lg bg-slate-800 shrink-0 overflow-hidden">
                                            {a.imageUrl ? <img src={a.imageUrl} className="w-full h-full object-cover" /> : <MapPin className="w-4 h-4 m-3 text-slate-600" />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-slate-300 truncate">{a.title}</p>
                                            <p className="text-[10px] text-slate-500 uppercase">{a.type}</p>
                                        </div>
                                    </div>
                                ))}
                                <p className="text-[10px] text-slate-600 italic text-center">Add friends to unlock AI recommendations & booking</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : isThinking ? (
                <div className="h-48 flex flex-col items-center justify-center gap-3">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
                        <Sparkles className="absolute inset-0 m-auto w-5 h-5 text-violet-400 animate-pulse" />
                    </div>
                    <p className="text-xs text-violet-300 font-medium animate-pulse">Consulting local experts...</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Selected List / AI Results */}
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                        {(activities.length > 0 ? activities : trending)
                            .filter(a => activeFilter === 'All' || a.type === activeFilter)
                            .map((activity, i) => {
                                const isSelected = selectedActivityIds.includes(activity.id);
                                return (
                                    <motion.button
                                        key={activity.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }}
                                        onClick={() => onSelectCallback(activity)}
                                        className={cn(
                                            "w-full text-left p-4 rounded-2xl transition-all group relative overflow-hidden border",
                                            isSelected
                                                ? "bg-violet-600/20 border-violet-500/50 ring-2 ring-violet-500/20"
                                                : "bg-white/5 border-white/5 hover:bg-white/10"
                                        )}
                                    >
                                        <div className="flex gap-4">
                                            <div className="w-16 h-16 rounded-xl bg-slate-800 shrink-0 overflow-hidden relative border border-white/5">
                                                {activity.imageUrl ? (
                                                    <img src={activity.imageUrl} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-slate-900">
                                                        <MapPin className="w-6 h-6 text-slate-700" />
                                                    </div>
                                                )}
                                                {isSelected && (
                                                    <div className="absolute inset-0 bg-violet-600/40 flex items-center justify-center">
                                                        <Check className="w-8 h-8 text-white" />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2 mb-1">
                                                    <h4 className="font-bold text-slate-200 truncate">{activity.title}</h4>
                                                    {activity.rating && (
                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                                                            ★ {activity.rating.toFixed(1)}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 uppercase tracking-widest">
                                                        {activity.type}
                                                    </span>
                                                    {activity.matchPercentage > 0 && (
                                                        <span className="text-[9px] font-bold text-violet-400 uppercase tracking-tighter">
                                                            {activity.matchPercentage}% Vibes Match
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500 line-clamp-1 italic">
                                                    {activity.reason}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.button>
                                );
                            })}
                    </div>

                    <button
                        onClick={() => setIsSearching(true)}
                        className="w-full py-4 rounded-xl border border-dashed border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-all text-sm font-medium flex items-center justify-center gap-2 mb-2"
                    >
                        <Search className="w-4 h-4" />
                        Search or Ask AI
                    </button>
                </div>
            )}

            {/* Search Overlay */}
            <AnimatePresence>
                {isSearching && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[60] flex flex-col p-4"
                    >
                        <div className="flex items-center gap-2 mb-4 mt-safe">
                            <Search className="w-4 h-4 text-slate-400" />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Sushi, Hike, Bowling..."
                                className="bg-transparent border-none outline-none text-slate-200 placeholder:text-slate-600 text-sm flex-1"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleSearch(e.currentTarget.value);
                                    }
                                }}
                            />
                            <button onClick={() => setIsSearching(false)} className="text-slate-500 hover:text-slate-300">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2">
                            {isSearchingApi ? (
                                <div className="flex justify-center py-8">
                                    <div className="w-6 h-6 rounded-full border-2 border-slate-500 border-t-white animate-spin" />
                                </div>
                            ) : searchResults.length > 0 ? (
                                searchResults.map((activity, i) => (
                                    <motion.button
                                        key={activity.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        onClick={() => {
                                            onSelectCallback(activity);
                                            if (!isMultiSelect) {
                                                setIsSearching(false);
                                            }
                                        }}
                                        className={cn(
                                            "w-full text-left p-3 rounded-xl transition-all group relative overflow-hidden border",
                                            selectedActivityIds.includes(activity.id)
                                                ? "bg-violet-600/20 border-violet-500/50"
                                                : "bg-white/5 border-white/5 hover:bg-white/10"
                                        )}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-slate-200">{activity.title}</span>
                                                {selectedActivityIds.includes(activity.id) && <Check className="w-3 h-3 text-violet-400" />}
                                            </div>
                                            {activity.matchPercentage > 0 && (
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-mono">
                                                    {activity.matchPercentage}%
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-400">{activity.type}</p>
                                    </motion.button>
                                ))
                            ) : lastQuery ? (
                                <div className="text-center py-12 px-4">
                                    <p className="text-slate-500 text-sm mb-4">
                                        No results found for "{lastQuery}".
                                    </p>
                                    <button
                                        onClick={() => handleAiSearch(lastQuery)}
                                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-violet-600 text-white rounded-full text-xs font-bold hover:bg-violet-500 transition-all shadow-lg shadow-violet-500/20 active:scale-95"
                                    >
                                        <Sparkles className="w-3.5 h-3.5" />
                                        Ask AI to find "{lastQuery}"
                                    </button>
                                    <p className="text-[10px] text-slate-600 mt-4 leading-relaxed italic">
                                        Our AI can search the web and local directories to find niche spots.
                                    </p>
                                </div>
                            ) : (
                                <p className="text-center text-slate-500 text-sm py-12">
                                    Type to search nearby places...
                                </p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
