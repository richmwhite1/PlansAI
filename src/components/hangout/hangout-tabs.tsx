"use client";

import { useState } from "react";
import { Calendar, Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { HangoutCard } from "./hangout-card";

interface HangoutTabsProps {
    pending: any[];
    upcoming: any[];
    past: any[];
}

export function HangoutTabs({ pending, upcoming, past }: HangoutTabsProps) {
    const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

    return (
        <div className="space-y-8">
            {/* Tabs Toggle */}
            <div className="flex p-1 bg-white/5 rounded-xl border border-white/5 w-fit mx-auto">
                <button
                    onClick={() => setActiveTab("upcoming")}
                    className={cn(
                        "px-6 py-2 rounded-lg text-sm font-medium transition-all",
                        activeTab === "upcoming"
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    Upcoming
                </button>
                <button
                    onClick={() => setActiveTab("past")}
                    className={cn(
                        "px-6 py-2 rounded-lg text-sm font-medium transition-all",
                        activeTab === "past"
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    Past
                </button>
            </div>

            {activeTab === "upcoming" ? (
                <div className="space-y-8">
                    {/* Pending Section */}
                    {pending.length > 0 && (
                        <section>
                            <h2 className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Needs Attention ({pending.length})
                            </h2>
                            <div className="space-y-3">
                                {pending.map(hangout => (
                                    <HangoutCard key={hangout.id} hangout={hangout} variant="pending" />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Upcoming Section */}
                    <section>
                        <h2 className="text-xs font-bold text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Upcoming ({upcoming.length})
                        </h2>
                        {upcoming.length > 0 ? (
                            <div className="space-y-3">
                                {upcoming.map(hangout => (
                                    <HangoutCard key={hangout.id} hangout={hangout} variant="upcoming" />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
                                <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                                <p className="text-muted-foreground text-sm italic">No upcoming plans yet.</p>
                            </div>
                        )}
                    </section>
                </div>
            ) : (
                <section>
                    <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        Past Hangouts ({past.length})
                    </h2>
                    {past.length > 0 ? (
                        <div className="space-y-3">
                            {past.map(hangout => (
                                <HangoutCard key={hangout.id} hangout={hangout} variant="past" />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
                            <Check className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                            <p className="text-muted-foreground text-sm italic">No past hangouts found.</p>
                        </div>
                    )}
                </section>
            )}
        </div>
    );
}
