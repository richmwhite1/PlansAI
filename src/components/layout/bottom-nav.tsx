"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Calendar, Sparkles, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
    const pathname = usePathname();

    const tabs = [
        {
            name: "Home",
            href: "/",
            icon: Sparkles,
            activeMatch: (path: string) => path === "/",
        },
        {
            name: "Discover",
            href: "/discover",
            icon: Compass,
            activeMatch: (path: string) => path.startsWith("/discover"),
        },
        {
            name: "Plans",
            href: "/hangouts",
            icon: Calendar,
            activeMatch: (path: string) => path.startsWith("/hangouts"),
        },
        {
            name: "Friends",
            href: "/friends",
            icon: Users,
            activeMatch: (path: string) => path.startsWith("/friends"),
        },
        {
            name: "Profile",
            href: "/profile",
            icon: User,
            activeMatch: (path: string) => path.startsWith("/profile"),
        },
    ];

    // Hide bottom nav on specific routes if needed (e.g. inside a specific flow), 
    // but for now we keep it visible to allow easy navigation.
    // We might want to hide it on the landing page if user is NOT signed in?
    // The user request implies this is for the "app" experience.
    // For now, render it always, authentication handling typically happens at page level or layout level.
    // Actually, if not signed in, they shouldn't see this?
    // Let's rely on the parent or useUser to decide, or just render it and let middleware handle redirects.

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-t border-white/5 pb-safe">
            <div className="flex justify-around items-center h-16">
                {tabs.map((tab) => {
                    const isActive = tab.activeMatch(pathname);
                    const Icon = tab.icon;

                    return (
                        <Link
                            key={tab.name}
                            href={tab.href}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
                                isActive
                                    ? "text-violet-400"
                                    : "text-slate-500 hover:text-slate-300"
                            )}
                        >
                            <div className={cn(
                                "p-1 rounded-full transition-all",
                                isActive && "bg-violet-500/10"
                            )}>
                                <Icon className={cn("w-5 h-5", isActive && "fill-current")} />
                            </div>
                            <span className="text-[10px] font-medium">{tab.name}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
