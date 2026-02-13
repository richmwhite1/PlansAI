"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useUser } from "@clerk/nextjs";

interface Message {
    id: string;
    content: string;
    senderId: string;
    createdAt: string;
    sender: { id: string; displayName: string | null; avatarUrl: string | null };
}

export default function ConversationPage() {
    const params = useParams();
    const conversationId = params.conversationId as string;
    const router = useRouter();
    const { user } = useUser();

    const [messages, setMessages] = useState<Message[]>([]);
    const [otherPerson, setOtherPerson] = useState<{ id: string; displayName: string | null; avatarUrl: string | null } | null>(null);
    const [isRequest, setIsRequest] = useState(false);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [myProfileId, setMyProfileId] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const fetchMessages = async () => {
        try {
            const res = await fetch(`/api/messages/${conversationId}`);
            if (res.ok) {
                const data = await res.json();
                setMessages(data.messages || []);
                setOtherPerson(data.otherPerson);
                setIsRequest(data.isRequest);

                // Determine own profile ID from a message we sent, or from otherPerson logic
                if (data.messages?.length > 0) {
                    const ourMsg = data.messages.find((m: Message) => m.sender.id !== data.otherPerson.id);
                    if (ourMsg) setMyProfileId(ourMsg.sender.id);
                }
            }
        } catch (err) {
            console.error("Failed to fetch messages");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 3000);
        return () => clearInterval(interval);
    }, [conversationId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = async () => {
        if (!newMessage.trim() || sending) return;

        const content = newMessage.trim();
        setNewMessage("");
        setSending(true);

        // Optimistic add
        const optimisticMsg: Message = {
            id: `temp-${Date.now()}`,
            content,
            senderId: myProfileId || "",
            createdAt: new Date().toISOString(),
            sender: { id: myProfileId || "", displayName: "You", avatarUrl: user?.imageUrl || null },
        };
        setMessages(prev => [...prev, optimisticMsg]);

        try {
            const res = await fetch(`/api/messages/${conversationId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content }),
            });

            if (res.ok) {
                const data = await res.json();
                setMessages(prev =>
                    prev.map(m => m.id === optimisticMsg.id ? data.message : m)
                );
                if (!myProfileId && data.message?.sender?.id) {
                    setMyProfileId(data.message.sender.id);
                }
            }
        } catch (err) {
            console.error("Failed to send message");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-background">
            {/* Chat Header */}
            <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center gap-3">
                <button
                    onClick={() => router.push("/messages")}
                    className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                {otherPerson && (
                    <div className="flex items-center gap-3">
                        {otherPerson.avatarUrl ? (
                            <img src={otherPerson.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                                {otherPerson.displayName?.[0]?.toUpperCase() || "?"}
                            </div>
                        )}
                        <div>
                            <h2 className="text-sm font-bold text-foreground">{otherPerson.displayName || "Unknown"}</h2>
                            {isRequest && (
                                <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">Message Request</span>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Request Banner */}
            {isRequest && messages.length > 0 && (
                <div className="px-4 py-3 bg-amber-500/10 border-b border-amber-500/20 text-center">
                    <p className="text-xs text-amber-400">
                        This person isn&apos;t in your friends list. Replying will accept their message request.
                    </p>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="text-center py-12 space-y-2">
                        <p className="text-muted-foreground text-sm">No messages yet</p>
                        <p className="text-muted-foreground/60 text-xs">Say hi to start the conversation!</p>
                    </div>
                ) : (
                    messages.map((msg, i) => {
                        const isMe = msg.senderId === myProfileId;
                        const showAvatar = !isMe && (i === 0 || messages[i - 1].senderId !== msg.senderId);

                        return (
                            <div key={msg.id} className={cn("flex gap-2", isMe ? "flex-row-reverse" : "flex-row")}>
                                {/* Avatar */}
                                <div className="w-7 shrink-0">
                                    {showAvatar && !isMe && (
                                        msg.sender.avatarUrl ? (
                                            <img src={msg.sender.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                                        ) : (
                                            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                                                {msg.sender.displayName?.[0]?.toUpperCase() || "?"}
                                            </div>
                                        )
                                    )}
                                </div>

                                {/* Bubble */}
                                <div className={cn(
                                    "max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed",
                                    isMe
                                        ? "bg-primary text-primary-foreground rounded-br-sm"
                                        : "bg-white/[0.07] text-foreground rounded-bl-sm"
                                )}>
                                    <p>{msg.content}</p>
                                    <p className={cn(
                                        "text-[9px] mt-1",
                                        isMe ? "text-primary-foreground/50" : "text-muted-foreground"
                                    )}>
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
            <div className="sticky bottom-0 z-40 bg-background/80 backdrop-blur-xl border-t border-white/5 p-3 pb-safe">
                <div className="flex items-center gap-2">
                    <input
                        ref={inputRef}
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2.5 bg-white/[0.06] border border-white/10 rounded-full text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!newMessage.trim() || sending}
                        className={cn(
                            "p-2.5 rounded-full transition-all",
                            newMessage.trim()
                                ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                                : "bg-white/5 text-muted-foreground"
                        )}
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
