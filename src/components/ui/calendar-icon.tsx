"use client";

import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface CalendarIconProps {
    date: Date;
    className?: string;
}

export function CalendarIcon({ date, className }: CalendarIconProps) {
    return (
        <div className={cn(
            "flex flex-col rounded-lg overflow-hidden border border-slate-200/20 shadow-sm bg-white shrink-0",
            "w-10 h-10 md:w-12 md:h-12", // Responsive size
            className
        )}>
            {/* Month Header */}
            <div className="bg-red-500 text-white text-[8px] md:text-[10px] font-bold uppercase tracking-widest flex items-center justify-center py-0.5 md:py-1">
                {format(date, "MMM")}
            </div>
            {/* Day Body */}
            <div className="flex-1 flex items-center justify-center bg-slate-50 text-slate-900 font-bold text-lg md:text-xl leading-none">
                {format(date, "d")}
            </div>
        </div>
    );
}
