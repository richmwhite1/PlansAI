"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, MapPin, Search, X, Loader2, Check, Plus, Link } from "lucide-react";
import { cn, calculateDistance } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";

interface Activity {
    id: string;
    title: string;
    type: string;
    matchPercentage: number;
    reason: string;
    imageUrl?: string;
    rating?: number;
    address?: string;
    isCustom?: boolean;
    distance?: number;
    latitude?: number;
    longitude?: number;
    websiteUrl?: string;
    locationUrl?: string;
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
    location = { lat: 37.7749, lng: -122.4194 },
    friendIds = [],
    selectedActivityIds = [],
    isMultiSelect = false
}: ActivitySuggestionsProps) {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [trending, setTrending] = useState<Activity[]>([]);
    const [isThinking, setIsThinking] = useState(false);
    const [isLoadingTrending, setIsLoadingTrending] = useState(false);

    // Custom Options state
    const [customOptions, setCustomOptions] = useState<Activity[]>([]);
    const [isAddingCustom, setIsAddingCustom] = useState(false);
    const [customValue, setCustomValue] = useState("");
    const [customEventUrl, setCustomEventUrl] = useState("");
    const [customLocationUrl, setCustomLocationUrl] = useState("");
    const [showEventUrl, setShowEventUrl] = useState(false);
    const [showLocationUrl, setShowLocationUrl] = useState(false);
    const customInputRef = useRef<HTMLInputElement>(null);

    // Filter State
    const [activeFilter, setActiveFilter] = useState<'All' | 'Food' | 'Activity' | 'Nightlife'>('All');
    const [distanceFilter, setDistanceFilter] = useState<5 | 10 | 25>(10);

    // Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<Activity[]>([]);
    const [isSearchingApi, setIsSearchingApi] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    // Fetch Trending
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

    // Fetch AI Suggestions (Initial)
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
                radius: distanceFilter * 1609,
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
                        address: a.address,
                        latitude: a.latitude,
                        longitude: a.longitude
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

    const handleAddCustom = () => {
        if (!customValue.trim()) return;
        const newCustom: Activity & { websiteUrl?: string; locationUrl?: string } = {
            id: `custom-${Date.now()}`,
            title: customValue.trim(),
            type: 'Custom Option',
            matchPercentage: 100,
            reason: 'Your own idea',
            isCustom: true,
            websiteUrl: customEventUrl.trim() || undefined,
            locationUrl: customLocationUrl.trim() || undefined
        };
        setCustomOptions(prev => [newCustom, ...prev]);
        onSelectCallback(newCustom);
        setCustomValue("");
        setCustomEventUrl("");
        setCustomLocationUrl("");
        setShowEventUrl(false);
        setShowLocationUrl(false);
        setIsAddingCustom(false);
    };

    // Unified Search Handler (DB + Google)
    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (!query.trim()) {
            setSearchResults([]);
            setHasSearched(false);
            return;
        }

        setIsSearchingApi(true);
        setHasSearched(true);

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
                    address: a.address,
                    latitude: a.latitude,
                    longitude: a.longitude
                })));
            }
        } catch (err) {
            console.error("Search failed:", err);
        } finally {
            setIsSearchingApi(false);
        }
    };

    // AI Fallback Search
    const handleAiSearch = async () => {
        if (!searchQuery.trim()) return;
        setIsThinking(true); // Reuse the main loading state for visual consistency

        try {
            const res = await fetch("/api/ai/find-activities", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query: searchQuery,
                    latitude: location.lat,
                    longitude: location.lng,
                    radius: 25 * 1609,
                    friendIds
                })
            });
            const data = await res.json();
            if (data.activities) {
                // Append AI results to current search results
                const newResults = data.activities.map((a: any) => ({
                    id: a.id,
                    title: a.name,
                    type: a.category,
                    matchPercentage: a.matchPercentage || 0,
                    reason: a.reason || "AI Match for " + searchQuery,
                    imageUrl: a.imageUrl,
                    rating: a.rating,
                    address: a.address,
                    latitude: a.latitude,
                    longitude: a.longitude
                }));

                // Avoid duplicates
                setSearchResults(prev => {
                    const existingIds = new Set(prev.map(p => p.id));
                    return [...prev, ...newResults.filter((n: any) => !existingIds.has(n.id))];
                });
            }
        } catch (err) {
            console.error("AI Search failed:", err);
        } finally {
            setIsThinking(false);
        }
    };

    // Combine all selectable options
    // If searching, show search results. If not, show suggestions/trending.
    // Custom options always show at top if they match filter/query

    // Filter custom options by query if searching
    const visibleCustomOptions = customOptions.filter(c =>
        !searchQuery || c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const baseOptions = hasSearched ? searchResults : (activities.length > 0 ? activities : trending);

    const allOptions = [
        ...visibleCustomOptions,
        ...baseOptions
    ];

    const filteredOptions = allOptions.filter(a =>
        activeFilter === 'All' || a.type === activeFilter || a.isCustom
    ).map(activity => {
        // Calculate distance if coordinates exist
        let dist = activity.distance;
        if (!dist && activity.latitude && activity.longitude && location.lat && location.lng) {
            dist = calculateDistance(location.lat, location.lng, activity.latitude, activity.longitude);
        }
        return { ...activity, distance: dist };
    });

    return (
        <div className={cn(
            "relative rounded-2xl transition-all duration-500",
            !hasFriendsSelected && "opacity-50 grayscale pointer-events-none"
        )}>
            {/* Search & Actions Header */}
            <div className="flex flex-col gap-3 mb-4">
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Find places, activities, food..."
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-sm text-foreground outline-none focus:border-primary/50 focus:bg-slate-900"
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                        />
                        {isSearchingApi && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <Loader2 className="w-4 h-4 text-primary animate-spin" />
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => setIsAddingCustom(true)}
                        className="flex items-center justify-center p-3 bg-primary/20 hover:bg-primary/30 text-primary rounded-xl border border-primary/20 transition-all"
                        title="Add Custom Option"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Custom Input Overlay */}
            <AnimatePresence>
                {isAddingCustom && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="p-4 bg-card rounded-2xl border border-primary/20 shadow-2xl mb-4 space-y-3"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Add Custom Idea</span>
                            <button onClick={() => setIsAddingCustom(false)} className="text-slate-500 hover:text-slate-300"><X size={14} /></button>
                        </div>
                        <div className="space-y-3">
                            <div className="relative">
                                <input
                                    autoFocus
                                    ref={customInputRef}
                                    type="text"
                                    placeholder="e.g. Backyard Stargazing, Poker Night..."
                                    className="w-full bg-input/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary pr-24"
                                    value={customValue}
                                    onChange={(e) => setCustomValue(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
                                />
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                    <button
                                        onClick={() => setShowEventUrl(!showEventUrl)}
                                        className={cn(
                                            "p-2 rounded-lg transition-colors",
                                            showEventUrl || customEventUrl ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
                                        )}
                                        title="Add Event Link"
                                    >
                                        <Link className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setShowLocationUrl(!showLocationUrl)}
                                        className={cn(
                                            "p-2 rounded-lg transition-colors",
                                            showLocationUrl || customLocationUrl ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
                                        )}
                                        title="Add Location Link"
                                    >
                                        <MapPin className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <AnimatePresence>
                                {showEventUrl && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <input
                                            type="url"
                                            placeholder="Event Website URL"
                                            className="w-full bg-input/30 border border-white/5 rounded-xl px-4 py-2 text-xs text-foreground outline-none focus:border-primary/50"
                                            value={customEventUrl}
                                            onChange={(e) => setCustomEventUrl(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
                                        />
                                    </motion.div>
                                )}
                                {showLocationUrl && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden mt-2"
                                    >
                                        <input
                                            type="url"
                                            placeholder="Google Maps / Location URL"
                                            className="w-full bg-input/30 border border-white/5 rounded-xl px-4 py-2 text-xs text-foreground outline-none focus:border-primary/50"
                                            value={customLocationUrl}
                                            onChange={(e) => setCustomLocationUrl(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        <button
                            onClick={handleAddCustom}
                            className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-lg active:scale-[0.98]"
                        >
                            Add to Options
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-4">
                <div className="flex bg-slate-800/50 rounded-lg p-1 border border-white/5 text-xs">
                    {(['All', 'Food', 'Activity', 'Nightlife'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setActiveFilter(f)}
                            className={cn(
                                "px-3 py-1.5 rounded-md font-bold uppercase tracking-tight transition-all",
                                activeFilter === f ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                {isThinking && !hasSearched ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <p className="text-xs text-muted-foreground">Consulting AI experts...</p>
                    </div>
                ) : filteredOptions.length > 0 ? (
                    filteredOptions.map((activity, i) => {
                        const isSelected = selectedActivityIds.includes(activity.id);
                        return (
                            <motion.button
                                key={activity.id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }}
                                onClick={() => onSelectCallback(activity)}
                                className={cn(
                                    "w-full text-left p-4 rounded-2xl transition-all group relative overflow-hidden border",
                                    isSelected
                                        ? "bg-primary/20 border-primary/50 ring-2 ring-primary/20"
                                        : "bg-white/5 border-white/5 hover:bg-white/10"
                                )}
                            >
                                <div className="flex gap-4">
                                    <div className="w-16 h-16 rounded-xl bg-slate-800 shrink-0 overflow-hidden relative border border-white/5">
                                        {activity.imageUrl ? (
                                            <img src={activity.imageUrl} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-slate-900 text-primary">
                                                {activity.isCustom ? <Sparkles size={24} /> : <MapPin size={24} className="text-muted-foreground" />}
                                            </div>
                                        )}
                                        {isSelected && (
                                            <div className="absolute inset-0 bg-primary/40 flex items-center justify-center">
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
                                            {activity.distance !== undefined && (
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-white/5">
                                                    {activity.distance < 0.1 ? "Here" : `${activity.distance.toFixed(1)} mi`}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={cn(
                                                "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
                                                activity.isCustom ? "bg-primary/20 text-primary" : "bg-slate-800 text-muted-foreground"
                                            )}>
                                                {activity.type}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 line-clamp-1 italic">
                                            {activity.reason}
                                        </p>
                                    </div>

                                    <div className="flex flex-col justify-between items-end gap-2">
                                        <a
                                            href={activity.websiteUrl || activity.locationUrl || `https://www.google.com/search?q=${encodeURIComponent(activity.title + ' ' + (activity.address || ''))}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="p-2 rounded-full bg-white/5 hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors"
                                            title="Visit Website / Info"
                                        >
                                            <Link className="w-4 h-4" />
                                        </a>
                                    </div>
                                </div>
                            </motion.button>
                        );
                    })
                ) : !isThinking && (
                    <div className="text-center py-12">
                        <p className="text-slate-500 text-sm">No options found.</p>
                    </div>
                )}

                {/* AI Fallback Trigger */}
                {searchQuery && !isThinking && (
                    <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={handleAiSearch}
                        className="w-full p-4 mt-2 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all flex items-center gap-3 text-left group"
                    >
                        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-primary-foreground group-hover:text-white transition-colors">
                                Use AI to find "{searchQuery}"
                            </p>
                            <p className="text-xs text-primary/60">
                                Can't find it locally? Let our AI scout the area.
                            </p>
                        </div>
                    </motion.button>
                )}

                {isThinking && hasSearched && (
                    <div className="w-full p-4 mt-2 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center gap-3">
                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                        <span className="text-xs font-medium text-primary">AI is scouting for options...</span>
                    </div>
                )}
            </div>
        </div>
    );
}
