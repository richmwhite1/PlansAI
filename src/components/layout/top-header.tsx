"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, MessageCircle, Loader2, Check, LogOut, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, SignInButton, useClerk } from "@clerk/nextjs";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Notification {
    id: string;
    type: string;
    content: string;
    link?: string;
    isRead: boolean;
    createdAt: string;
}

export function TopHeader() {
    const pathname = usePathname();
    const { isSignedIn, isLoaded } = useUser();

    // Don't show on auth pages or individual messages
    if (pathname?.startsWith("/sign-in") || pathname?.startsWith("/sign-up") || (pathname?.startsWith("/messages/") && pathname !== "/messages")) {
        return null;
    }

    // Hide header on the landing page for unauthenticated users (landing has its own CTA)
    if (isLoaded && !isSignedIn && pathname === "/") {
        return null;
    }

    return (
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/5">
            <div className="flex items-center justify-between px-4 h-12">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2">
                    <span className="text-2xl font-serif font-bold bg-gradient-to-r from-primary to-amber-300 bg-clip-text text-transparent pb-1">
                        Plans
                    </span>
                </Link>

                {/* Actions — Auth-aware */}
                {isSignedIn ? (
                    <div className="flex items-center gap-1">
                        <MessagesBadge />
                        <NotificationsDropdown />
                        <UserMenu />
                    </div>
                ) : (
                    <SignInButton mode="modal">
                        <button className="text-sm font-medium text-slate-300 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5">
                            Sign In
                        </button>
                    </SignInButton>
                )}
            </div>
        </header>
    );
}

// ──────────────────────────────────────────────────────────
// Messages Badge — just links to /messages with unread dot
// ──────────────────────────────────────────────────────────
function MessagesBadge() {
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const fetchUnread = async () => {
            try {
                const res = await fetch("/api/messages/unread");
                if (res.ok) {
                    const data = await res.json();
                    setUnreadCount(data.unreadCount || 0);
                }
            } catch { }
        };

        fetchUnread();
        const interval = setInterval(fetchUnread, 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <Link
            href="/messages"
            className="relative p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
        >
            <MessageCircle className="w-5 h-5" />
            {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[10px] h-2.5 bg-primary rounded-full border-2 border-background" />
            )}
        </Link>
    );
}

// ──────────────────────────────────────────────────────────
// Notifications Dropdown — inline bell with full dropdown
// ──────────────────────────────────────────────────────────
function NotificationsDropdown() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = async () => {
        try {
            const res = await fetch("/api/notifications");
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications || []);
                setUnreadCount(data.unreadCount || 0);
            }
        } catch { }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 10000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const markAsRead = async (id: string, link?: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
        if (link) setIsOpen(false);

        try {
            await fetch("/api/notifications/read", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notificationId: id }),
            });
        } catch { }
    };

    const markAllRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);

        try {
            await fetch("/api/notifications/read", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ markAll: true }),
            });
        } catch { }
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-background" />
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-80 bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 origin-top-right"
                    >
                        <div className="p-3 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-white">Notifications</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllRead}
                                    className="text-xs text-primary hover:text-primary/80 transition-colors"
                                >
                                    Mark all read
                                </button>
                            )}
                        </div>

                        <div className="max-h-80 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-slate-500 text-sm">
                                    No notifications yet
                                </div>
                            ) : (
                                notifications.map(n => (
                                    <div
                                        key={n.id}
                                        className={cn(
                                            "block p-3 border-b border-white/5 last:border-0 transition-colors",
                                            n.isRead ? "bg-transparent opacity-60 hover:opacity-100" : "bg-primary/5 hover:bg-primary/10"
                                        )}
                                    >
                                        <div className="flex gap-3">
                                            <div className="flex-1 space-y-1">
                                                {n.link ? (
                                                    <Link
                                                        href={n.link}
                                                        onClick={() => markAsRead(n.id, n.link)}
                                                        className="text-sm text-slate-200 hover:text-primary block"
                                                    >
                                                        {n.content}
                                                    </Link>
                                                ) : (
                                                    <p className="text-sm text-slate-200">{n.content}</p>
                                                )}
                                                <p className="text-[10px] text-slate-500">
                                                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                                                </p>
                                            </div>
                                            {!n.isRead && (
                                                <button
                                                    onClick={() => markAsRead(n.id)}
                                                    className="self-center p-1 text-primary hover:bg-primary/20 rounded-full"
                                                >
                                                    <div className="w-2 h-2 rounded-full bg-primary" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ──────────────────────────────────────────────────────────
// User Menu — Profile icon with sign out
// ──────────────────────────────────────────────────────────
function UserMenu() {
    const { user } = useUser();
    const { signOut } = useClerk();
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!user) return null;

    return (
        <div className="relative" ref={wrapperRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-center p-1 rounded-full hover:bg-white/10 transition-colors"
            >
                <Avatar className="w-7 h-7 border border-white/10">
                    <AvatarImage src={user.imageUrl} />
                    <AvatarFallback className="text-[10px] bg-slate-800 text-slate-400">
                        {user.firstName?.charAt(0) || user.username?.charAt(0) || "?"}
                    </AvatarFallback>
                </Avatar>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.1 }}
                        className="absolute right-0 mt-2 w-48 bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 origin-top-right"
                    >
                        <div className="p-3 border-b border-white/5">
                            <p className="text-xs font-semibold text-white truncate">
                                {user.fullName || user.username || "User"}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate">
                                {user.primaryEmailAddress?.emailAddress}
                            </p>
                        </div>

                        <div className="p-1">
                            <Link
                                href="/profile"
                                onClick={() => setIsOpen(false)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                            >
                                <User className="w-4 h-4" />
                                Your Profile
                            </Link>
                            <button
                                onClick={() => signOut({ redirectUrl: "/" })}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                Sign Out
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
