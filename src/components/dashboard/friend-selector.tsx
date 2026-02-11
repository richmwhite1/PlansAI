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
}

// Demo friends for when user has no friends yet
const DEMO_FRIENDS: Friend[] = [
    { id: "demo-1", name: "Sarah Connor", avatar: "https://i.pravatar.cc/150?u=demo1" },
    { id: "demo-2", name: "John Wick", avatar: "https://i.pravatar.cc/150?u=demo2" },
    { id: "demo-3", name: "Ellen Ripley", avatar: "https://i.pravatar.cc/150?u=demo3" },
];

interface FriendSelectorProps {
    selected: Friend[];
    onSelect: (friends: Friend[]) => void;
}

export function FriendSelector({ selected, onSelect }: FriendSelectorProps) {
    const { isSignedIn } = useUser();
    const [query, setQuery] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const [friends, setFriends] = useState<Friend[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isAddingFriend, setIsAddingFriend] = useState(false);
    const [addFriendError, setAddFriendError] = useState<string | null>(null);

    // Fetch friends on mount
    useEffect(() => {
        if (isSignedIn) {
            setIsLoading(true);
            fetch(`/api/friends?t=${Date.now()}`)
                .then(res => res.json())
                .then(data => {
                    if (data.friends && data.friends.length > 0) {
                        setFriends(data.friends);
                    } else {
                        // If no friends, try discovery
                        fetch(`/api/users/discovery?t=${Date.now()}`)
                            .then(res => res.json())
                            .then(discovery => {
                                if (discovery.users) {
                                    setFriends(discovery.users);
                                }
                            });
                    }
                })
                .catch(console.error)
                .finally(() => setIsLoading(false));
        }
    }, [isSignedIn]);

    const toggleFriend = (friend: Friend) => {
        if (selected.find((f) => f.id === friend.id)) {
            onSelect(selected.filter((f) => f.id !== friend.id));
        } else {
            onSelect([...selected, friend]);
        }
    };

    const handleAddFriend = async () => {
        if (!query.trim()) return;

        setIsAddingFriend(true);
        setAddFriendError(null);

        try {
            // Check if it's an email or phone
            const isEmail = query.includes("@");
            const res = await fetch("/api/friends/add", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(isEmail ? { email: query } : { phone: query })
            });

            const data = await res.json();

            if (res.ok && data.friend) {
                // Add to friends list and select
                const newFriend = {
                    id: data.friend.id,
                    name: data.friend.name,
                    avatar: data.friend.avatar || `https://i.pravatar.cc/150?u=${data.friend.id}`
                };
                setFriends(prev => [...prev, newFriend]);
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

    // Filter friends by search query
    const filteredFriends = friends.filter(f =>
        (f.name || "").toLowerCase().includes(query.toLowerCase()) ||
        !query.trim()
    );

    // Check if query looks like email/phone
    const isNewContact = query.includes("@") || /^\+?\d{10,}$/.test(query.replace(/\s/g, ""));

    return (
        <div className="space-y-4">
            <div className="relative group">
                <div className={cn(
                    "absolute inset-0 bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 blur opacity-0 transition-opacity duration-500 rounded-xl",
                    isFocused ? "opacity-100" : "group-hover:opacity-50"
                )} />

                <div className="relative bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-xl flex items-center p-3 gap-3 transition-colors focus-within:bg-slate-900/60 focus-within:border-violet-500/50">
                    <Search className="w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search friends or type email/phone..."
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
                            onClick={handleAddFriend}
                            disabled={isAddingFriend}
                            className="px-3 py-1 bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                        >
                            {isAddingFriend ? <Loader2 className="w-3 h-3 animate-spin" /> : "Add"}
                        </button>
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
                                className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-violet-500/20 border border-violet-500/30 hover:bg-violet-500/30 transition-colors group"
                            >
                                <img src={friend.avatar} alt={friend.name} className="w-6 h-6 rounded-full" />
                                <span className="text-xs font-medium text-violet-200">{friend.name}</span>
                                <X className="w-3 h-3 text-violet-300 opacity-50 group-hover:opacity-100" />
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
                            {filteredFriends.length === 0 ? (
                                <p className="text-xs text-slate-500 px-2 py-2">
                                    No friends found. Try adding by email or phone.
                                </p>
                            ) : (
                                filteredFriends.slice(0, 5).map((friend) => {
                                    const isSelected = selected.some(s => s.id === friend.id);
                                    if (isSelected) return null;

                                    return (
                                        <button
                                            key={friend.id}
                                            onClick={() => toggleFriend(friend)}
                                            className="w-full flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition-colors text-left"
                                        >
                                            <img src={friend.avatar} alt={friend.name} className="w-8 h-8 rounded-full" />
                                            <span className="text-sm text-slate-300">{friend.name}</span>
                                            <UserPlus className="w-4 h-4 text-slate-500 ml-auto" />
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
