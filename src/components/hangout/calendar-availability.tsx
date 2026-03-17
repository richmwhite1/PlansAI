"use client";

import useSWR from "swr";
import { CalendarCheck, Users } from "lucide-react";

interface TimeAvailability {
  timeOptionId: string;
  startTime: string;
  freeCount: number;
  busyCount: number;
  totalConnected: number;
}

interface CalendarAvailabilityProps {
  hangoutId: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function CalendarAvailability({ hangoutId }: CalendarAvailabilityProps) {
  const { data, error } = useSWR(
    `/api/hangouts/${hangoutId}/availability`,
    fetcher,
    { refreshInterval: 60000 }
  );

  if (error) return null;
  if (!data) return null;

  if (data.connectedCount === 0) {
    return (
      <div className="mt-4 p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <CalendarCheck size={14} />
          <span>Connect Google Calendar to see when everyone is free</span>
        </div>
        <a
          href="/api/calendar/connect"
          className="mt-2 inline-block text-xs text-lime-400 hover:text-lime-300 underline"
        >
          Connect my calendar →
        </a>
      </div>
    );
  }

  if (!data.availability || data.availability.length === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Users size={12} />
        <span>{data.connectedCount} people have connected their calendar</span>
      </div>
      {data.availability.map((item: TimeAvailability) => {
        const pct =
          data.connectedCount > 0
            ? (item.freeCount / data.connectedCount) * 100
            : 0;
        return (
          <div key={item.timeOptionId} className="flex items-center gap-3 text-xs">
            <div className="flex-1 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-lime-500 rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-zinc-400 whitespace-nowrap">
              {item.freeCount}/{data.connectedCount} free
            </span>
          </div>
        );
      })}
    </div>
  );
}
