import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, User, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { setGuestCookie } from "@/app/actions/guest-actions";

interface Guest {
    id: string;
    displayName: string;
    rsvpStatus: string;
}

interface GuestJoinFormProps {
    hangoutId: string;
    guestsToClaim?: Guest[];
}

export function GuestJoinForm({ hangoutId, guestsToClaim = [] }: GuestJoinFormProps) {
    const router = useRouter();
    const [name, setName] = useState("");
    const [isJoining, setIsJoining] = useState(false);
    const [claimingId, setClaimingId] = useState<string | null>(null);
    const [isClaiming, setIsClaiming] = useState(false);

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
                window.location.reload();
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

    const handleClaim = async (guest: Guest, nameOverride?: string) => {
        setIsClaiming(true);
        try {
            const res = await fetch(`/api/hangouts/${hangoutId}/claim`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    guestId: guest.id,
                    displayName: nameOverride || undefined
                })
            });

            if (res.ok) {
                const data = await res.json();
                await setGuestCookie(data.token);
                toast.success("Joined hangout!");
                window.location.reload();
            } else {
                toast.error("Failed to join");
            }
        } catch (error) {
            console.error("Claim failed", error);
            toast.error("Network error");
        } finally {
            setIsClaiming(false);
        }
    };

    return (
        <div className="glass-card p-8 rounded-3xl border border-white/10 shadow-2xl max-w-md mx-auto text-center space-y-6">
            <div className="space-y-2">
                <h2 className="text-2xl font-serif font-bold text-foreground tracking-tight">Join the Plan</h2>
                <p className="text-muted-foreground text-sm">
                    {guestsToClaim.length > 0
                        ? "Are you one of these guests? Select your name to join, or enter a new one below."
                        : "Enter your name to join this hangout as a guest. No signup required."}
                </p>
            </div>

            {guestsToClaim.length > 0 && (
                <div className="space-y-2 max-h-[30vh] overflow-y-auto mb-6 text-left">
                    {guestsToClaim.map((guest) => (
                        <div key={guest.id} className="space-y-2">
                            <button
                                onClick={() => setClaimingId(claimingId === guest.id ? null : guest.id)}
                                disabled={isClaiming || (!!claimingId && claimingId !== guest.id)}
                                className={cn(
                                    "w-full flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors group",
                                    claimingId === guest.id && "ring-2 ring-violet-500 bg-violet-500/10"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-300 group-hover:bg-violet-500/30">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <span className="font-medium text-slate-200">{guest.displayName}</span>
                                </div>
                                {claimingId === guest.id ? (
                                    <Check className="w-5 h-5 text-violet-400" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Check className="w-4 h-4 text-emerald-400" />
                                    </div>
                                )}
                            </button>

                            {claimingId === guest.id && (
                                <div className="p-4 bg-slate-900/50 rounded-xl border border-violet-500/20 animate-in slide-in-from-top-2 fade-in space-y-3">
                                    <label className="text-xs font-bold text-violet-300 uppercase tracking-wider block">
                                        Update Name (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder={guest.displayName}
                                        className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleClaim(guest, (e.target as HTMLInputElement).value);
                                            }
                                        }}
                                        id={`name-input-${guest.id}`}
                                    />
                                    <button
                                        onClick={() => {
                                            const input = document.getElementById(`name-input-${guest.id}`) as HTMLInputElement;
                                            handleClaim(guest, input.value);
                                        }}
                                        disabled={isClaiming}
                                        className="w-full py-2 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isClaiming ? <Loader2 className="w-5 h-5 animate-spin" /> : `Join as ${guest.displayName.split(' ')[0]}`}
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {guestsToClaim.length > 0 && (
                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-white/10" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">Or join as a new guest</span>
                    </div>
                </div>
            )}

            <form onSubmit={handleJoin} className="space-y-4">
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your Name (e.g. Alex)"
                    className="w-full bg-input/50 ring-1 ring-white/10 rounded-xl px-4 py-3 text-center text-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-primary/50 transition-all"
                />

                <button
                    type="submit"
                    disabled={isJoining || !name.trim() || !!claimingId}
                    className={cn(
                        "w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2",
                        (isJoining || !name.trim() || !!claimingId) && "opacity-50 cursor-not-allowed"
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

            <div className="relative mt-8">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or</span>
                </div>
            </div>

            <a
                href="/sign-in"
                className="block mt-4 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
            >
                Sign in to Plans
            </a>
        </div>
    );
}
