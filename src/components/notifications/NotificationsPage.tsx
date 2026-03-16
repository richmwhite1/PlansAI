"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, CalendarDays, UserPlus, DollarSign, Zap } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow, isToday, isYesterday, isThisWeek } from "date-fns";
import { cn } from "@/lib/utils";

interface Notification {
    id: string;
    type: string;
    content: string;
    link?: string;
    isRead: boolean;
    createdAt: string;
}

interface Props {
    initialNotifications: Notification[];
    initialUnreadCount: number;
}

function NotifIcon({ type }: { type: string }) {
    const base = "w-4 h-4 shrink-0";
    if (type === "HANGOUT_INVITE" || type === "HANGOUT_UPDATE" || type === "HANGOUT_REMINDER")
        return <CalendarDays className={cn(base, "text-primary")} />;
    if (type === "FRIEND_REQUEST" || type === "FRIEND_ACCEPTED")
        return <UserPlus className={cn(base, "text-emerald-400")} />;
    if (type === "PAYMENT_RECEIVED" || type === "PAYMENT_CONFIRMED")
        return <DollarSign className={cn(base, "text-amber-400")} />;
    if (type === "SYSTEM")
        return <Zap className={cn(base, "text-primary")} />;
    return <Bell className={cn(base, "text-slate-400")} />;
}

function getGroup(dateStr: string): "today" | "yesterday" | "thisWeek" | "earlier" {
    const date = new Date(dateStr);
    if (isToday(date)) return "today";
    if (isYesterday(date)) return "yesterday";
    if (isThisWeek(date, { weekStartsOn: 1 })) return "thisWeek";
    return "earlier";
}

const GROUP_LABELS: Record<string, string> = {
    today: "Today",
    yesterday: "Yesterday",
    thisWeek: "This week",
    earlier: "Earlier",
};

const GROUP_ORDER = ["today", "yesterday", "thisWeek", "earlier"] as const;

export function NotificationsPage({ initialNotifications, initialUnreadCount }: Props) {
    const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
    const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

    const markAsRead = async (id: string) => {
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));

        try {
            await fetch("/api/notifications/read", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notificationId: id }),
            });
        } catch {}
    };

    const markAllRead = async () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);

        try {
            await fetch("/api/notifications/read", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ markAll: true }),
            });
        } catch {}
    };

    // Group notifications
    const groups: Record<string, Notification[]> = {
        today: [],
        yesterday: [],
        thisWeek: [],
        earlier: [],
    };
    for (const n of notifications) {
        groups[getGroup(n.createdAt)].push(n);
    }

    const hasAny = notifications.length > 0;

    return (
        <div className="min-h-screen pb-28">
            <div className="max-w-md mx-auto px-4 pt-6 space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-serif font-bold text-white">Notifications</h1>
                        {unreadCount > 0 ? (
                            <p className="text-sm text-slate-400 mt-1">
                                {unreadCount} unread
                            </p>
                        ) : (
                            <p className="text-sm text-slate-500 mt-1">All caught up</p>
                        )}
                    </div>
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllRead}
                            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors mt-1"
                        >
                            Mark all read
                        </button>
                    )}
                </div>

                {/* Empty state */}
                {!hasAny && (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                            <Bell className="w-8 h-8 text-slate-500" />
                        </div>
                        <p className="text-slate-400 font-medium">You&apos;re all caught up</p>
                        <p className="text-xs text-slate-600 text-center max-w-[220px]">
                            New notifications will appear here when you get invites, friend requests, and more.
                        </p>
                    </div>
                )}

                {/* Grouped notification list */}
                {GROUP_ORDER.map((group) => {
                    const items = groups[group];
                    if (!items.length) return null;
                    return (
                        <div key={group} className="space-y-1">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] px-1 mb-2">
                                {GROUP_LABELS[group]}
                            </p>
                            <div className="rounded-xl overflow-hidden border border-white/5 divide-y divide-white/5">
                                <AnimatePresence initial={false}>
                                    {items.map((n) => (
                                        <NotificationRow
                                            key={n.id}
                                            notification={n}
                                            onMarkRead={markAsRead}
                                        />
                                    ))}
                                </AnimatePresence>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function NotificationRow({
    notification: n,
    onMarkRead,
}: {
    notification: Notification;
    onMarkRead: (id: string) => void;
}) {
    const rowContent = (
        <motion.div
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: n.isRead ? 0.7 : 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
                "flex gap-3 items-start px-4 py-3 transition-colors",
                n.isRead ? "bg-transparent" : "bg-primary/5"
            )}
        >
            {/* Icon */}
            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/8 flex items-center justify-center shrink-0 mt-0.5">
                <NotifIcon type={n.type} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-0.5">
                <p className={cn(
                    "text-sm leading-snug",
                    n.isRead ? "text-slate-400" : "text-slate-200"
                )}>
                    {n.content}
                </p>
                <p className="text-[10px] text-slate-600">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </p>
            </div>

            {/* Unread dot */}
            {!n.isRead && (
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onMarkRead(n.id);
                    }}
                    className="self-start mt-1.5 p-1 text-primary hover:bg-primary/20 rounded-full shrink-0 transition-colors"
                    aria-label="Mark as read"
                >
                    <div className="w-2 h-2 rounded-full bg-primary" />
                </button>
            )}
        </motion.div>
    );

    if (n.link) {
        return (
            <Link href={n.link} className="block hover:bg-white/5 transition-colors" onClick={() => !n.isRead && onMarkRead(n.id)}>
                {rowContent}
            </Link>
        );
    }

    return rowContent;
}
