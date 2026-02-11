"use client";

import { useState, useEffect } from "react";
import { useUser, SignInButton } from "@clerk/nextjs";
import Link from "next/link";
import { Search, UserPlus, Loader2, Check, ArrowLeft, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface User {
    id: string;
    name: string;
    email?: string;
    avatar: string;
}

interface Friend extends User {
    sharedHangouts?: number;
}

export default function FriendsPage() {
    const { isSignedIn, isLoaded } = useUser();
    const [friends, setFriends] = useState<Friend[]>([]);
    const [suggested, setSuggested] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSuggestedLoading, setIsSuggestedLoading] = useState(true);
    const [addingUser, setAddingUser] = useState<string | null>(null);
    const [addedUsers, setAddedUsers] = useState<Set<string>>(new Set());

    const [requests, setRequests] = useState<Friend[]>([]);

    // Fetch friends, requests and discovery
    useEffect(() => {
        if (isSignedIn) {
            // Fetch friends
            fetch(`/api/friends?t=${Date.now()}`)
                .then(res => res.json())
                .then(data => {
                    if (data.friends) {
                        setFriends(data.friends);
                        setAddedUsers(prev => {
                            const next = new Set(prev);
                            data.friends.forEach((f: Friend) => next.add(f.id));
                            return next;
                        });
                    }
                })
                .catch(console.error)
                .finally(() => setIsLoading(false));

            // Fetch requests
            fetch(`/api/friends?type=requests&t=${Date.now()}`)
                .then(res => res.json())
                .then(data => {
                    if (data.friends) {
                        setRequests(data.friends);
                    }
                })
                .catch(console.error);

            // Fetch suggested
            fetch(`/api/users/discovery?t=${Date.now()}`)
                .then(res => res.json())
                .then(data => {
                    if (data.users) {
                        setSuggested(data.users);
                    }
                })
                .catch(console.error)
                .finally(() => setIsSuggestedLoading(false));
        } else {
            setIsLoading(false);
            setIsSuggestedLoading(false);
        }
    }, [isSignedIn]);

    const handleRespond = async (friendId: string, action: "ACCEPT" | "REJECT") => {
        try {
            const res = await fetch("/api/friends/respond", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ friendId, action })
            });

            if (res.ok) {
                // Remove from requests
                const request = requests.find(r => r.id === friendId);
                setRequests(prev => prev.filter(r => r.id !== friendId));

                // If accepted, add to friends
                if (action === "ACCEPT" && request) {
                    setFriends(prev => [request, ...prev]);
                    setAddedUsers(prev => new Set([...prev, friendId]));
                    toast.success(`You are now friends with ${request.name}`);
                } else {
                    toast.info("Friend request ignored");
                }
            } else {
                toast.error("Failed to respond to request");
            }
        } catch (err) {
            console.error("Respond failed:", err);
            toast.error("Something went wrong");
        }
    };


    // Search users as you type
    useEffect(() => {
        if (searchQuery.length < 2) {
            setSearchResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
                const data = await res.json();
                if (data.users) {
                    setSearchResults(data.users);
                }
            } catch (err) {
                console.error("Search failed:", err);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleAddFriend = async (user: User) => {
        if (addedUsers.has(user.id)) return;
        setAddingUser(user.id);
        try {
            const res = await fetch("/api/friends/add", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ friendId: user.id })
            });

            const data = await res.json();

            if (res.ok) {
                setAddedUsers(prev => {
                    const next = new Set(prev);
                    next.add(user.id);
                    return next;
                });
                toast.success(`Friend request sent to ${user.name}`);
            } else if (res.status === 409) {
                // Already sent or already friends
                setAddedUsers(prev => {
                    const next = new Set(prev);
                    next.add(user.id);
                    return next;
                });
                toast.info(data.error || "Request already sent");
            } else {
                console.error("Add friend error:", data);
                toast.error(data.error || "Failed to add friend");
            }
        } catch (err) {
            console.error("Add friend failed:", err);
            toast.error("Something went wrong");
        } finally {
            setAddingUser(null);
        }
    };

    if (!isLoaded) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            </div>
        );
    }

    if (!isSignedIn) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-center p-6">
                <Users className="w-16 h-16 text-violet-500 mb-4" />
                <h1 className="text-2xl font-bold text-white mb-2">Find Friends</h1>
                <p className="text-slate-400 mb-6">Sign in to search and add friends</p>
                <SignInButton mode="modal">
                    <button className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl transition-colors">
                        Sign In
                    </button>
                </SignInButton>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
                <div className="container mx-auto max-w-2xl px-6 py-4 flex items-center gap-4">
                    <Link href="/" className="p-2 -ml-2 hover:bg-white/5 rounded-lg transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-400" />
                    </Link>
                    <h1 className="text-lg font-bold text-white">Friends</h1>
                </div>
            </header>

            <main className="container mx-auto max-w-2xl px-6 py-8 space-y-8">
                {/* Search */}
                <div className="relative">
                    <div className="relative bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-xl flex items-center p-3 gap-3 focus-within:border-violet-500/50 transition-colors">
                        <Search className="w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search users by name or email..."
                            className="bg-transparent border-none outline-none text-slate-200 placeholder:text-slate-500 flex-1 text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {isSearching && <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />}
                    </div>

                    {/* Search Results Dropdown */}
                    <AnimatePresence>
                        {searchResults.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-white/10 rounded-xl overflow-hidden z-10"
                            >
                                {searchResults.map(user => {
                                    const isAdded = addedUsers.has(user.id);
                                    const isAdding = addingUser === user.id;

                                    return (
                                        <div
                                            key={user.id}
                                            className="flex items-center gap-3 p-3 hover:bg-white/5 transition-colors"
                                        >
                                            <img
                                                src={user.avatar}
                                                alt={user.name}
                                                className="w-10 h-10 rounded-full bg-slate-800"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-slate-200 truncate">{user.name}</p>
                                                {user.email && (
                                                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => handleAddFriend(user)}
                                                disabled={isAdded || isAdding}
                                                className={cn(
                                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                                                    isAdded
                                                        ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                                        : "bg-violet-500/20 text-violet-300 border border-violet-500/30 hover:bg-violet-500/30",
                                                    "disabled:opacity-50"
                                                )}
                                            >
                                                {isAdding ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : isAdded ? (
                                                    <>
                                                        <Check className="w-3 h-3" />
                                                        Added
                                                    </>
                                                ) : (
                                                    <>
                                                        <UserPlus className="w-3 h-3" />
                                                        Add
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    );
                                })}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Friend Requests */}
                {requests.length > 0 && (
                    <section>
                        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
                            Friend Requests ({requests.length})
                        </h2>
                        <div className="space-y-2">
                            {requests.map(req => (
                                <div
                                    key={req.id}
                                    className="flex items-center gap-3 p-3 bg-violet-500/10 rounded-xl border border-violet-500/20"
                                >
                                    <img
                                        src={req.avatar}
                                        alt={req.name}
                                        className="w-10 h-10 rounded-full bg-slate-800"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-white truncate">{req.name}</p>
                                        <p className="text-xs text-violet-300">Wants to be friends</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleRespond(req.id, "ACCEPT")}
                                            className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium rounded-lg transition-colors"
                                        >
                                            Accept
                                        </button>
                                        <button
                                            onClick={() => handleRespond(req.id, "REJECT")}
                                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors"
                                        >
                                            Ignore
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Your Friends */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Your Friends ({friends.length})
                        </h2>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
                        </div>
                    ) : friends.length > 0 ? (
                        <div className="space-y-2">
                            {friends.map(friend => (
                                <div
                                    key={friend.id}
                                    className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 group"
                                >
                                    <img
                                        src={friend.avatar}
                                        alt={friend.name}
                                        className="w-10 h-10 rounded-full bg-slate-800 ring-2 ring-white/5"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-200 truncate">{friend.name}</p>
                                        {friend.sharedHangouts !== undefined && friend.sharedHangouts > 0 && (
                                            <p className="text-xs text-slate-500">
                                                {friend.sharedHangouts} hangout{friend.sharedHangouts !== 1 ? "s" : ""} together
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/5">
                            <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-500 text-sm mb-2">No friends yet</p>
                            <p className="text-slate-600 text-xs text-balance px-12">Use the search above or suggested list below to find and add friends</p>
                        </div>
                    )}
                </section>

                {/* Suggested Friends (Discovery) */}
                {suggested.length > 0 && (
                    <section>
                        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
                            Suggested for You
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {suggested.map(user => {
                                const isAdded = addedUsers.has(user.id);
                                const isAdding = addingUser === user.id;

                                return (
                                    <div
                                        key={user.id}
                                        className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-xl border border-white/5"
                                    >
                                        <img
                                            src={user.avatar}
                                            alt={user.name}
                                            className="w-10 h-10 rounded-full bg-slate-800"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-slate-200 truncate">{user.name}</p>
                                            <p className="text-[10px] text-slate-500 truncate">Popular in your area</p>
                                        </div>
                                        <button
                                            onClick={() => handleAddFriend(user)}
                                            disabled={isAdded || isAdding}
                                            className={cn(
                                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                                                isAdded
                                                    ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                                    : "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/10",
                                                "disabled:opacity-50 disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none"
                                            )}
                                        >
                                            {isAdding ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : isAdded ? (
                                                "Sent"
                                            ) : (
                                                "Add Friend"
                                            )}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}
