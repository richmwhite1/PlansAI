"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import useSWR from "swr";
import {
    MapPin, Calendar, Compass, Loader2, Users,
    Search, Sparkles, Check, Send, Star,
    Ticket, Utensils, Music, Footprints, Camera,
    UserPlus, X, ExternalLink, Clock, Zap, Edit2,
    ChevronRight
} from "lucide-react";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { FriendSelector } from "@/components/dashboard/friend-selector";
import { InviteModal } from "@/components/dashboard/invite-modal";
import { toast } from "sonner";
import { HangoutCard } from "@/components/hangout/hangout-card";
import { LocationSearch } from "@/components/ui/location-search";

interface Friend {
    id: string;
    name: string;
    avatar: string;
    phone?: string;
    isGuest?: boolean;
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
    isSuggested?: boolean;
}

interface PlatformLinks {
    eventbrite: string;
    google: string;
    ticketmaster: string;
    facebook: string;
}

const PLACE_CATEGORIES = [
    { id: "all", label: "All", icon: Compass },
    { id: "restaurant", label: "Dining", icon: Utensils },
    { id: "bar", label: "Bars", icon: Music },
    { id: "activity", label: "Activities", icon: Footprints },
    { id: "sightseeing", label: "Sightsee", icon: Camera },
];

const EVENT_CHIPS = ["Live Music", "Comedy Shows", "Sports", "Food Festivals", "Concerts", "Art"];

const fetcher = (url: string) => fetch(url).then(r => r.json());

// Build "Fri Mar 21" style label for a date
function quickDateLabel(d: Date): string {
    return format(d, "EEE MMM d");
}

function getQuickDates() {
    const today = new Date();
    const getNext = (dow: number) => {
        const d = new Date();
        let diff = (dow - d.getDay() + 7) % 7;
        if (diff === 0) diff = 7;
        d.setDate(d.getDate() + diff);
        return d;
    };
    return [
        { label: "Today", date: today, key: "today" },
        { label: "Tomorrow", date: addDays(today, 1), key: "tomorrow" },
        { label: "Fri", date: getNext(5), key: "fri" },
        { label: "Sat", date: getNext(6), key: "sat" },
        { label: "Sun", date: getNext(0), key: "sun" },
    ];
}

export default function DiscoverPage() {
    const router = useRouter();

    // ── Location ────────────────────────────────────────────────────────────
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [locationLabel, setLocationLabel] = useState<string>("Locating…");
    const [isEditingLocation, setIsEditingLocation] = useState(false);

    useEffect(() => {
        if (!navigator.geolocation) {
            setUserLocation({ lat: 40.7608, lng: -111.8910 });
            setLocationLabel("Salt Lake City, UT");
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                // Reverse-geocode via Nominatim (free, no key needed)
                fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`, {
                    headers: { "Accept-Language": "en" }
                })
                    .then(r => r.json())
                    .then(d => {
                        const city = d.address?.city || d.address?.town || d.address?.village || d.address?.county || "";
                        const state = d.address?.state_code || d.address?.state || "";
                        if (city) setLocationLabel(`${city}, ${state}`);
                        else setLocationLabel("Near You");
                    })
                    .catch(() => setLocationLabel("Near You"));
            },
            () => {
                setUserLocation({ lat: 40.7608, lng: -111.8910 });
                setLocationLabel("Salt Lake City, UT");
            }
        );
    }, []);

    const handleLocationSelect = (loc: { lat: number; lng: number; city: string; state: string }) => {
        setUserLocation({ lat: loc.lat, lng: loc.lng });
        setLocationLabel(`${loc.city}, ${loc.state}`);
        setIsEditingLocation(false);
    };

    // ── Date ────────────────────────────────────────────────────────────────
    const quickDates = getQuickDates();
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const selectedDateStr = format(selectedDate, "yyyy-MM-dd");

    // ── Search ──────────────────────────────────────────────────────────────
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<{ places: Activity[]; events: DiscoverEvent[] } | null>(null);

    const handleSearch = async (q: string) => {
        if (!q.trim() || !userLocation) return;
        setIsSearching(true);
        setSearchResults(null);
        try {
            const [placeRes, eventRes] = await Promise.allSettled([
                fetch("/api/events/search", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ query: q, latitude: userLocation.lat, longitude: userLocation.lng, radius: 25000 }),
                }).then(r => r.json()),
                fetch("/api/events/discover", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ query: q, latitude: userLocation.lat, longitude: userLocation.lng, targetDate: selectedDateStr }),
                }).then(r => r.json()),
            ]);
            const places = placeRes.status === "fulfilled" ? (placeRes.value.activities || []).map((a: any) => ({ ...a, name: a.name || a.title })) : [];
            const events = eventRes.status === "fulfilled" ? (eventRes.value.events || []) : [];
            setSearchResults({ places, events });
        } catch (err) {
            toast.error("Search failed");
        } finally {
            setIsSearching(false);
        }
    };

    // ── Places (from DB) ─────────────────────────────────────────────────────
    const [placeCategory, setPlaceCategory] = useState("all");
    const placesKey = userLocation
        ? `/api/discover?type=activities&lat=${userLocation.lat}&lng=${userLocation.lng}${placeCategory !== "all" ? `&category=${placeCategory}` : ""}`
        : null;
    const { data: placesData, isLoading: placesLoading } = useSWR(placesKey, fetcher, { revalidateOnFocus: false, dedupingInterval: 60000 });
    const places: Activity[] = placesData?.activities || [];

    // ── Events (auto-load for selected date) ─────────────────────────────────
    const [events, setEvents] = useState<DiscoverEvent[]>([]);
    const [eventsLoading, setEventsLoading] = useState(false);
    const [platformLinks, setPlatformLinks] = useState<PlatformLinks | null>(null);
    const [hasSuggested, setHasSuggested] = useState(false);
    const [autoEventQuery, setAutoEventQuery] = useState("things to do");
    const eventsLoadedFor = useRef<string>("");

    const loadEventsForDate = useCallback(async (dateStr: string, query: string) => {
        if (!userLocation) return;
        const cacheKey = `${dateStr}|${query}|${userLocation.lat.toFixed(3)}`;
        if (eventsLoadedFor.current === cacheKey) return;
        eventsLoadedFor.current = cacheKey;
        setEventsLoading(true);
        setEvents([]);
        try {
            const res = await fetch("/api/events/discover", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query, latitude: userLocation.lat, longitude: userLocation.lng, targetDate: dateStr, radiusMiles: 50 }),
            });
            const data = await res.json();
            setEvents(data.events || []);
            setPlatformLinks(data.platformLinks || null);
            setHasSuggested(data.hasSuggested || false);
        } catch {
            setEvents([]);
        } finally {
            setEventsLoading(false);
        }
    }, [userLocation]);

    useEffect(() => {
        if (userLocation) {
            eventsLoadedFor.current = "";
            loadEventsForDate(selectedDateStr, autoEventQuery);
        }
    }, [selectedDate, userLocation, autoEventQuery]);

    // ── Public Plans ─────────────────────────────────────────────────────────
    const plansKey = userLocation ? `/api/discover?type=hangouts&lat=${userLocation.lat}&lng=${userLocation.lng}` : null;
    const { data: plansData, isLoading: plansLoading } = useSWR(plansKey, fetcher, { revalidateOnFocus: false, dedupingInterval: 60000 });
    const publicPlans = plansData?.hangouts || [];

    // ── Selection + Plan creation ─────────────────────────────────────────────
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [selectedActivities, setSelectedActivities] = useState<any[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [showFriendSelector, setShowFriendSelector] = useState(false);
    const [selectedFriends, setSelectedFriends] = useState<Friend[]>([]);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [createdHangoutData, setCreatedHangoutData] = useState<{ inviteUrl: string; slug: string } | null>(null);
    const [planDateValue, setPlanDateValue] = useState("");
    const [isMultiDay, setIsMultiDay] = useState(false);
    const [endDateValue, setEndDateValue] = useState("");

    const toggleSelect = (item: any) => {
        const id = item.id;
        const newIds = new Set(selectedIds);
        if (newIds.has(id)) {
            newIds.delete(id);
            setSelectedActivities(prev => prev.filter(a => a.id !== id));
        } else {
            newIds.add(id);
            setSelectedActivities(prev => [...prev, item]);
        }
        setSelectedIds(newIds);
    };

    const handleCreateHangout = async () => {
        if (selectedActivities.length === 0) return;
        setIsCreating(true);
        try {
            const res = await fetch("/api/hangouts/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    activities: selectedActivities,
                    friendIds: selectedFriends.filter(f => !f.isGuest).map(f => f.id),
                    guests: selectedFriends.filter(f => f.isGuest).map(f => ({ name: f.name })),
                    when: planDateValue || undefined,
                    endDate: isMultiDay && endDateValue ? new Date(endDateValue).toISOString() : undefined,
                }),
            });
            const data = await res.json();
            if (data.slug) {
                const hasGuests = selectedFriends.some(f => f.isGuest);
                if (hasGuests) {
                    setCreatedHangoutData({ inviteUrl: `${window.location.origin}/hangouts/${data.slug}`, slug: data.slug });
                    setShowInviteModal(true);
                } else {
                    toast.success("Plan created!");
                    router.push(`/hangouts/${data.slug}`);
                }
            }
        } catch {
            toast.error("Failed to create plan");
        } finally {
            setIsCreating(false);
        }
    };

    const isSelectedDate = (d: Date) => format(d, "yyyy-MM-dd") === selectedDateStr;

    return (
        <div className="min-h-screen bg-background text-foreground">
            <main className="container mx-auto max-w-2xl px-4 py-4 pb-36">

                {/* ── Header: Location + Date ──────────────────────────────────── */}
                <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl pt-2 pb-3 -mx-4 px-4 border-b border-white/5">
                    {/* Location pill */}
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5">
                            <Compass className="w-4 h-4 text-primary" />
                            <span className="text-sm font-semibold text-white">Discover</span>
                        </div>

                        <button
                            onClick={() => setIsEditingLocation(!isEditingLocation)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
                        >
                            <MapPin className="w-3.5 h-3.5 text-primary" />
                            <span className="text-xs font-medium text-slate-300 max-w-[140px] truncate">{locationLabel}</span>
                            <Edit2 className="w-3 h-3 text-slate-500 group-hover:text-slate-300 transition-colors" />
                        </button>
                    </div>

                    {/* Location search (expandable) */}
                    <AnimatePresence>
                        {isEditingLocation && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden mb-3"
                            >
                                <LocationSearch
                                    onSelect={handleLocationSelect}
                                    placeholder="Search city or zip code…"
                                    className="w-full"
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Date quick-picks */}
                    <div className="flex gap-1.5">
                        {quickDates.map(({ label, date, key }) => (
                            <button
                                key={key}
                                onClick={() => setSelectedDate(date)}
                                className={cn(
                                    "flex-1 py-2 rounded-xl text-[11px] font-bold border transition-all",
                                    isSelectedDate(date)
                                        ? "bg-primary text-black border-primary shadow-lg shadow-primary/25"
                                        : "bg-white/5 border-white/8 text-slate-400 hover:text-white hover:bg-white/10"
                                )}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Unified Search Bar ───────────────────────────────────────── */}
                <form
                    onSubmit={(e) => { e.preventDefault(); handleSearch(searchQuery); }}
                    className="relative mt-4 mb-6"
                >
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search places, events, things to do…"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-11 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all"
                    />
                    <button
                        type="submit"
                        disabled={isSearching || !searchQuery.trim()}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg disabled:opacity-40 transition-colors"
                    >
                        {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                </form>

                {/* ── SEARCH RESULTS (shown when active) ──────────────────────── */}
                <AnimatePresence>
                    {(isSearching || searchResults) && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="mb-8 space-y-4"
                        >
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Search Results</h2>
                                <button
                                    onClick={() => { setSearchResults(null); setSearchQuery(""); }}
                                    className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1"
                                >
                                    <X className="w-3 h-3" /> Clear
                                </button>
                            </div>

                            {isSearching && (
                                <div className="space-y-3">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse border border-white/5" />
                                    ))}
                                </div>
                            )}

                            {searchResults && (
                                <>
                                    {searchResults.events.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Events on {format(selectedDate, "MMM d")}</p>
                                            {searchResults.events.map(ev => (
                                                <EventCard key={ev.id} event={ev} isSelected={selectedIds.has(ev.id)} onToggle={() => toggleSelect(ev)} />
                                            ))}
                                        </div>
                                    )}
                                    {searchResults.places.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Places</p>
                                            {searchResults.places.map(p => (
                                                <PlaceCard key={p.id} place={p} isSelected={selectedIds.has(p.id)} onToggle={() => toggleSelect(p)} />
                                            ))}
                                        </div>
                                    )}
                                    {searchResults.events.length === 0 && searchResults.places.length === 0 && (
                                        <div className="py-10 text-center">
                                            <p className="text-slate-400 text-sm">No results for <span className="text-white font-semibold">"{searchQuery}"</span></p>
                                            <p className="text-slate-600 text-xs mt-1">Try different keywords or broaden the date range</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── EVENTS SECTION ───────────────────────────────────────────── */}
                {!searchResults && (
                    <section className="mb-8">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-base font-bold text-white flex items-center gap-2">
                                <Ticket className="w-4 h-4 text-primary" />
                                What&apos;s On {format(selectedDate, "EEE, MMM d")}
                            </h2>
                        </div>

                        {/* Quick event chips */}
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none mb-3">
                            {EVENT_CHIPS.map(chip => (
                                <button
                                    key={chip}
                                    onClick={() => { setAutoEventQuery(chip); eventsLoadedFor.current = ""; }}
                                    className={cn(
                                        "px-3 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap transition-all",
                                        autoEventQuery === chip
                                            ? "bg-primary text-black border-primary"
                                            : "bg-white/5 border-white/8 text-slate-400 hover:text-white hover:border-white/20"
                                    )}
                                >
                                    {chip}
                                </button>
                            ))}
                        </div>

                        {eventsLoading ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse border border-white/5" />
                                ))}
                                <p className="text-center text-xs text-slate-600 pt-2">AI searching for {autoEventQuery} on {format(selectedDate, "MMM d")}…</p>
                            </div>
                        ) : events.length > 0 ? (
                            <>
                                {hasSuggested && (
                                    <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-3">
                                        <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-semibold text-amber-300">AI suggestions — verify availability</p>
                                            <p className="text-xs text-amber-400/70 mt-0.5">Real-time event search requires a Gemini API key. These are AI-estimated based on typical events in this area.</p>
                                        </div>
                                    </div>
                                )}
                                <div className="space-y-3">
                                    {events.map(ev => (
                                        <EventCard key={ev.id} event={ev} isSelected={selectedIds.has(ev.id)} onToggle={() => toggleSelect(ev)} />
                                    ))}
                                </div>
                                {platformLinks && (
                                    <EventPlatformLinks links={platformLinks} query={autoEventQuery} dateStr={selectedDateStr} />
                                )}
                            </>
                        ) : (
                            <div className="rounded-2xl bg-white/3 border border-white/8 p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                    <Search className="w-4 h-4 text-slate-500" />
                                    <p className="text-sm font-semibold text-slate-300">Search these platforms for events</p>
                                </div>
                                {platformLinks && (
                                    <EventPlatformLinks links={platformLinks} query={autoEventQuery} dateStr={selectedDateStr} />
                                )}
                                <p className="text-xs text-slate-600">
                                    To enable AI-powered event search, add a <span className="text-slate-400 font-mono">GEMINI_API_KEY</span> from{" "}
                                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                                        Google AI Studio
                                    </a>{" "}to your .env file.
                                </p>
                            </div>
                        )}
                    </section>
                )}

                {/* ── PLACES SECTION ───────────────────────────────────────────── */}
                {!searchResults && (
                    <section className="mb-8">
                        <h2 className="text-base font-bold text-white flex items-center gap-2 mb-3">
                            <MapPin className="w-4 h-4 text-primary" />
                            Great Nearby Places
                        </h2>

                        {/* Category chips */}
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none mb-4">
                            {PLACE_CATEGORIES.map(({ id, label, icon: Icon }) => (
                                <button
                                    key={id}
                                    onClick={() => setPlaceCategory(id)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold whitespace-nowrap transition-all",
                                        placeCategory === id
                                            ? "bg-foreground text-background border-foreground"
                                            : "bg-white/5 border-white/8 text-muted-foreground hover:border-white/20 hover:text-foreground"
                                    )}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    {label}
                                </button>
                            ))}
                        </div>

                        {placesLoading ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse border border-white/5" />)}
                            </div>
                        ) : places.length > 0 ? (
                            <div className="space-y-3">
                                {places.slice(0, 12).map(p => (
                                    <PlaceCard key={p.id} place={p} isSelected={selectedIds.has(p.id)} onToggle={() => toggleSelect(p)} />
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-xs text-slate-500 text-center">No places cached yet — tap a category to explore</p>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { emoji: "🍽️", label: "Dinner", category: "restaurant" },
                                        { emoji: "🎭", label: "Events", category: "activity" },
                                        { emoji: "🌿", label: "Outdoors", category: "activity" },
                                    ].map(({ emoji, label, category }) => (
                                        <button
                                            key={label}
                                            onClick={() => {
                                                setPlaceCategory(category);
                                                setSearchQuery(label.toLowerCase());
                                                handleSearch(label.toLowerCase());
                                            }}
                                            className="flex flex-col items-center justify-center gap-2 py-5 rounded-2xl bg-white/5 border border-white/8 hover:bg-white/10 hover:border-white/20 transition-all active:scale-95"
                                        >
                                            <span className="text-2xl">{emoji}</span>
                                            <span className="text-xs font-semibold text-slate-300">{label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>
                )}

                {/* ── PUBLIC PLANS ─────────────────────────────────────────────── */}
                {!searchResults && publicPlans.length > 0 && (
                    <section className="mb-8">
                        <h2 className="text-base font-bold text-white flex items-center gap-2 mb-3">
                            <Users className="w-4 h-4 text-primary" />
                            Public Plans Nearby
                        </h2>
                        <div className="space-y-3">
                            {publicPlans.slice(0, 5).map((h: any) => (
                                <HangoutCard key={h.id} hangout={h} variant="upcoming" />
                            ))}
                        </div>
                    </section>
                )}

            </main>

            {/* ── Selection FAB ────────────────────────────────────────────────── */}
            <AnimatePresence>
                {selectedIds.size > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 80 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 80 }}
                        className="fixed bottom-20 left-0 right-0 z-50 px-4"
                    >
                        <div className="container mx-auto max-w-2xl">
                            <div className="bg-primary rounded-2xl p-4 shadow-2xl shadow-primary/30 flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-primary-foreground font-bold">{selectedIds.size} selected</p>
                                    <p className="text-primary-foreground/70 text-xs">
                                        {selectedIds.size === 1 ? "Start a new plan" : "Create a group vote"}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setShowFriendSelector(true)}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-black/20 rounded-xl text-primary-foreground text-xs font-bold hover:bg-black/30 transition-colors"
                                    >
                                        <UserPlus className="w-4 h-4" />
                                        {selectedFriends.length > 0 ? `${selectedFriends.length} people` : "Add people"}
                                    </button>
                                    <button
                                        onClick={handleCreateHangout}
                                        disabled={isCreating}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-background text-primary font-bold rounded-xl text-sm hover:bg-white/90 transition-colors disabled:opacity-50"
                                    >
                                        {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Zap className="w-4 h-4" /> Plan It</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Friend Selector Sheet ────────────────────────────────────────── */}
            <AnimatePresence>
                {showFriendSelector && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setShowFriendSelector(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
                        />
                        <motion.div
                            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                            className="fixed bottom-0 left-0 right-0 z-[70] bg-slate-950 border-t border-white/10 rounded-t-[28px] p-6 max-h-[85vh] overflow-y-auto"
                        >
                            <div className="max-w-xl mx-auto space-y-5">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-bold text-white">Who's coming?</h2>
                                    <button onClick={() => setShowFriendSelector(false)} className="p-2 rounded-full bg-white/5 text-slate-400 hover:bg-white/10">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <FriendSelector selected={selectedFriends} onSelect={setSelectedFriends} />
                                <div className="space-y-3 pt-3 border-t border-white/5">
                                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">When?</label>
                                    <input
                                        type="datetime-local"
                                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary/50 appearance-none"
                                        value={planDateValue}
                                        onChange={e => setPlanDateValue(e.target.value)}
                                    />
                                </div>
                                <button
                                    onClick={() => { setShowFriendSelector(false); handleCreateHangout(); }}
                                    disabled={isCreating}
                                    className="w-full py-3.5 rounded-xl bg-primary text-black font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Zap className="w-5 h-5" /> Create Plan</>}
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {createdHangoutData && (
                <InviteModal
                    isOpen={showInviteModal}
                    onClose={() => { setShowInviteModal(false); router.push(`/hangouts/${createdHangoutData.slug}`); }}
                    onDone={() => { setShowInviteModal(false); router.push(`/hangouts/${createdHangoutData.slug}`); }}
                    inviteUrl={createdHangoutData.inviteUrl}
                    guests={selectedFriends.filter(f => f.isGuest).map(f => ({ name: f.name, phone: f.phone }))}

                />
            )}
        </div>
    );
}

// ── Reusable cards ────────────────────────────────────────────────────────────

function EventCard({ event, isSelected, onToggle }: { event: DiscoverEvent; isSelected: boolean; onToggle: () => void }) {
    const href = event.ticketUrl || event.eventUrl || `https://www.google.com/search?q=${encodeURIComponent(event.name)}`;
    return (
        <div className={cn(
            "relative rounded-2xl border bg-card/40 overflow-hidden transition-all",
            isSelected ? "border-primary shadow-lg shadow-primary/10 ring-1 ring-primary/20" : "border-white/6 hover:border-white/15"
        )}>
            <a href={href} target="_blank" rel="noopener noreferrer" className="flex gap-3 p-4 cursor-pointer hover:bg-white/3 transition-colors">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/20 flex items-center justify-center shrink-0">
                    <Ticket className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                        <h3 className="font-bold text-white text-sm leading-tight line-clamp-1">{event.name}</h3>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                    </div>
                    <p className="text-xs text-primary font-medium flex items-center gap-1 mb-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{event.venue || event.address}</span>
                    </p>
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
                                {event.performers.slice(0, 2).join(", ")}
                            </span>
                        )}
                    </div>
                </div>
            </a>
            <button
                onClick={(e) => { e.stopPropagation(); onToggle(); }}
                className={cn(
                    "absolute top-3 right-3 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all",
                    isSelected ? "bg-primary border-primary text-black" : "bg-transparent border-white/20 text-transparent hover:border-primary/50"
                )}
            >
                <Check className="w-3.5 h-3.5 stroke-[3px]" />
            </button>
        </div>
    );
}

function EventPlatformLinks({ links, query, dateStr }: { links: PlatformLinks; query: string; dateStr: string }) {
    const platforms = [
        { key: "eventbrite", label: "Eventbrite", color: "text-orange-400 border-orange-500/20 bg-orange-500/10" },
        { key: "google", label: "Google", color: "text-blue-400 border-blue-500/20 bg-blue-500/10" },
        { key: "ticketmaster", label: "Ticketmaster", color: "text-sky-400 border-sky-500/20 bg-sky-500/10" },
        { key: "facebook", label: "Facebook", color: "text-indigo-400 border-indigo-500/20 bg-indigo-500/10" },
    ] as const;
    return (
        <div className="flex flex-wrap gap-2 pt-1">
            {platforms.map(({ key, label, color }) => (
                <a
                    key={key}
                    href={(links as any)[key]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                        "flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all hover:opacity-80",
                        color
                    )}
                >
                    <ExternalLink className="w-3 h-3" />
                    {label}
                </a>
            ))}
        </div>
    );
}

function SocialProofBadge({ placeId }: { placeId: string }) {
    const { data } = useSWR(`/api/venues/${placeId}/social-proof`, fetcher, {
        revalidateOnFocus: false,
        dedupingInterval: 120000,
        shouldRetryOnError: false,
    });
    if (!data || data.friendCount === 0) return null;
    return (
        <div className="flex items-center gap-1.5 mt-1.5">
            {/* Mini avatar stack */}
            <div className="flex -space-x-1.5">
                {(data.friendPreviews ?? []).slice(0, 3).map((f: any, i: number) => (
                    <div key={i} className="w-4 h-4 rounded-full ring-1 ring-black bg-slate-700 overflow-hidden shrink-0">
                        {f.avatarUrl
                            ? <img src={f.avatarUrl} alt="" className="w-full h-full object-cover" />
                            : <div className="w-full h-full bg-primary/30 flex items-center justify-center text-[6px] font-bold text-primary">{(f.displayName ?? "?").charAt(0)}</div>
                        }
                    </div>
                ))}
            </div>
            <span className="text-[10px] font-semibold text-primary/70">
                {data.friendCount === 1 ? "1 friend been here" : `${data.friendCount} friends been here`}
                {data.avgRating ? ` · ${data.avgRating.toFixed(1)}★` : ""}
            </span>
        </div>
    );
}

function PlaceCard({ place, isSelected, onToggle }: { place: Activity; isSelected: boolean; onToggle: () => void }) {
    const href = `https://www.google.com/search?q=${encodeURIComponent((place.name || "") + " " + (place.address || place.city || ""))}`;
    return (
        <div className={cn(
            "relative rounded-2xl border bg-card/40 overflow-hidden transition-all",
            isSelected ? "border-primary shadow-lg shadow-primary/10 ring-1 ring-primary/20" : "border-white/6 hover:border-white/15"
        )}>
            <a href={href} target="_blank" rel="noopener noreferrer" className="flex gap-3 p-4 cursor-pointer hover:bg-white/3 transition-colors">
                {place.imageUrl ? (
                    <img src={place.imageUrl} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0 border border-white/8" />
                ) : (
                    <div className="w-16 h-16 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 border border-white/8">
                        <MapPin className="w-6 h-6 text-slate-600" />
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                        <h3 className="font-bold text-white text-sm leading-tight line-clamp-1">{place.name}</h3>
                        {place.rating && (
                            <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-400 shrink-0">
                                <Star className="w-2.5 h-2.5 fill-current" />
                                {place.rating}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-500 capitalize mb-1">{place.category}{place.subcategory ? ` · ${place.subcategory}` : ""}</p>
                    {place.address && (
                        <p className="text-[11px] text-slate-600 truncate">{place.address}</p>
                    )}
                    <SocialProofBadge placeId={place.id} />
                </div>
            </a>
            <button
                onClick={(e) => { e.stopPropagation(); onToggle(); }}
                className={cn(
                    "absolute top-3 right-3 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all",
                    isSelected ? "bg-primary border-primary text-black" : "bg-transparent border-white/20 text-transparent hover:border-primary/50"
                )}
            >
                <Check className="w-3.5 h-3.5 stroke-[3px]" />
            </button>
        </div>
    );
}
