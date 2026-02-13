"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Search, UserPlus, Loader2, Send } from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// Start simple with custom overlay if Dialog isn't available or easy to verify
// Actually, let's build a custom modal to match the glassmorphism style perfectly and avoid dependency guessing.

interface NewMessageModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function NewMessageModal({ isOpen, onClose }: NewMessageModalProps) {
    const [friends, setFriends] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [startingChat, setStartingChat] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            fetch(`/api/friends?t=${Date.now()}`)
                .then(res => res.json())
                .then(data => {
                    setFriends(data.friends || []);
                })
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [isOpen]);

    const filteredFriends = friends.filter(f =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const startChat = async (friendId: string) => {
        if (startingChat) return;
        setStartingChat(friendId);
        try {
            const res = await fetch("/api/messages/conversations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ profileId: friendId })
            });
            if (res.ok) {
                const data = await res.json();
                router.push(`/messages/${data.conversation.id}`);
                onClose();
            }
        } catch (error) {
            console.error("Failed to start chat", error);
        } finally {
            setStartingChat(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
                {/* Header */}
                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <h2 className="font-serif font-bold text-lg">New Message</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-white/5">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search friends..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-900 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                            autoFocus
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 text-primary animate-spin" />
                        </div>
                    ) : filteredFriends.length > 0 ? (
                        filteredFriends.map(friend => (
                            <button
                                key={friend.id}
                                onClick={() => startChat(friend.id)}
                                disabled={!!startingChat}
                                className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-colors text-left group"
                            >
                                <div className="relative">
                                    <img
                                        src={friend.avatar}
                                        alt={friend.name}
                                        className="w-10 h-10 rounded-full bg-slate-800 object-cover"
                                    />
                                    {startingChat === friend.id && (
                                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                                            <Loader2 className="w-4 h-4 text-white animate-spin" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-slate-200 group-hover:text-white truncate">
                                        {friend.name}
                                    </p>
                                    <p className="text-xs text-slate-500 truncate">
                                        Tap to chat
                                    </p>
                                </div>
                                <Send className="w-4 h-4 text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                            </button>
                        ))
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                                <UserPlus className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <p className="font-medium text-foreground">No friends found</p>
                            <p className="text-xs mt-1 opacity-70 max-w-[200px] mx-auto mb-4">
                                You need to add friends before you can message them.
                            </p>
                            <button
                                onClick={() => {
                                    onClose();
                                    router.push("/friends");
                                }}
                                className="text-xs font-bold bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                            >
                                Find Friends
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
