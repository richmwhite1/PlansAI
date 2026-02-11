"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Download, ExternalLink, ArrowRight } from "lucide-react";
import { CalendarIcon } from "@/components/ui/calendar-icon";
import { cn } from "@/lib/utils";

interface AddToCalendarProps {
    title: string;
    description?: string;
    location?: string;
    startTime: Date;
    endTime?: Date;
    compact?: boolean;
}

export function AddToCalendar({
    title,
    description,
    location,
    startTime,
    endTime,
    compact = false
}: AddToCalendarProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Default duration 2 hours if no end time
    const finalEndTime = endTime || new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

    const googleUrl = (() => {
        const start = format(startTime, "yyyyMMdd'T'HHmmss");
        const end = format(finalEndTime, "yyyyMMdd'T'HHmmss");
        const details = encodeURIComponent(description || "");
        const loc = encodeURIComponent(location || "");
        const text = encodeURIComponent(title);

        return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}&location=${loc}`;
    })();

    const handleDownloadIcs = () => {
        const start = format(startTime, "yyyyMMdd'T'HHmmss");
        const end = format(finalEndTime, "yyyyMMdd'T'HHmmss");
        const now = format(new Date(), "yyyyMMdd'T'HHmmss");

        const content = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//Plans AI//Hangouts//EN",
            "BEGIN:VEVENT",
            `UID:${crypto.randomUUID()}`,
            `DTSTAMP:${now}`,
            `DTSTART:${start}`,
            `DTEND:${end}`,
            `SUMMARY:${title}`,
            `DESCRIPTION:${description || ""}`,
            `LOCATION:${location || ""}`,
            "END:VEVENT",
            "END:VCALENDAR"
        ].join("\r\n");

        const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `${title.replace(/\s+/g, "_")}.ics`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (compact) {
        return (
            <div className="flex flex-col gap-3">
                <a
                    href={googleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-white/5 hover:border-violet-500/30 transition-all group w-full"
                >
                    <CalendarIcon date={startTime} />
                    <div className="flex-1 text-left">
                        <div className="text-sm font-semibold text-slate-200 group-hover:text-violet-200 transition-colors">Add to Google Calendar</div>
                        <div className="text-xs text-slate-500">Opens in browser</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-violet-400 transition-colors" />
                </a>

                <button
                    onClick={handleDownloadIcs}
                    className="flex items-center gap-4 p-3 rounded-2xl bg-slate-800/40 hover:bg-slate-800/60 border border-white/5 hover:border-white/10 transition-all group w-full text-left"
                >
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-slate-700/50 flex items-center justify-center shrink-0 border border-white/5">
                        <Download className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="flex-1">
                        <div className="text-sm font-semibold text-slate-300 group-hover:text-slate-200 transition-colors">Download .ics File</div>
                        <div className="text-xs text-slate-500">For Apple & Outlook</div>
                    </div>
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            <a
                href={googleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-violet-600/10 border border-violet-500/20 hover:bg-violet-600/20 hover:border-violet-500/40 transition-all group"
            >
                <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
                    <CalendarIcon date={startTime} className="w-8 h-8" />
                </div>
                <div className="text-left">
                    <div className="text-xs font-semibold text-violet-200 uppercase tracking-wider">Google Calendar</div>
                    <div className="text-[10px] text-violet-300/60">Open in browser</div>
                </div>
                <ExternalLink className="w-4 h-4 text-violet-400 ml-auto opacity-50 group-hover:opacity-100" />
            </a>

            <button
                onClick={handleDownloadIcs}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/50 border border-white/5 hover:bg-slate-800 hover:border-white/10 transition-all group"
            >
                <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center shrink-0">
                    <Download className="w-4 h-4 text-slate-300" />
                </div>
                <div className="text-left">
                    <div className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Apple / Outlook</div>
                    <div className="text-[10px] text-slate-400">Download .ics file</div>
                </div>
            </button>
        </div>
    );
}
