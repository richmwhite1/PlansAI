"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Message {
    id: string;
    content: string;
    createdAt: string;
    author: {
        id: string;
        name: string;
        avatar?: string;
    };
}

interface HangoutChatProps {
    hangoutId: string;
    currentUserId?: string;
}

export function HangoutChat({ hangoutId, currentUserId }: HangoutChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Fetch messages
    useEffect(() => {
        const fetchMessages = async () => {
            try {
                const res = await fetch(`/api/hangouts/${hangoutId}/messages`);
                if (res.ok) {
                    const data = await res.json();
                    setMessages(data.messages || []);
                }
            } catch (err) {
                console.error("Failed to fetch messages:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMessages();

        // Poll for new messages every 5 seconds
        const interval = setInterval(fetchMessages, 5000);
        return () => clearInterval(interval);
    }, [hangoutId]);

    // Scroll to bottom on new messages
    useEffect(() => {
        if (messagesEndRef.current) {
            // scrollTo({ top: ... }) is safer for container-only scrolling than scrollIntoView
            const container = messagesEndRef.current.parentElement;
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
        }
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || isSending) return;

        setIsSending(true);
        try {
            const res = await fetch(`/api/hangouts/${hangoutId}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: newMessage })
            });

            if (res.ok) {
                const data = await res.json();
                setMessages(prev => [...prev, data.message]);
                setNewMessage("");
            }
        } catch (err) {
            console.error("Failed to send message:", err);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="glass rounded-2xl border border-white/5 bg-slate-900/50 overflow-hidden">
            <div className="p-4 border-b border-white/5">
                <h2 className="text-lg font-semibold text-white">Chat</h2>
            </div>

            {/* Messages */}
            <div className="h-64 overflow-y-auto p-4 space-y-3">
                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
                    </div>
                ) : messages.length === 0 ? (
                    <p className="text-center text-slate-500 text-sm py-8">
                        No messages yet. Say hello!
                    </p>
                ) : (
                    messages.map(msg => {
                        const isOwn = msg.author.id === currentUserId;
                        return (
                            <div
                                key={msg.id}
                                className={cn(
                                    "flex gap-2",
                                    isOwn ? "flex-row-reverse" : ""
                                )}
                            >
                                <div className="w-7 h-7 rounded-full bg-slate-700 shrink-0 overflow-hidden">
                                    {msg.author.avatar && (
                                        <img src={msg.author.avatar} alt="" className="w-full h-full object-cover" />
                                    )}
                                </div>
                                <div className={cn(
                                    "max-w-[75%] space-y-1",
                                    isOwn ? "items-end" : ""
                                )}>
                                    <div className={cn(
                                        "px-3 py-2 rounded-2xl text-sm",
                                        isOwn
                                            ? "bg-violet-600 text-white rounded-br-sm"
                                            : "bg-white/10 text-slate-200 rounded-bl-sm"
                                    )}>
                                        {msg.content}
                                    </div>
                                    <p className={cn(
                                        "text-[10px] text-slate-500",
                                        isOwn ? "text-right" : ""
                                    )}>
                                        {isOwn ? "" : `${msg.author.name} · `}
                                        {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-3 border-t border-white/5">
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:border-violet-500/50 transition-colors"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || isSending}
                        className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
                    >
                        {isSending ? (
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                        ) : (
                            <Send className="w-4 h-4 text-white" />
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
