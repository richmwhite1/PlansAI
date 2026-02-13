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
