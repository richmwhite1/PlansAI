"use client";

import { useState, useEffect } from "react";
import {
    Calendar, MapPin, Bed, Plus, Trash2, Clock, ChevronLeft, ChevronRight,
    Zap, Loader2, Edit3, Check, X, Star, CircleDot
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface Activity {
    id: string;
    title: string;
    description: string | null;
    startTime: string | null;
    duration: number | null;
    location: string | null;
    isRequired: boolean;
    displayOrder: number;
}

interface ItineraryDay {
    id: string;
    dayNumber: number;
    date: string;
    title: string | null;
    location: string | null;
    accommodations: string | null;
    notes: string | null;
    activities: Activity[];
}

interface ItineraryDashboardProps {
    hangoutId: string;
    initialDays: ItineraryDay[];
    isOrganizer: boolean;
}

export function ItineraryDashboard({ hangoutId, initialDays, isOrganizer }: ItineraryDashboardProps) {
    const [days, setDays] = useState<ItineraryDay[]>(initialDays || []);
    const [selectedDayIndex, setSelectedDayIndex] = useState(0);
    const [isLoadingAI, setIsLoadingAI] = useState(false);
    const [showAddActivity, setShowAddActivity] = useState(false);
    const [editingDay, setEditingDay] = useState(false);
    const [newActivity, setNewActivity] = useState({ title: "", startTime: "", duration: "", description: "", location: "", isRequired: true });
    const [dayEdits, setDayEdits] = useState({ title: "", location: "", accommodations: "", notes: "" });

    const selectedDay = days[selectedDayIndex];

    const fetchItinerary = async () => {
        try {
            const res = await fetch(`/api/hangouts/${hangoutId}/itinerary`);
            if (res.ok) {
                const data = await res.json();
                setDays(data.days);
            }
        } catch (err) {
            console.error("Failed to fetch itinerary:", err);
        }
    };

    const handleAISuggest = async () => {
        setIsLoadingAI(true);
        try {
            const res = await fetch(`/api/hangouts/${hangoutId}/ai-itinerary`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            });

            if (res.ok) {
                const data = await res.json();
                setDays(data.days);
                toast.success(`AI generated activities for ${data.daysUpdated} days!`);
            } else {
                const err = await res.json();
                toast.error(err.error || "AI generation failed");
            }
        } catch (err) {
            toast.error("Failed to generate itinerary");
        } finally {
            setIsLoadingAI(false);
        }
    };

    const handleAISuggestDay = async (dayId: string) => {
        setIsLoadingAI(true);
        try {
            const res = await fetch(`/api/hangouts/${hangoutId}/ai-itinerary`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ dayId }),
            });

            if (res.ok) {
                const data = await res.json();
                setDays(data.days);
                toast.success("AI suggestions added!");
            } else {
                const err = await res.json();
                toast.error(err.error || "AI generation failed");
            }
        } catch (err) {
            toast.error("Failed to generate suggestions");
        } finally {
            setIsLoadingAI(false);
        }
    };

    const handleAddActivity = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newActivity.title.trim() || !selectedDay) return;

        try {
            const res = await fetch(`/api/hangouts/${hangoutId}/activities`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    dayId: selectedDay.id,
                    title: newActivity.title,
                    startTime: newActivity.startTime || null,
                    duration: newActivity.duration ? parseInt(newActivity.duration) : null,
                    description: newActivity.description || null,
                    location: newActivity.location || null,
                    isRequired: newActivity.isRequired,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setDays(prev => prev.map(d =>
                    d.id === selectedDay.id
                        ? { ...d, activities: [...d.activities, data.activity] }
                        : d
                ));
                setNewActivity({ title: "", startTime: "", duration: "", description: "", location: "", isRequired: true });
                setShowAddActivity(false);
                toast.success("Activity added!");
            }
        } catch (err) {
            toast.error("Failed to add activity");
        }
    };

    const handleDeleteActivity = async (activityId: string) => {
        try {
            const res = await fetch(`/api/hangouts/${hangoutId}/activities?activityId=${activityId}`, {
                method: "DELETE",
            });

            if (res.ok) {
                setDays(prev => prev.map(d => ({
                    ...d,
                    activities: d.activities.filter(a => a.id !== activityId),
                })));
                toast.success("Activity removed");
            }
        } catch (err) {
            toast.error("Failed to delete activity");
        }
    };

    const startEditDay = () => {
        if (!selectedDay) return;
        setDayEdits({
            title: selectedDay.title || "",
            location: selectedDay.location || "",
            accommodations: selectedDay.accommodations || "",
            notes: selectedDay.notes || "",
        });
        setEditingDay(true);
    };

    const handleSaveDay = async () => {
        if (!selectedDay) return;
        try {
            const res = await fetch(`/api/hangouts/${hangoutId}/itinerary`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    dayId: selectedDay.id,
                    ...dayEdits,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setDays(prev => prev.map(d => d.id === selectedDay.id ? { ...d, ...data.day } : d));
                setEditingDay(false);
                toast.success("Day updated!");
            }
        } catch (err) {
            toast.error("Failed to update day");
        }
    };

    if (days.length === 0) {
        return (
            <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
                <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm italic">No itinerary days yet.</p>
            </div>
        );
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    };

    const formatDuration = (mins: number) => {
        if (mins < 60) return `${mins}m`;
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return m > 0 ? `${h}h ${m}m` : `${h}h`;
    };

    return (
        <div className="space-y-6">
            {/* AI Suggest Button — for all empty days */}
            {isOrganizer && days.some(d => d.activities.length === 0) && (
                <motion.button
                    onClick={handleAISuggest}
                    disabled={isLoadingAI}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-primary/20 to-amber-500/20 border border-primary/30 text-primary font-semibold text-sm hover:border-primary/50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                >
                    {isLoadingAI ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Generating Itinerary...</>
                    ) : (
                        <><Zap className="w-4 h-4" /> AI Suggest Ideas for All Days</>
                    )}
                </motion.button>
            )}

            {/* Day Navigator */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setSelectedDayIndex(Math.max(0, selectedDayIndex - 1))}
                    disabled={selectedDayIndex === 0}
                    className="p-2 rounded-lg bg-white/5 border border-white/10 disabled:opacity-30 hover:bg-white/10 transition-all"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex-1 overflow-x-auto hide-scrollbar">
                    <div className="flex gap-2 min-w-min">
                        {days.map((day, i) => (
                            <button
                                key={day.id}
                                onClick={() => setSelectedDayIndex(i)}
                                className={cn(
                                    "px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all border shrink-0",
                                    i === selectedDayIndex
                                        ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                                        : day.activities.length > 0
                                            ? "bg-white/10 border-white/10 text-white/80 hover:bg-white/15"
                                            : "bg-white/5 border-white/5 text-white/50 hover:bg-white/10"
                                )}
                            >
                                Day {day.dayNumber}
                                {day.activities.length > 0 && (
                                    <span className="ml-1 text-[9px] opacity-70">({day.activities.length})</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    onClick={() => setSelectedDayIndex(Math.min(days.length - 1, selectedDayIndex + 1))}
                    disabled={selectedDayIndex === days.length - 1}
                    className="p-2 rounded-lg bg-white/5 border border-white/10 disabled:opacity-30 hover:bg-white/10 transition-all"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* Selected Day Detail */}
            {selectedDay && (
                <AnimatePresence mode="wait">
                    <motion.div
                        key={selectedDay.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-4"
                    >
                        {/* Day Header */}
                        <div className="bg-slate-900/60 rounded-xl p-4 border border-white/5 space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-white">
                                        Day {selectedDay.dayNumber}: {selectedDay.title || formatDate(selectedDay.date)}
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-0.5">{formatDate(selectedDay.date)}</p>
                                </div>
                                {isOrganizer && !editingDay && (
                                    <button
                                        onClick={startEditDay}
                                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all text-slate-400 hover:text-white"
                                    >
                                        <Edit3 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {editingDay ? (
                                <div className="space-y-3">
                                    <input
                                        type="text"
                                        placeholder="Day title (e.g. Santiago → Valparaiso)"
                                        value={dayEdits.title}
                                        onChange={(e) => setDayEdits(prev => ({ ...prev, title: e.target.value }))}
                                        className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="text"
                                            placeholder="Location"
                                            value={dayEdits.location}
                                            onChange={(e) => setDayEdits(prev => ({ ...prev, location: e.target.value }))}
                                            className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Accommodations"
                                            value={dayEdits.accommodations}
                                            onChange={(e) => setDayEdits(prev => ({ ...prev, accommodations: e.target.value }))}
                                            className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                                        />
                                    </div>
                                    <textarea
                                        placeholder="Notes for this day..."
                                        value={dayEdits.notes}
                                        onChange={(e) => setDayEdits(prev => ({ ...prev, notes: e.target.value }))}
                                        className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 resize-none h-16"
                                    />
                                    <div className="flex gap-2">
                                        <button onClick={handleSaveDay} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold flex items-center gap-1.5">
                                            <Check className="w-3.5 h-3.5" /> Save
                                        </button>
                                        <button onClick={() => setEditingDay(false)} className="px-4 py-2 bg-white/10 text-white rounded-lg text-sm font-medium flex items-center gap-1.5">
                                            <X className="w-3.5 h-3.5" /> Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-3 text-xs">
                                    {selectedDay.location && (
                                        <span className="flex items-center gap-1.5 text-slate-300 bg-white/5 px-2.5 py-1 rounded-full">
                                            <MapPin className="w-3 h-3 text-primary" /> {selectedDay.location}
                                        </span>
                                    )}
                                    {selectedDay.accommodations && (
                                        <span className="flex items-center gap-1.5 text-slate-300 bg-white/5 px-2.5 py-1 rounded-full">
                                            <Bed className="w-3 h-3 text-blue-400" /> {selectedDay.accommodations}
                                        </span>
                                    )}
                                </div>
                            )}

                            {selectedDay.notes && !editingDay && (
                                <p className="text-xs text-slate-400 italic">{selectedDay.notes}</p>
                            )}
                        </div>

                        {/* Activities Timeline */}
                        <div className="space-y-2">
                            {selectedDay.activities.length > 0 ? (
                                selectedDay.activities.map((activity) => (
                                    <motion.div
                                        key={activity.id}
                                        layout
                                        className="group flex items-start gap-3 bg-slate-900/40 rounded-xl p-3 border border-white/5 hover:border-white/10 transition-all"
                                    >
                                        {/* Timeline dot */}
                                        <div className="mt-1 shrink-0">
                                            {activity.isRequired ? (
                                                <Star className="w-4 h-4 text-primary" />
                                            ) : (
                                                <CircleDot className="w-4 h-4 text-slate-500" />
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-sm font-semibold text-white truncate">{activity.title}</h4>
                                                {!activity.isRequired && (
                                                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 bg-white/5 px-1.5 py-0.5 rounded shrink-0">
                                                        Optional
                                                    </span>
                                                )}
                                            </div>
                                            {activity.description && (
                                                <p className="text-xs text-slate-400 mt-0.5">{activity.description}</p>
                                            )}
                                            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-500">
                                                {activity.startTime && (
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" /> {activity.startTime}
                                                    </span>
                                                )}
                                                {activity.duration && (
                                                    <span>{formatDuration(activity.duration)}</span>
                                                )}
                                                {activity.location && (
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="w-3 h-3" /> {activity.location}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Delete */}
                                        {isOrganizer && (
                                            <button
                                                onClick={() => handleDeleteActivity(activity.id)}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all shrink-0"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </motion.div>
                                ))
                            ) : (
                                <div className="text-center py-8 bg-white/5 rounded-xl border border-dashed border-white/10">
                                    <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                                    <p className="text-muted-foreground text-xs italic">No activities planned for this day.</p>
                                    {isOrganizer && (
                                        <button
                                            onClick={() => handleAISuggestDay(selectedDay.id)}
                                            disabled={isLoadingAI}
                                            className="mt-3 px-4 py-2 text-xs font-semibold text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-all flex items-center gap-1.5 mx-auto disabled:opacity-50"
                                        >
                                            {isLoadingAI ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <Zap className="w-3.5 h-3.5" />
                                            )}
                                            AI Suggest Activities
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Add Activity */}
                        {isOrganizer && (
                            <>
                                {showAddActivity ? (
                                    <motion.form
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        onSubmit={handleAddActivity}
                                        className="bg-slate-900/60 rounded-xl p-4 border border-white/10 space-y-3"
                                    >
                                        <h4 className="text-sm font-bold text-white">Add Activity</h4>
                                        <input
                                            type="text"
                                            placeholder="Activity title *"
                                            value={newActivity.title}
                                            onChange={(e) => setNewActivity(prev => ({ ...prev, title: e.target.value }))}
                                            className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                                            autoFocus
                                        />
                                        <div className="grid grid-cols-2 gap-2">
                                            <input
                                                type="time"
                                                value={newActivity.startTime}
                                                onChange={(e) => setNewActivity(prev => ({ ...prev, startTime: e.target.value }))}
                                                className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                                            />
                                            <input
                                                type="number"
                                                placeholder="Duration (mins)"
                                                value={newActivity.duration}
                                                onChange={(e) => setNewActivity(prev => ({ ...prev, duration: e.target.value }))}
                                                className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                                            />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Location (optional)"
                                            value={newActivity.location}
                                            onChange={(e) => setNewActivity(prev => ({ ...prev, location: e.target.value }))}
                                            className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                                        />
                                        <textarea
                                            placeholder="Description (optional)"
                                            value={newActivity.description}
                                            onChange={(e) => setNewActivity(prev => ({ ...prev, description: e.target.value }))}
                                            className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 resize-none h-14"
                                        />
                                        <div className="flex items-center justify-between">
                                            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={newActivity.isRequired}
                                                    onChange={(e) => setNewActivity(prev => ({ ...prev, isRequired: e.target.checked }))}
                                                    className="rounded border-white/20"
                                                />
                                                Required activity
                                            </label>
                                            <div className="flex gap-2">
                                                <button type="button" onClick={() => setShowAddActivity(false)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-all">
                                                    Cancel
                                                </button>
                                                <button type="submit" className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold">
                                                    Add
                                                </button>
                                            </div>
                                        </div>
                                    </motion.form>
                                ) : (
                                    <button
                                        onClick={() => setShowAddActivity(true)}
                                        className="w-full py-2.5 rounded-xl border border-dashed border-white/10 text-slate-400 text-sm font-medium hover:border-white/20 hover:text-white transition-all flex items-center justify-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" /> Add Activity
                                    </button>
                                )}
                            </>
                        )}
                    </motion.div>
                </AnimatePresence>
            )}
        </div>
    );
}
