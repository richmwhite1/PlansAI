"use client";

import { useState, useEffect } from "react";
import { useUser, SignInButton } from "@clerk/nextjs";
import Link from "next/link";
import { Search, UserPlus, Loader2, Check, ArrowLeft, Users, Share2, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface User {
    id: string;
    name: string;
    email?: string;
    avatar: string;
    bio?: string;
    websiteUrl?: string;
    locationUrl?: string;
    isClerkDiscovery?: boolean;
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
    const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

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

            // Fetch sent requests
            fetch(`/api/friends?type=sent&t=${Date.now()}`)
                .then(res => res.json())
                .then(data => {
                    if (data.friends) {
                        setSentRequests(new Set(data.friends.map((f: Friend) => f.id)));
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

    const getRelationshipStatus = (userId: string): "FRIEND" | "SENT" | "RECEIVED" | "NONE" => {
        if (addedUsers.has(userId)) return "FRIEND";
        if (sentRequests.has(userId)) return "SENT";
        if (requests.some(r => r.id === userId)) return "RECEIVED";
        return "NONE";
    };

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
        const hasQuery = searchQuery.length >= 2;
        if (!hasQuery) {
            setSearchResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const params = new URLSearchParams();
                if (searchQuery) params.append("q", searchQuery);

                const res = await fetch(`/api/users/search?${params.toString()}`);
                const data = await res.json();
                if (data.users) {
                    setSearchResults(data.users);
                }
            } catch (err) {
                console.error("Search failed:", err);
            } finally {
                setIsSearching(false);
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleInvite = async () => {
        const title = 'Plans - Social Coordination Engine';
        const text = 'Check out how easy it is to coordinate get togethers now with this app called Plans';
        const url = window.location.origin;
        const fullMessage = `${text}: ${url}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title,
                    text: fullMessage,
                    url,
                });
            } catch (err) {
                console.error('Error sharing:', err);
                // If sharing failed but it wasn't a cancellation, try fallback
                if ((err as Error).name !== 'AbortError') {
                    navigator.clipboard.writeText(fullMessage);
                    toast.success("Link copied to clipboard");
                }
            }
        } else {
            // Fallback for browsers that don't support share API
            navigator.clipboard.writeText(fullMessage);
            toast.success("Link copied to clipboard");
        }
    };

    const handleAddFriend = async (user: User) => {
        if (addedUsers.has(user.id)) return;
        setAddingUser(user.id);

        const payload = user.isClerkDiscovery
            ? { clerkId: user.id }
            : { friendId: user.id };

        try {
            const res = await fetch("/api/friends/add", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (res.ok) {
                // Update local state to reflect SENT status immediately
                setSentRequests(prev => {
                    const next = new Set(prev);
                    next.add(user.id);
                    return next;
                });

                toast.success(`Friend request sent to ${user.name}`);
            } else if (res.status === 409) {
                // Already sent or already friends
                setSentRequests(prev => {
                    const next = new Set(prev);
                    next.add(user.id);
                    return next;
                });
                toast.info(data.error || "Request already sent");
            } else {
                console.error("Add friend error:", data);
                if (res.status === 404 && user.isClerkDiscovery) {
                    toast.error("User not fully registered yet");
                } else {
                    toast.error(data.error || "Failed to add friend");
                }
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
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    if (!isSignedIn) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center p-6">
                <Users className="w-16 h-16 text-primary mb-4" />
                <h1 className="text-2xl font-bold text-foreground mb-2">Find Friends</h1>
                <p className="text-muted-foreground mb-6">Sign in to search and add friends</p>
                <SignInButton mode="modal">
                    <button className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl transition-colors">
                        Sign In
                    </button>
                </SignInButton>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <main className="container mx-auto max-w-2xl px-6 py-8 space-y-8">
                {/* Search & Advanced Search */}
                <div className="relative space-y-4">
                    <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-xl flex items-center p-3 gap-3 focus-within:border-primary/50 transition-colors">
                        <Search className="w-5 h-5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search users..."
                            className="bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground flex-1 text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button
                            onClick={handleInvite}
                            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors flex items-center gap-2"
                        >
                            <Share2 className="w-4 h-4" />
                            Invite Friend
                        </button>
                        {isSearching && <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />}
                    </div>

                    {/* Search Results Dropdown */}
                    <AnimatePresence>
                        {searchResults.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[60]"
                            >
                                {searchResults.map(user => {
                                    const status = getRelationshipStatus(user.id);
                                    const isAdding = addingUser === user.id;

                                    return (
                                        <div
                                            key={user.id}
                                            className="flex items-center gap-3 p-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                                        >
                                            <Link href={`/profile/${user.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                                                <img
                                                    src={user.avatar}
                                                    alt={user.name}
                                                    className="w-10 h-10 rounded-full bg-slate-800"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-slate-200 truncate">{user.name}</p>
                                                    {user.bio && (
                                                        <p className="text-xs text-slate-400 truncate">{user.bio}</p>
                                                    )}
                                                    {(user.websiteUrl || user.email) && (
                                                        <p className="text-[10px] text-slate-500 truncate">
                                                            {user.websiteUrl || user.email}
                                                        </p>
                                                    )}
                                                </div>
                                            </Link>
                                            <button
                                                onClick={() => {
                                                    if (status === "RECEIVED") {
                                                        handleRespond(user.id, "ACCEPT");
                                                    } else if (status === "NONE") {
                                                        handleAddFriend(user);
                                                    }
                                                }}
                                                disabled={status === "FRIEND" || status === "SENT" || isAdding}
                                                className={cn(
                                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                                                    status === "FRIEND"
                                                        ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                                        : status === "SENT"
                                                            ? "bg-slate-800 text-slate-400 border border-white/10"
                                                            : status === "RECEIVED"
                                                                ? "bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-500/20"
                                                                : "bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30",
                                                    "disabled:opacity-50"
                                                )}
                                            >
                                                {isAdding ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : status === "FRIEND" ? (
                                                    <>
                                                        <Check className="w-3 h-3" />
                                                        Friend
                                                    </>
                                                ) : status === "SENT" ? (
                                                    <>
                                                        <Clock className="w-3 h-3" />
                                                        Requested
                                                    </>
                                                ) : status === "RECEIVED" ? (
                                                    "Accept"
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
                                    className="flex items-center gap-3 p-3 bg-primary/10 rounded-xl border border-primary/20"
                                >
                                    <Link href={`/profile/${req.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                                        <img
                                            src={req.avatar}
                                            alt={req.name}
                                            className="w-10 h-10 rounded-full bg-slate-800"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-foreground truncate">{req.name}</p>
                                            <p className="text-xs text-primary/80">Wants to be friends</p>
                                        </div>
                                    </Link>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleRespond(req.id, "ACCEPT")}
                                            className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium rounded-lg transition-colors"
                                        >
                                            Accept
                                        </button>
                                        <button
                                            onClick={() => handleRespond(req.id, "REJECT")}
                                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-muted-foreground text-xs font-medium rounded-lg transition-colors"
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
                                    className="flex items-center gap-3 p-3 bg-card/50 rounded-xl border border-white/5 group"
                                >
                                    <Link href={`/profile/${friend.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                                        <img
                                            src={friend.avatar}
                                            alt={friend.name}
                                            className="w-10 h-10 rounded-full bg-slate-800 ring-2 ring-white/5"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-foreground truncate">{friend.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {friend.sharedHangouts} hangout{friend.sharedHangouts !== 1 ? "s" : ""} together
                                            </p>
                                        </div>
                                    </Link>
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
                                const status = getRelationshipStatus(user.id);
                                const isAdding = addingUser === user.id;

                                return (
                                    <div
                                        key={user.id}
                                        className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-xl border border-white/5"
                                    >
                                        <Link href={`/profile/${user.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                                            <img
                                                src={user.avatar}
                                                alt={user.name}
                                                className="w-10 h-10 rounded-full bg-slate-800"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-foreground truncate">{user.name}</p>
                                                <p className="text-[10px] text-muted-foreground truncate">Popular in your area</p>
                                            </div>
                                        </Link>
                                        <button
                                            onClick={() => {
                                                if (status === "RECEIVED") {
                                                    handleRespond(user.id, "ACCEPT");
                                                } else if (status === "NONE") {
                                                    handleAddFriend(user);
                                                }
                                            }}
                                            disabled={status === "FRIEND" || status === "SENT" || isAdding}
                                            className={cn(
                                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                                                status === "FRIEND"
                                                    ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                                    : status === "SENT"
                                                        ? "bg-slate-800 text-slate-400 border border-white/10"
                                                        : status === "RECEIVED"
                                                            ? "bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-500/20"
                                                            : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/10",
                                                "disabled:opacity-50 disabled:bg-slate-800 disabled:text-muted-foreground disabled:shadow-none"
                                            )}
                                        >
                                            {isAdding ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : status === "FRIEND" ? (
                                                "Friend"
                                            ) : status === "SENT" ? (
                                                "Requested"
                                            ) : status === "RECEIVED" ? (
                                                "Accept"
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
