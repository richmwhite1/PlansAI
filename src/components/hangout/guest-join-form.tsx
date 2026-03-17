import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, User, Check, CalendarDays, Bell, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { setGuestCookie } from "@/app/actions/guest-actions";
import { TurnstileWidget } from "@/components/ui/turnstile-widget";

interface Guest {
    id: string;
    displayName: string;
    rsvpStatus: string;
}

interface GuestJoinFormProps {
    hangoutId: string;
    hangoutSlug?: string;
    guestsToClaim?: Guest[];
    currentGuest?: any;
}

export function GuestJoinForm({ hangoutId, hangoutSlug, guestsToClaim = [], currentGuest }: GuestJoinFormProps) {
    const redirectPath = `/hangouts/${hangoutSlug ?? hangoutId}`;
    const router = useRouter();
    const [name, setName] = useState("");
    const [isJoining, setIsJoining] = useState(false);
    const [claimingId, setClaimingId] = useState<string | null>(null);
    const [isClaiming, setIsClaiming] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsJoining(true);
        try {
            // If updating an existing guest placeholder
            if (currentGuest?.displayName === "Guest") {
                const res = await fetch(`/api/hangouts/${hangoutId}/claim`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        guestId: currentGuest.id,
                        displayName: name
                    })
                });

                if (res.ok) {
                    toast.success("Name updated!");
                    window.location.reload();
                    return;
                }
            }

            const res = await fetch(`/api/hangouts/${hangoutId}/join-guest`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ displayName: name, turnstileToken })
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
                <h2 className="text-2xl font-serif font-bold text-foreground tracking-tight">
                    {currentGuest?.displayName === "Guest" ? "Welcome! Set your name" : "Join the Plan"}
                </h2>
                <p className="text-muted-foreground text-sm">
                    {currentGuest?.displayName === "Guest"
                        ? "You've been invited! Enter your name below to let everyone know who you are."
                        : guestsToClaim.length > 0
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
                                    claimingId === guest.id && "ring-2 ring-primary bg-primary/10"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary group-hover:bg-primary/30">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <span className="font-medium text-slate-200">{guest.displayName}</span>
                                </div>
                                {claimingId === guest.id ? (
                                    <Check className="w-5 h-5 text-primary" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Check className="w-4 h-4 text-emerald-400" />
                                    </div>
                                )}
                            </button>

                            {claimingId === guest.id && (
                                <div className="p-4 bg-slate-900/50 rounded-xl border border-primary/20 animate-in slide-in-from-top-2 fade-in space-y-3">
                                    <label className="text-xs font-bold text-primary uppercase tracking-wider block">
                                        Update Name (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder={guest.displayName}
                                        className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
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
                                        className="w-full py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
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

                <TurnstileWidget onVerify={setTurnstileToken} />

                <button
                    type="submit"
                    disabled={isJoining || !name.trim() || !!claimingId || !turnstileToken}
                    className={cn(
                        "w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2",
                        (isJoining || !name.trim() || !!claimingId || !turnstileToken) && "opacity-50 cursor-not-allowed"
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

            {/* Conversion card */}
            <div className="mt-6 bg-white/[0.03] border border-white/8 rounded-2xl p-5 space-y-4">
                <div className="space-y-1">
                    <p className="text-sm font-bold text-white">Make it your home base</p>
                    <p className="text-xs text-slate-500">Free account — takes 30 seconds</p>
                </div>
                <ul className="space-y-2.5">
                    {[
                        { Icon: CalendarDays, text: "See all your upcoming plans in one place" },
                        { Icon: Bell, text: "Get notified when votes close or plans change" },
                        { Icon: Users, text: "Coordinate with your whole circle effortlessly" },
                    ].map(({ Icon, text }) => (
                        <li key={text} className="flex items-center gap-2.5 text-xs text-slate-400">
                            <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
                            {text}
                        </li>
                    ))}
                </ul>
                <div className="flex flex-col gap-2 pt-1">
                    <a
                        href={`/sign-up?redirect_url=${redirectPath}`}
                        className="w-full py-2.5 rounded-xl bg-primary text-black text-sm font-bold text-center hover:bg-primary/90 transition-colors"
                    >
                        Create free account
                    </a>
                    <a
                        href={`/sign-in?redirect_url=${redirectPath}`}
                        className="w-full py-2.5 rounded-xl border border-white/10 text-slate-400 text-sm font-medium text-center hover:bg-white/5 transition-colors"
                    >
                        Sign in
                    </a>
                </div>
            </div>
        </div>
    );
}
