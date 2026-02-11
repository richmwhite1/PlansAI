"use client";

import { MapPin, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LocationPromptProps {
    permissionStatus: "prompt" | "granted" | "denied" | "unknown";
    loading: boolean;
    error: string | null;
    onRequestLocation: () => void;
}

export function LocationPrompt({
    permissionStatus,
    loading,
    error,
    onRequestLocation,
}: LocationPromptProps) {
    if (permissionStatus === "granted") return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "flex items-center gap-3 p-3 rounded-xl text-sm",
                permissionStatus === "denied"
                    ? "bg-rose-500/10 border border-rose-500/20 text-rose-300"
                    : "bg-violet-500/10 border border-violet-500/20 text-violet-300"
            )}
        >
            {permissionStatus === "denied" ? (
                <>
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="flex-1">
                        Location denied. Using San Francisco as default.
                    </span>
                </>
            ) : (
                <>
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span className="flex-1">
                        Enable location for better suggestions nearby
                    </span>
                    <button
                        onClick={onRequestLocation}
                        disabled={loading}
                        className="px-3 py-1 bg-violet-500/20 hover:bg-violet-500/30 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        {loading ? "..." : "Enable"}
                    </button>
                </>
            )}
        </motion.div>
    );
}
