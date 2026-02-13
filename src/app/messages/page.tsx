"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Search, ArrowLeft, Inbox, Plus } from "lucide-react";
import { NewMessageModal } from "@/components/messages/NewMessageModal";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface ConversationPreview {
    id: string;
    otherPerson: { id: string; displayName: string | null; avatarUrl: string | null };
    isRequest: boolean;
    lastMessage: { content: string; sender: { displayName: string | null }; createdAt: string } | null;
    lastMessageAt: string;
    unreadCount: number;
}

export default function MessagesPage() {
    const [conversations, setConversations] = useState<ConversationPreview[]>([]);
    const [requests, setRequests] = useState<ConversationPreview[]>([]);
    const [activeTab, setActiveTab] = useState<"messages" | "requests">("messages");
    const [loading, setLoading] = useState(true);
    const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        fetchConversations();
        const interval = setInterval(fetchConversations, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchConversations = async () => {
        try {
            const res = await fetch("/api/messages/conversations");
            if (res.ok) {
                const data = await res.json();
                setConversations(data.conversations || []);
                setRequests(data.requests || []);
            }
        } catch (err) {
            console.error("Failed to fetch conversations");
        } finally {
            setLoading(false);
        }
    };

    const list = activeTab === "messages" ? conversations : requests;

    return (
        <div className="min-h-screen bg-background pb-24">
            <NewMessageModal isOpen={isNewMessageOpen} onClose={() => setIsNewMessageOpen(false)} />

            {/* Header & Tabs */}
            <div className="bg-background/80 backdrop-blur-xl border-b border-white/5 pt-4 sticky top-0 z-30">
                <div className="px-4 pb-3 flex justify-between items-center">
                    <h1 className="text-xl font-serif font-bold">Messages</h1>
                    <button
                        onClick={() => setIsNewMessageOpen(true)}
                        className="p-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-full transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex px-4 gap-1">
                    <button
                        onClick={() => setActiveTab("messages")}
                        className={cn(
                            "flex-1 py-2.5 text-sm font-semibold rounded-t-lg transition-colors relative",
                            activeTab === "messages"
                                ? "text-primary"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Messages
                        {conversations.some(c => c.unreadCount > 0) && (
                            <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                                {conversations.reduce((sum, c) => sum + c.unreadCount, 0)}
                            </span>
                        )}
                        {activeTab === "messages" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
                    </button>
                    <button
                        onClick={() => setActiveTab("requests")}
                        className={cn(
                            "flex-1 py-2.5 text-sm font-semibold rounded-t-lg transition-colors relative",
                            activeTab === "requests"
                                ? "text-primary"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Requests
                        {requests.length > 0 && (
                            <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-[10px] font-bold text-black">
                                {requests.length}
                            </span>
                        )}
                        {activeTab === "requests" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="divide-y divide-white/5">
                {loading ? (
                    <div className="p-12 text-center">
                        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
                    </div>
                ) : list.length === 0 ? (
                    <div className="p-12 text-center space-y-3">
                        {activeTab === "messages" ? (
                            <>
                                <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground/40" />
                                <p className="text-muted-foreground text-sm">No messages yet</p>
                                <p className="text-muted-foreground/60 text-xs">Start a conversation from a friend&apos;s profile</p>
                            </>
                        ) : (
                            <>
                                <Inbox className="w-12 h-12 mx-auto text-muted-foreground/40" />
                                <p className="text-muted-foreground text-sm">No message requests</p>
                            </>
                        )}
                    </div>
                ) : (
                    list.map((conv) => (
                        <button
                            key={conv.id}
                            onClick={() => router.push(`/messages/${conv.id}`)}
                            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors text-left"
                        >
                            {/* Avatar */}
                            <div className="relative shrink-0">
                                {conv.otherPerson.avatarUrl ? (
                                    <img src={conv.otherPerson.avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover" />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                                        {conv.otherPerson.displayName?.[0]?.toUpperCase() || "?"}
                                    </div>
                                )}
                                {conv.unreadCount > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full border-2 border-background" />
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <span className={cn(
                                        "text-sm truncate",
                                        conv.unreadCount > 0 ? "font-bold text-foreground" : "font-medium text-foreground/80"
                                    )}>
                                        {conv.otherPerson.displayName || "Unknown"}
                                    </span>
                                    {conv.lastMessage && (
                                        <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                                            {formatDistanceToNow(new Date(conv.lastMessage.createdAt), { addSuffix: true })}
                                        </span>
                                    )}
                                </div>
                                {conv.lastMessage && (
                                    <p className={cn(
                                        "text-xs truncate mt-0.5",
                                        conv.unreadCount > 0 ? "text-foreground/70" : "text-muted-foreground"
                                    )}>
                                        {conv.lastMessage.content}
                                    </p>
                                )}
                            </div>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}
