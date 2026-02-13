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

    const generateIcsContent = () => {
        const start = format(startTime, "yyyyMMdd'T'HHmmss");
        const end = format(finalEndTime, "yyyyMMdd'T'HHmmss");
        const now = format(new Date(), "yyyyMMdd'T'HHmmss");

        return [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//Plans AI//Hangouts//EN",
            "CALSCALE:GREGORIAN",
            "METHOD:PUBLISH",
            "BEGIN:VEVENT",
            `UID:${crypto.randomUUID()}`,
            `DTSTAMP:${now}`,
            `DTSTART:${start}`,
            `DTEND:${end}`,
            `SUMMARY:${title}`,
            `DESCRIPTION:${(description || "").replace(/\n/g, "\\n")}`,
            `LOCATION:${location || ""}`,
            "STATUS:CONFIRMED",
            "END:VEVENT",
            "END:VCALENDAR"
        ].join("\r\n");
    };

    const isAppleDevice = () => {
        if (typeof navigator === "undefined") return false;
        return /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);
    };

    const handleAppleCalendar = () => {
        const content = generateIcsContent();
        // On Apple devices, use data URI which triggers Calendar.app directly
        const dataUri = `data:text/calendar;charset=utf-8,${encodeURIComponent(content)}`;
        window.open(dataUri, "_blank");
    };

    const handleDownloadIcs = () => {
        const content = generateIcsContent();
        const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `${title.replace(/\s+/g, "_")}.ics`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleCalendarAdd = () => {
        if (isAppleDevice()) {
            handleAppleCalendar();
        } else {
            handleDownloadIcs();
        }
    };

    if (compact) {
        return (
            <div className="flex flex-col gap-3">
                <a
                    href={googleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-3 rounded-2xl bg-card hover:bg-accent border border-white/5 hover:border-primary/30 transition-all group w-full"
                >
                    <CalendarIcon date={startTime} />
                    <div className="flex-1 text-left">
                        <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Add to Google Calendar</div>
                        <div className="text-xs text-muted-foreground">Opens in browser</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </a>

                <button
                    onClick={handleCalendarAdd}
                    className="flex items-center gap-4 p-3 rounded-2xl bg-card/40 hover:bg-card/60 border border-white/5 hover:border-white/10 transition-all group w-full text-left"
                >
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 border border-white/5">
                        <Download className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                        <div className="text-sm font-semibold text-foreground/80 group-hover:text-foreground transition-colors">Download .ics File</div>
                        <div className="text-xs text-muted-foreground">For Apple & Outlook</div>
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
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/20 hover:border-primary/40 transition-all group"
            >
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                    <CalendarIcon date={startTime} className="w-8 h-8" />
                </div>
                <div className="text-left">
                    <div className="text-xs font-semibold text-primary uppercase tracking-wider">Google Calendar</div>
                    <div className="text-[10px] text-primary/60">Open in browser</div>
                </div>
                <ExternalLink className="w-4 h-4 text-primary ml-auto opacity-50 group-hover:opacity-100" />
            </a>

            <button
                onClick={handleCalendarAdd}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-white/5 hover:bg-accent hover:border-white/10 transition-all group"
            >
                <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                    <Download className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="text-left">
                    <div className="text-xs font-semibold text-foreground uppercase tracking-wider">Apple / Outlook</div>
                    <div className="text-[10px] text-muted-foreground">Opens in Calendar app</div>
                </div>
            </button>
        </div>
    );
}
