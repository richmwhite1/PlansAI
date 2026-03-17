"use client";

import { useState, useEffect } from "react";
import { CalendarCheck, CheckCircle, XCircle, ExternalLink } from "lucide-react";
import { useSearchParams } from "next/navigation";

export function CalendarSection() {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();

  // Check status from URL params (after OAuth redirect)
  const calendarParam = searchParams?.get("calendar");

  useEffect(() => {
    if (calendarParam === "connected") setIsConnected(true);
    // Could also check via an API route to see if token exists
  }, [calendarParam]);

  async function handleDisconnect() {
    setLoading(true);
    try {
      await fetch("/api/calendar/disconnect", { method: "DELETE" });
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
      <div className="flex items-center gap-3 mb-3">
        <CalendarCheck size={18} className="text-lime-400" />
        <h3 className="font-medium text-white">Google Calendar</h3>
        {isConnected && (
          <span className="flex items-center gap-1 text-xs text-lime-400 ml-auto">
            <CheckCircle size={12} /> Connected
          </span>
        )}
      </div>

      <p className="text-sm text-zinc-400 mb-4">
        Let Plans check when you&apos;re free — only free/busy info is read, never
        event titles or details.
      </p>

      {isConnected ? (
        <button
          onClick={handleDisconnect}
          disabled={loading}
          className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
        >
          <XCircle size={14} />
          {loading ? "Disconnecting..." : "Disconnect Google Calendar"}
        </button>
      ) : (
        <a
          href="/api/calendar/connect"
          className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm rounded-lg transition-colors"
        >
          <ExternalLink size={14} />
          Connect Google Calendar
        </a>
      )}
    </div>
  );
}
