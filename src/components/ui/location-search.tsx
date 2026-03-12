"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Search, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface LocationData {
    zip: string;
    city: string;
    state: string;
    lat: number;
    lng: number;
}

interface LocationSearchProps {
    onSelect: (location: LocationData) => void;
    initialValue?: string;
    placeholder?: string;
    className?: string;
}

export function LocationSearch({ onSelect, initialValue = "", placeholder = "Enter City or Zip...", className }: LocationSearchProps) {
    const [inputValue, setInputValue] = useState(initialValue);
    const [predictions, setPredictions] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const debounceTimer = useRef<NodeJS.Timeout>(null);

    // Handle Click Outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchAutocomplete = async (query: string) => {
        if (!query.trim() || query.length < 3) {
            setPredictions([]);
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch(`/api/location/autocomplete?q=${encodeURIComponent(query)}`);
            const data = await res.json();
            if (data.predictions) {
                setPredictions(data.predictions);
                setIsOpen(data.predictions.length > 0);
            }
        } catch (err) {
            console.error("Autocomplete fetch failed", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setInputValue(value);

        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        // If it looks like a Zip (5 digits), don't show city autocomplete immediately
        if (/^\d{5}$/.test(value.trim())) {
            setPredictions([]);
            setIsOpen(false);
            return;
        }

        debounceTimer.current = setTimeout(() => {
            fetchAutocomplete(value);
        }, 300);
    };

    const resolveZip = async (zip: string) => {
        setIsLoading(true);
        try {
            const res = await fetch(`https://api.zippopotam.us/us/${zip}`);
            const data = await res.json();
            if (data.places && data.places.length > 0) {
                const place = data.places[0];
                const location = {
                    zip,
                    city: place["place name"],
                    state: place["state abbreviation"],
                    lat: parseFloat(place["latitude"]),
                    lng: parseFloat(place["longitude"])
                };
                onSelect(location);
                setInputValue(`${location.city}, ${location.state}`);
                setIsOpen(false);
            } else {
                toast.error("Invalid zip code");
            }
        } catch (err) {
            toast.error("Failed to resolve zip code");
        } finally {
            setIsLoading(false);
        }
    };

    const resolvePlace = async (placeId: string) => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/location/details?placeId=${placeId}`);
            const data = await res.json();
            if (data.lat) {
                onSelect(data);
                setInputValue(`${data.city}, ${data.state}`);
                setIsOpen(false);
            }
        } catch (err) {
            toast.error("Failed to get location details");
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            setSelectedIndex(prev => Math.min(prev + 1, predictions.length - 1));
        } else if (e.key === "ArrowUp") {
            setSelectedIndex(prev => Math.max(prev - 1, -1));
        } else if (e.key === "Enter") {
            if (selectedIndex >= 0) {
                resolvePlace(predictions[selectedIndex].placeId);
            } else if (/^\d{5}$/.test(inputValue.trim())) {
                resolveZip(inputValue.trim());
            }
        } else if (e.key === "Escape") {
            setIsOpen(false);
        }
    };

    return (
        <div ref={containerRef} className={cn("relative w-full", className)}>
            <div className="relative flex items-center group">
                <MapPin className="absolute left-3 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                <input
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => predictions.length > 0 && setIsOpen(true)}
                    placeholder={placeholder}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                />
                <div className="absolute right-3">
                    {isLoading ? (
                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    ) : inputValue ? (
                        <button onClick={() => { setInputValue(""); setPredictions([]); setIsOpen(false); }}>
                            <X className="w-4 h-4 text-slate-500 hover:text-white transition-colors" />
                        </button>
                    ) : (
                        <Search className="w-4 h-4 text-slate-600" />
                    )}
                </div>
            </div>

            <AnimatePresence>
                {isOpen && predictions.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="absolute z-[100] top-full mt-2 w-full bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl"
                    >
                        <ul className="max-h-60 overflow-y-auto p-1 py-2">
                            {predictions.map((p, i) => (
                                <li
                                    key={p.placeId}
                                    onClick={() => resolvePlace(p.placeId)}
                                    className={cn(
                                        "px-4 py-2 text-sm cursor-pointer rounded-lg flex flex-col gap-0.5 transition-colors",
                                        i === selectedIndex ? "bg-primary text-black" : "text-slate-300 hover:bg-white/5"
                                    )}
                                >
                                    <span className="font-bold">{p.mainText}</span>
                                    <span className={cn("text-[10px] uppercase tracking-wider opacity-70", i === selectedIndex ? "text-black/80" : "text-slate-500")}>
                                        {p.secondaryText}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
