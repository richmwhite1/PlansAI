"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface GuestJoinFormProps {
    hangoutId: string;
}

export function GuestJoinForm({ hangoutId }: GuestJoinFormProps) {
    const router = useRouter();
    const [name, setName] = useState("");
    const [isJoining, setIsJoining] = useState(false);

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsJoining(true);
        try {
            const res = await fetch(`/api/hangouts/${hangoutId}/join-guest`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ displayName: name })
            });

            if (res.ok) {
                toast.success("Joined hangout!");
                router.refresh();
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to join");
                setIsJoining(false);
            }
        } catch (error) {
            console.error("Join error:", error);
            toast.error("Network error");
            setIsJoining(false);
        }
    };

    return (
        <div className="glass p-8 rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-900/40 backdrop-blur-xl shadow-2xl max-w-md mx-auto text-center space-y-6">
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white tracking-tight">Join the Vibe</h2>
                <p className="text-slate-400 text-sm">
                    Enter your name to join this hangout as a guest. No signup required.
                </p>
            </div>

            <form onSubmit={handleJoin} className="space-y-4">
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your Name (e.g. Alex)"
                    className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-center text-lg text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all"
                    autoFocus
                />

                <button
                    type="submit"
                    disabled={isJoining || !name.trim()}
                    className={cn(
                        "w-full py-3 rounded-xl bg-violet-600 text-white font-bold text-lg hover:bg-violet-500 transition-all shadow-lg shadow-violet-900/20 active:scale-[0.98] flex items-center justify-center gap-2",
                        (isJoining || !name.trim()) && "opacity-50 cursor-not-allowed"
                    )}
                >
                    {isJoining ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            Join Hangout
                            <ArrowRight className="w-5 h-5" />
                        </>
                    )}
                </button>
            </form>

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-slate-900 px-2 text-slate-500">Or</span>
                </div>
            </div>

            <a
                href="/sign-in"
                className="block text-sm text-violet-400 hover:text-violet-300 transition-colors font-medium"
            >
                Sign in to Plans
            </a>
        </div>
    );
}
