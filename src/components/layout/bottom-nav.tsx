"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Compass, Calendar, Users, User, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { toast } from "sonner";

const DashboardEngine = dynamic(
    () => import("@/components/dashboard/dashboard-engine").then((m) => m.DashboardEngine),
    { ssr: false }
);

export function BottomNav() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { isSignedIn, isLoaded } = useUser();
    const [showCreate, setShowCreate] = useState(false);
    const [preselectedFriend, setPreselectedFriend] = useState<{ id: string; name: string; avatar: string } | null>(null);

    // Auto-open create sheet when arriving via ?with= deep link
    useEffect(() => {
        const withId = searchParams?.get("with");
        const wname = searchParams?.get("wname");
        const wavatar = searchParams?.get("wavatar");
        if (withId && isSignedIn) {
            setPreselectedFriend({ id: withId, name: decodeURIComponent(wname ?? ""), avatar: decodeURIComponent(wavatar ?? "") });
            setShowCreate(true);
            // Clean up URL without re-render
            const url = new URL(window.location.href);
            url.searchParams.delete("with");
            url.searchParams.delete("wname");
            url.searchParams.delete("wavatar");
            router.replace(url.pathname + (url.search || ""));
        }
    }, [searchParams, isSignedIn]);

    // Hide bottom nav for unauthenticated users
    if (!isLoaded || !isSignedIn) return null;

    const leftTabs = [
        {
            name: "Plans",
            href: "/",
            icon: Calendar,
            activeMatch: (path: string) => path === "/" || path.startsWith("/hangouts"),
        },
        {
            name: "Discover",
            href: "/discover",
            icon: Compass,
            activeMatch: (path: string) => path.startsWith("/discover"),
        },
    ];

    const rightTabs = [
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

    return (
        <>
            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-xl border-t border-white/5 pb-safe">
                <div className="flex items-center h-16 max-w-md mx-auto px-2">
                    {/* Left tabs */}
                    {leftTabs.map((tab) => {
                        const isActive = tab.activeMatch(pathname);
                        const Icon = tab.icon;
                        return (
                            <Link
                                key={tab.name}
                                href={tab.href}
                                className={cn(
                                    "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
                                    isActive
                                        ? "text-primary"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <div className={cn(
                                    "p-1 rounded-full transition-all",
                                    isActive && "bg-primary/10"
                                )}>
                                    <Icon className={cn("w-5 h-5", isActive && "fill-current")} />
                                </div>
                                <span className="text-[10px] font-medium">{tab.name}</span>
                            </Link>
                        );
                    })}

                    {/* Center create button */}
                    <div className="flex flex-col items-center justify-center flex-1 h-full -mt-4">
                        <button
                            onClick={() => setShowCreate(true)}
                            className="w-14 h-14 rounded-full bg-primary shadow-lg shadow-primary/30 flex items-center justify-center text-black transition-transform active:scale-95 hover:scale-105"
                            aria-label="Create plan"
                        >
                            <Plus className="w-7 h-7" strokeWidth={2.5} />
                        </button>
                    </div>

                    {/* Right tabs */}
                    {rightTabs.map((tab) => {
                        const isActive = tab.activeMatch(pathname);
                        const Icon = tab.icon;
                        return (
                            <Link
                                key={tab.name}
                                href={tab.href}
                                className={cn(
                                    "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
                                    isActive
                                        ? "text-primary"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <div className={cn(
                                    "p-1 rounded-full transition-all",
                                    isActive && "bg-primary/10"
                                )}>
                                    <Icon className={cn("w-5 h-5", isActive && "fill-current")} />
                                </div>
                                <span className="text-[10px] font-medium">{tab.name}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* Create plan bottom sheet — global, works from any page */}
            <AnimatePresence>
                {showCreate && (
                    <>
                        <motion.div
                            key="backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                            onClick={() => { setShowCreate(false); setPreselectedFriend(null); }}
                        />
                        <motion.div
                            key="sheet"
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 28, stiffness: 300 }}
                            className="fixed bottom-0 left-0 right-0 z-50 bg-[#0D0D0D] border-t border-white/8 rounded-t-3xl max-h-[92vh] overflow-y-auto"
                        >
                            <div className="sticky top-0 flex items-center justify-between px-6 py-4 bg-[#0D0D0D] border-b border-white/5 z-10">
                                <h2 className="text-lg font-serif font-bold text-white">New Plan</h2>
                                <button
                                    onClick={() => { setShowCreate(false); setPreselectedFriend(null); }}
                                    className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                                >
                                    <X className="w-4 h-4 text-white/60" />
                                </button>
                            </div>
                            <div className="p-4 pb-10">
                                <DashboardEngine
                                    onCreated={() => {
                                        setShowCreate(false);
                                        setPreselectedFriend(null);
                                        toast.success("Plan created! 🎉", {
                                            description: "Share the link with friends to invite them.",
                                            duration: 4000,
                                        });
                                    }}
                                    initialFriend={preselectedFriend ?? undefined}
                                />
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
