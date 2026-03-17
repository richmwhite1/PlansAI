"use client";

import { useState, useRef } from "react";
import dynamic from "next/dynamic";
import useSWR from "swr";
import { toast } from "sonner";
import { MapPin, Navigation, Search, Star, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { haversineDistance } from "@/lib/geo";

const MidpointMap = dynamic(() => import("@/components/hangout/midpoint-map"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-[300px] md:h-[400px] bg-zinc-800 rounded-2xl animate-pulse" />
    ),
});

interface Pin {
    lat: number;
    lng: number;
    name: string;
    avatarUrl?: string | null;
}

interface MidpointData {
    midpoint: { lat: number; lng: number } | null;
    pins: Pin[];
    suggestions: {
        id: string;
        name: string;
        category: string;
        rating: number | null;
        address: string | null;
        imageUrl: string | null;
        latitude: number;
        longitude: number;
    }[];
}

interface MidpointPanelProps {
    hangoutId: string;
    currentUserParticipantId?: string;
    isGuest?: boolean;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function MidpointPanel({ hangoutId, currentUserParticipantId, isGuest }: MidpointPanelProps) {
    const { data, error, isLoading, mutate } = useSWR<MidpointData>(
        `/api/hangouts/${hangoutId}/midpoint`,
        fetcher,
        { refreshInterval: 30_000 }
    );

    const [isDropping, setIsDropping] = useState(false);
    const [addressInput, setAddressInput] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [addingOptionId, setAddingOptionId] = useState<string | null>(null);
    const addressInputRef = useRef<HTMLInputElement>(null);

    const handleUseCurrentLocation = () => {
        if (!navigator.geolocation) {
            toast.error("Geolocation is not supported by your browser.");
            return;
        }
        setIsSubmitting(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                await dropLocation(position.coords.latitude, position.coords.longitude);
            },
            (err) => {
                setIsSubmitting(false);
                toast.error("Could not get your location. Please try entering an address.");
                console.error("Geolocation error:", err);
            },
            { timeout: 10_000 }
        );
    };

    const handleAddressSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!addressInput.trim()) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(
                `/api/location/details?address=${encodeURIComponent(addressInput.trim())}`
            );
            if (!res.ok) {
                const fallbackRes = await fetch(
                    `/api/location/autocomplete?input=${encodeURIComponent(addressInput.trim())}`
                );
                if (!fallbackRes.ok) throw new Error("Could not geocode address");
                const fallbackData = await fallbackRes.json();
                const first = fallbackData?.predictions?.[0];
                if (!first) throw new Error("No results found for that address");
                // Use place_id to get details
                const detailsRes = await fetch(
                    `/api/location/details?placeId=${encodeURIComponent(first.place_id)}`
                );
                if (!detailsRes.ok) throw new Error("Could not fetch location details");
                const detailsData = await detailsRes.json();
                const { lat, lng } = detailsData?.geometry?.location ?? {};
                if (!lat || !lng) throw new Error("Could not resolve location coordinates");
                await dropLocation(lat, lng);
            } else {
                const detailsData = await res.json();
                const { lat, lng } = detailsData?.geometry?.location ?? {};
                if (!lat || !lng) throw new Error("Could not resolve location coordinates");
                await dropLocation(lat, lng);
            }
        } catch (err: unknown) {
            setIsSubmitting(false);
            const message = err instanceof Error ? err.message : "Could not resolve address";
            toast.error(message);
        }
    };

    const dropLocation = async (latitude: number, longitude: number) => {
        try {
            const res = await fetch(`/api/hangouts/${hangoutId}/midpoint`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ latitude, longitude }),
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Failed to drop pin");
            }
            const updated = await res.json();
            mutate(updated, false);
            setIsDropping(false);
            setAddressInput("");
            toast.success("Your location has been pinned!");
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to drop location";
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddToplan = async (cachedEventId: string) => {
        setAddingOptionId(cachedEventId);
        try {
            const res = await fetch(`/api/hangouts/${hangoutId}/options`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cachedEventId }),
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Failed to add option");
            }
            toast.success("Added to the plan options!");
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to add option";
            toast.error(message);
        } finally {
            setAddingOptionId(null);
        }
    };

    const totalParticipants = data?.pins
        ? // We don't have total count here — show shared count only
          data.pins.length
        : 0;

    // Loading skeleton
    if (isLoading) {
        return (
            <div className="space-y-4 p-1">
                <div className="h-8 w-2/3 bg-zinc-800 rounded-lg animate-pulse" />
                <div className="h-4 w-1/2 bg-zinc-800 rounded animate-pulse" />
                <div className="w-full h-[300px] md:h-[400px] bg-zinc-800 rounded-2xl animate-pulse" />
                <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-28 bg-zinc-800 rounded-xl animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 text-center text-slate-400">
                <p className="text-sm">Failed to load midpoint data.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="space-y-1">
                <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary shrink-0" />
                    Find the perfect meetup spot
                </h2>
                <p className="text-sm text-slate-400">
                    Everyone drops their location, we find the middle
                </p>
                {totalParticipants > 0 && (
                    <p className="text-xs font-medium text-slate-500 mt-1">
                        {totalParticipants} location{totalParticipants !== 1 ? "s" : ""} shared
                    </p>
                )}
            </div>

            {/* Map */}
            <MidpointMap
                pins={data?.pins ?? []}
                midpoint={data?.midpoint ?? null}
                className="w-full h-[300px] md:h-[400px]"
            />

            {/* Drop location CTA */}
            {!isDropping ? (
                <button
                    onClick={() => setIsDropping(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary font-semibold rounded-2xl transition-all text-sm"
                >
                    <Navigation className="w-4 h-4" />
                    Drop your location
                </button>
            ) : (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
                    <p className="text-sm font-semibold text-slate-200">Choose how to share your location:</p>

                    {/* Use current location */}
                    <button
                        onClick={handleUseCurrentLocation}
                        disabled={isSubmitting}
                        className="w-full flex items-center gap-3 py-3 px-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl transition-all text-sm font-medium text-slate-200 disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        ) : (
                            <Navigation className="w-4 h-4 text-primary" />
                        )}
                        Use my current location
                    </button>

                    {/* Enter address */}
                    <form onSubmit={handleAddressSubmit} className="space-y-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                            <input
                                ref={addressInputRef}
                                type="text"
                                value={addressInput}
                                onChange={(e) => setAddressInput(e.target.value)}
                                placeholder="Enter an address or neighborhood..."
                                className="w-full pl-10 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                                disabled={isSubmitting}
                                autoFocus
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => { setIsDropping(false); setAddressInput(""); }}
                                className="flex-1 py-2.5 text-xs font-bold text-slate-400 hover:text-slate-200 uppercase tracking-wider transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || !addressInput.trim()}
                                className="flex-1 py-2.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40"
                            >
                                {isSubmitting ? "Searching..." : "Pin Location"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Nearby suggestions */}
            <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                    Near the midpoint
                </h3>

                {!data?.midpoint || data.suggestions.length === 0 ? (
                    <div className="py-8 text-center bg-zinc-900/50 rounded-2xl border border-dashed border-zinc-800">
                        <MapPin className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <p className="text-sm text-slate-500 italic">
                            Share your location to see suggestions near everyone
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {data.suggestions.map((venue) => {
                            const distance =
                                data.midpoint
                                    ? haversineDistance(
                                          { lat: data.midpoint.lat, lng: data.midpoint.lng },
                                          { lat: venue.latitude, lng: venue.longitude }
                                      )
                                    : null;

                            return (
                                <div
                                    key={venue.id}
                                    className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-600 transition-all"
                                >
                                    {venue.imageUrl && (
                                        <div className="h-20 overflow-hidden">
                                            <img
                                                src={venue.imageUrl}
                                                alt={venue.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    )}
                                    <div className="p-3 space-y-1.5">
                                        <p className="text-sm font-semibold text-slate-200 leading-tight line-clamp-1">
                                            {venue.name}
                                        </p>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-[10px] bg-zinc-800 text-slate-400 px-1.5 py-0.5 rounded border border-zinc-700">
                                                {venue.category}
                                            </span>
                                            {venue.rating && (
                                                <span className="text-[10px] text-amber-400 flex items-center gap-0.5">
                                                    <Star className="w-2.5 h-2.5 fill-amber-400" />
                                                    {venue.rating.toFixed(1)}
                                                </span>
                                            )}
                                            {distance !== null && (
                                                <span className="text-[10px] text-slate-500">
                                                    {distance.toFixed(1)} mi
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleAddToplan(venue.id)}
                                            disabled={addingOptionId === venue.id}
                                            className={cn(
                                                "w-full mt-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all",
                                                "bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 disabled:opacity-40"
                                            )}
                                        >
                                            {addingOptionId === venue.id ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : (
                                                <Plus className="w-3 h-3" />
                                            )}
                                            Add to Plan
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
