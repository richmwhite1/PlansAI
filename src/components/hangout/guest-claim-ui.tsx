"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setGuestCookie } from "@/app/actions/guest-actions";
import { Loader2, User, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Guest {
    id: string;
    displayName: string;
    rsvpStatus: string;
}

interface GuestClaimUIProps {
    hangoutId: string;
    guests: Guest[];
}

export function GuestClaimUI({ hangoutId, guests }: GuestClaimUIProps) {
    const router = useRouter();
    const [claimingId, setClaimingId] = useState<string | null>(null);

    const handleClaim = async (guest: Guest, nameOverride?: string) => {
        setClaimingId(guest.id);

        // In a real app we might want a simple PIN or confirmation, 
        // but for this MVP we trust the link possession + name selection.
        try {
            // We need to fetch the token strictly from server side or have it passed safely
            // But we don't want to expose tokens to everyone.
            // Actually, for the Claim Flow to work securely, we should probably have a server action 
            // that validates the guest ID and *sets the cookie* on the server.

            // Wait, we need the token to set the cookie.
            // If we don't expose tokens in the public list, how do we set it?
            // Solution: The "Claim" action should look up the token server-side using the guestId 
            // AND the hangoutId (to ensure scope) and set the cookie.

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
                window.location.reload(); // Refresh to pick up the cookie/state
            }
        } catch (error) {
            console.error("Claim failed", error);
        } finally {
            // keep loading state until reload
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-6">
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold text-white">Who are you?</h2>
                    <p className="text-slate-400 text-sm">Select your name to join the hangout.</p>
                </div>

                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {guests.map((guest) => (
                        <div key={guest.id} className="space-y-2">
                            <button
                                onClick={() => {
                                    if (claimingId === guest.id) {
                                        setClaimingId(null);
                                    } else {
                                        setClaimingId(guest.id);
                                    }
                                }}
                                disabled={!!claimingId && claimingId !== guest.id}
                                className={cn(
                                    "w-full flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors group text-left",
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
                                        className="w-full py-2 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        Join as {guest.displayName.split(' ')[0]}
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}

                    {guests.length === 0 && (
                        <div className="text-center py-8 text-slate-500">
                            <p>No open guest spots found.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
