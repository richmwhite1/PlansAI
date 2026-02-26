"use client";

import { useState } from "react";
import { Share2, Copy, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ShareButtonProps {
    hangoutId: string;
    variant?: "button" | "icon";
    className?: string;
}

export function ShareButton({ hangoutId, variant = "button", className }: ShareButtonProps) {
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
            const title = "Plans Invite";
            const message = "You're invited! Join my plan on Plans:";
            const fullMessage = `${message} ${urlToShare}`;

            try {
                if (typeof navigator !== "undefined" && navigator.share) {
                    await navigator.share({
                        title: title,
                        text: message,
                        url: urlToShare
                    });
                    toast.success("Opened share menu!");
                } else {
                    await navigator.clipboard.writeText(fullMessage);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                    toast.success("Invite copied to clipboard!");
                }
            } catch (err) {
                if ((err as Error).name !== 'AbortError') {
                    try {
                        await navigator.clipboard.writeText(fullMessage);
                        toast.success("Invite copied to clipboard!");
                    } catch (e) { }
                }
            }
        }
    };

    if (variant === "icon") {
        return (
            <button
                onClick={handleShare}
                disabled={isLoading}
                className={`p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/10 ${className || ''}`}
                title="Share Hangout"
            >
                {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : copied ? (
                    <Check className="w-5 h-5 text-green-400" />
                ) : (
                    <Share2 className="w-5 h-5" />
                )}
            </button>
        );
    }

    return (
        <button
            onClick={handleShare}
            disabled={isLoading}
            className={`flex items-center gap-2 bg-primary/20 hover:bg-primary/30 text-primary p-2 pr-4 rounded-full border border-primary/30 transition-colors text-sm font-medium disabled:opacity-50 ${className || ''}`}
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
    );
}
