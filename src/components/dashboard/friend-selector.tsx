"use client";

import { useUser } from "@clerk/nextjs";
import { Search, UserPlus, X, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Friend {
    id: string;
    name: string;
    avatar: string;
    phone?: string;
    isGuest?: boolean;
}



interface FriendSelectorProps {
    selected: Friend[];
    onSelect: (friends: Friend[]) => void;
}

export function FriendSelector({ selected, onSelect }: FriendSelectorProps) {
    const { isSignedIn } = useUser();
    const [query, setQuery] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const [friends, setFriends] = useState<any[]>([]);
    const [discoveryUsers, setDiscoveryUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isAddingFriend, setIsAddingFriend] = useState(false);
    const [addFriendError, setAddFriendError] = useState<string | null>(null);

    // Fetch friends and discovery on mount
    useEffect(() => {
        if (isSignedIn) {
            setIsLoading(true);

            // Fetch both in parallel
            Promise.all([
                fetch(`/api/friends?t=${Date.now()}`).then(res => res.json()),
                fetch(`/api/users/discovery?t=${Date.now()}`).then(res => res.json())
            ]).then(([friendsData, discoveryData]) => {
                if (friendsData.friends) {
                    setFriends(friendsData.friends);
                }
                if (discoveryData.users) {
                    setDiscoveryUsers(discoveryData.users);
                }
            })
                .catch(console.error)
                .finally(() => setIsLoading(false));
        }
    }, [isSignedIn]);

    const toggleFriend = (friend: any) => {
        if (selected.find((f) => f.id === friend.id)) {
            onSelect(selected.filter((f) => f.id !== friend.id));
        } else {
            onSelect([...selected, friend]);
        }
    };

    const handleAddFriend = async (overrideEmail?: string) => {
        const target = overrideEmail || query;
        if (!target.trim()) return;

        setIsAddingFriend(true);
        setAddFriendError(null);

        try {
            const isEmail = target.includes("@");
            const res = await fetch("/api/friends/add", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(isEmail ? { email: target } : { phone: target })
            });

            const data = await res.json();

            if (res.ok && data.friend) {
                // Add to friends list with PENDING status and select
                const newFriend = {
                    id: data.friend.id,
                    name: data.friend.name,
                    avatar: data.friend.avatar || `https://i.pravatar.cc/150?u=${data.friend.id}`,
                    status: data.status || "PENDING"
                };
                setFriends(prev => [...prev.filter(f => f.id !== newFriend.id), newFriend]);
                setDiscoveryUsers(prev => prev.filter(u => u.id !== newFriend.id && u.email !== target));
                onSelect([...selected, newFriend]);
                setQuery("");
            } else if (data.canInvite) {
                setAddFriendError("Not on Plans yet. Invite them?");
            } else {
                setAddFriendError(data.error || "Could not add friend");
            }
        } catch (err) {
            setAddFriendError("Network error");
        } finally {
            setIsAddingFriend(false);
        }
    };

    // Consolidated search logic
    const searchResults = [
        ...friends.filter(f => (f.name || "").toLowerCase().includes(query.toLowerCase())),
        ...discoveryUsers.filter(u => (u.name || "").toLowerCase().includes(query.toLowerCase()))
    ];

    const [guestName, setGuestName] = useState("");
    const [guestPhone, setGuestPhone] = useState("");
    const [showGuestInput, setShowGuestInput] = useState(false);

    // Check if query looks like email/phone
    const isNewContact = query.includes("@") || /^\+?\d{10,}$/.test(query.replace(/\s/g, ""));

    const handleManualGuest = () => {
        if (!guestName.trim()) {
            setAddFriendError("Name is required for guests.");
            return;
        }

        const guestId = `guest-${Date.now()}`;

        const newGuest: Friend = {
            id: guestId,
            name: guestName,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${guestId}`,
            isGuest: true
        };

        onSelect([...selected, newGuest]);
        setGuestName("");
        setGuestPhone("");
        setShowGuestInput(false);
        setAddFriendError(null);
    };

    return (
        <div className="space-y-4">
            <div className="relative group">
                <div className={cn(
                    "absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent blur opacity-0 transition-opacity duration-500 rounded-xl",
                    isFocused || showGuestInput ? "opacity-100" : "group-hover:opacity-50"
                )} />

                <div className="relative bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-xl p-3 transition-colors focus-within:bg-slate-900/60 focus-within:border-primary/30">

                    {!showGuestInput ? (
                        <div className="flex items-center gap-3">
                            <Search className="w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search friends by name, email, or phone..."
                                className="bg-transparent border-none outline-none text-slate-200 placeholder:text-slate-500 flex-1 text-sm"
                                value={query}
                                onChange={(e) => {
                                    setQuery(e.target.value);
                                    setAddFriendError(null);
                                }}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && isNewContact) {
                                        handleAddFriend();
                                    }
                                }}
                            />
                            {isNewContact && (
                                <button
                                    onClick={() => handleAddFriend()}
                                    disabled={isAddingFriend}
                                    className="px-3 py-1 bg-primary/20 hover:bg-primary/30 text-primary text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {isAddingFriend ? <Loader2 className="w-3 h-3 animate-spin" /> : "Add User"}
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    setGuestName(query);
                                    setShowGuestInput(true);
                                    setQuery("");
                                }}
                                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
                            >
                                + Guest
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">New Guest</span>
                                <button
                                    onClick={() => setShowGuestInput(false)}
                                    className="text-slate-500 hover:text-slate-300"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    placeholder="Name (e.g. Dad)"
                                    className="bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 flex-1"
                                    value={guestName}
                                    onChange={(e) => setGuestName(e.target.value)}
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") handleManualGuest();
                                    }}
                                />
                            </div>
                            <button
                                onClick={handleManualGuest}
                                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors"
                            >
                                Add Guest
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Error Message */}
            <AnimatePresence>
                {addFriendError && (
                    <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-xs text-amber-400 px-2"
                    >
                        {addFriendError}
                    </motion.p>
                )}
            </AnimatePresence>

            {/* Selected Friends Pills */}
            <AnimatePresence>
                {selected.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex flex-wrap gap-2 overflow-hidden"
                    >
                        {selected.map((friend) => (
                            <motion.button
                                key={friend.id}
                                layout
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                onClick={() => toggleFriend(friend)}
                                className={cn(
                                    "flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border transition-colors group",
                                    friend.isGuest
                                        ? "bg-slate-800 border-white/10 text-slate-300"
                                        : "bg-primary/20 border-primary/30 text-primary hover:bg-primary/30"
                                )}
                            >
                                <img src={friend.avatar} alt={friend.name} className="w-6 h-6 rounded-full" />
                                <span className={cn("text-xs font-medium")}>
                                    {friend.name}
                                    {friend.isGuest && <span className="ml-1 opacity-50 text-[10px]">(Guest)</span>}
                                </span>
                                <X className={cn("w-3 h-3 opacity-50 group-hover:opacity-100")} />
                            </motion.button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Friend Suggestions */}
            {isFocused && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 space-y-2 p-2"
                >
                    {isLoading ? (
                        <div className="flex items-center justify-center py-4">
                            <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
                        </div>
                    ) : (
                        <>
                            <span className="text-xs text-slate-500 uppercase font-bold tracking-wider px-2">
                                {query.trim() ? "Results" : "Recent"}
                            </span>

                            {searchResults.length === 0 && !query.trim() ? (
                                <p className="text-xs text-slate-500 px-2 py-2">
                                    No recent friends. Search or add a guest.
                                </p>
                            ) : (
                                searchResults.slice(0, 10).map((result) => {
                                    const isSelected = selected.some(s => s.id === result.id);
                                    if (isSelected) return null;

                                    const isPending = result.status === "PENDING";

                                    return (
                                        <button
                                            key={result.id}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                if (!isPending) {
                                                    toggleFriend(result);
                                                } else if (result.isClerkDiscovery) {
                                                    handleAddFriend(result.email);
                                                }
                                            }}
                                            className={cn(
                                                "w-full flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition-colors text-left",
                                                isPending && !result.isRequester && "opacity-70"
                                            )}
                                        >
                                            <div className="relative">
                                                <img src={result.avatar} alt={result.name} className="w-8 h-8 rounded-full" />
                                                {isPending && (
                                                    <div className="absolute -bottom-1 -right-1 bg-amber-500 w-3 h-3 rounded-full border-2 border-slate-900 shadow-sm" />
                                                )}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm text-slate-300 font-medium">{result.name}</span>
                                                {isPending && (
                                                    <span className="text-[10px] text-amber-400 font-bold uppercase tracking-tighter">
                                                        {result.isRequester ? "Request Sent" : "Pending Approval"}
                                                    </span>
                                                )}
                                            </div>
                                            {result.isClerkDiscovery ? (
                                                <UserPlus className="w-4 h-4 text-primary ml-auto" />
                                            ) : (
                                                <div className="ml-auto">
                                                    {isSelected ? (
                                                        <X className="w-4 h-4 text-slate-500" />
                                                    ) : (
                                                        <div className="w-4 h-4 rounded-full border border-slate-700" />
                                                    )}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </>
                    )}
                </motion.div>
            )}
        </div>
    );
}
