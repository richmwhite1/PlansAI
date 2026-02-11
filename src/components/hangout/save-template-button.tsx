"use client";

import { useState } from "react";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";

interface SaveTemplateButtonProps {
    hangoutId: string;
    title: string;
    type: string;
    activityId?: string | null;
}

export function SaveTemplateButton({ hangoutId, title, type, activityId }: SaveTemplateButtonProps) {
    const [isSaved, setIsSaved] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/templates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: title,
                    type: type,
                    activityId: activityId
                })
            });

            if (res.ok) {
                setIsSaved(true);
            }
        } catch (err) {
            console.error("Save template failed:", err);
        } finally {
            setIsLoading(false);
        }
    };

    if (isSaved) {
        return (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg border border-green-500/20 text-xs font-medium">
                <BookmarkCheck className="w-3.5 h-3.5" />
                Saved to Templates
            </div>
        );
    }

    return (
        <button
            onClick={handleSave}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg border border-white/5 transition-colors text-xs font-medium disabled:opacity-50"
        >
            {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
                <Bookmark className="w-3.5 h-3.5" />
            )}
            Save as Template
        </button>
    );
}
