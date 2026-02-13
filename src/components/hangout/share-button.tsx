"use client";

import { useState } from "react";
import { Share2, Copy, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ShareButtonProps {
    hangoutId: string;
}

export function ShareButton({ hangoutId }: ShareButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [inviteUrl, setInviteUrl] = useState<string | null>(null);

    const handleShare = async () => {
        let urlToShare = inviteUrl;
        if (!urlToShare) {
            setIsLoading(true);
            try {
                const res = await fetch(`/api/hangouts/${hangoutId}/invite`, { method: "POST" });
                if (res.ok) {
                    const data = await res.json();
                    setInviteUrl(data.inviteUrl);
                    urlToShare = data.inviteUrl;
                }
            } catch (error) {
                console.error("Failed to generate invite:", error);
            } finally {
                setIsLoading(false);
            }
        }

        if (urlToShare) {
            const message = `You're invited! Join my plan: ${urlToShare}`;
            try {
                if (typeof navigator !== "undefined" && navigator.share) {
                    await navigator.share({
                        title: "Plans Invite",
                        text: "You're invited! Join my plan on Plans.",
                        url: urlToShare
                    });
                    toast.success("Opened share menu!");
                } else {
                    await navigator.clipboard.writeText(message);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                    toast.success("Invite copied to clipboard!");
                }
            } catch (err) {
                console.error('Failed to share/copy: ', err);
                // Fallback to just copying URL if message fails? strict copy logic
                try {
                    await navigator.clipboard.writeText(urlToShare);
                    toast.success("Link copied!");
                } catch (e) { }
            }
        }
    };

    return (
        <div className="flex gap-2">
            <button
                onClick={handleShare}
                disabled={isLoading}
                className="flex items-center gap-2 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 p-2 pr-4 rounded-full border border-violet-500/30 transition-colors text-sm font-medium disabled:opacity-50"
            >
                {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : copied ? (
                    <Check className="w-4 h-4 text-green-400" />
                ) : (
                    <Share2 className="w-4 h-4" />
                )}
                {copied ? "Copied!" : "Invite"}
            </button>
        </div>
    );
}
