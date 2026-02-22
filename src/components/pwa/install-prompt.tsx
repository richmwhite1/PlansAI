"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Download, Share, PlusSquare } from "lucide-react";

export function InstallPrompt() {
    const [showEngagementPrompt, setShowEngagementPrompt] = useState(false);
    const [showInstallGuide, setShowInstallGuide] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // Run only on client
        if (typeof window === "undefined") return;

        // Check platform
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIpadOS = window.navigator.maxTouchPoints > 2 && /macintosh/.test(userAgent);
        const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) || isIpadOS;
        setIsIOS(isIOSDevice);

        // Check if already installed
        const isAppStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
        setIsStandalone(isAppStandalone);

        if (isAppStandalone) return;

        // Check tracking logic
        const checkTimer = () => {
            const hasSeenPrompt = localStorage.getItem("plans_has_seen_engagement_prompt");
            if (hasSeenPrompt === "true") return;

            let timeSpent = parseInt(localStorage.getItem("plans_time_spent") || "0", 10);
            const lastUpdated = parseInt(localStorage.getItem("plans_last_updated") || Date.now().toString(), 10);

            // Add time if it was updated recently (prevent jumping time when inactive)
            const now = Date.now();
            const elapsed = now - lastUpdated;

            // Only add time if the app was recently active (less than 1 minute gap is considered active)
            if (elapsed < 60000) {
                timeSpent += elapsed;
            }

            localStorage.setItem("plans_time_spent", timeSpent.toString());
            localStorage.setItem("plans_last_updated", now.toString());

            // 10 minutes = 10 * 60 * 1000 = 600000 ms
            if (timeSpent >= 600000 && !showEngagementPrompt) {
                setShowEngagementPrompt(true);
            }
        };

        // Initialize last_updated if not present
        if (!localStorage.getItem("plans_last_updated")) {
            localStorage.setItem("plans_last_updated", Date.now().toString());
        }

        const interval = setInterval(checkTimer, 5000);

        // Handle visibility change to pause timer when backgrounded
        const handleVisibilityChange = () => {
            if (document.hidden) {
                // Ignore time spent while hidden
            } else {
                localStorage.setItem("plans_last_updated", Date.now().toString());
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);

        // Also expose a manual trigger on window for the explicit buttons
        (window as any).triggerInstallPrompt = () => {
            if (isAppStandalone) {
                alert("You are already using the Plans app!");
                return;
            }
            setShowInstallGuide(true);
        };

        return () => {
            clearInterval(interval);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, []);

    const handleAcceptPush = async () => {
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                // Let the existing service worker logic handle push subscription elsewhere if needed
            }
        } catch (error) {
            console.error(error);
        }
        setShowEngagementPrompt(false);
        localStorage.setItem("plans_has_seen_engagement_prompt", "true");

        // Follow up with install prompt
        setTimeout(() => setShowInstallGuide(true), 500);
    };

    const handleDeclinePush = () => {
        setShowEngagementPrompt(false);
        localStorage.setItem("plans_has_seen_engagement_prompt", "true");
    };

    const handleCloseGuide = () => {
        setShowInstallGuide(false);
    };

    // If installed, display nothing
    if (isStandalone) return null;

    return (
        <AnimatePresence>
            {/* 10-Minute Engagement Prompt */}
            {showEngagementPrompt && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 50, scale: 0.95 }}
                    className="fixed bottom-20 left-4 right-4 md:left-auto md:right-8 md:bottom-24 md:w-96 bg-zinc-900 border border-white/10 p-6 rounded-3xl shadow-2xl z-50 overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />

                    <button
                        onClick={handleDeclinePush}
                        className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="relative space-y-4">
                        <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center">
                            <Bell className="w-6 h-6 text-primary" />
                        </div>

                        <div>
                            <h3 className="text-xl font-serif font-bold text-white mb-2">
                                Never miss a plan
                            </h3>
                            <p className="text-sm text-slate-300">
                                Get push notifications when your friends vote, RSVP, or decide on an activity.
                            </p>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={handleDeclinePush}
                                className="flex-1 py-3 px-4 font-semibold text-sm rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                            >
                                Not now
                            </button>
                            <button
                                onClick={handleAcceptPush}
                                className="flex-1 py-3 px-4 font-bold text-sm rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all"
                            >
                                Turn on
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Install Guide Modal */}
            {showInstallGuide && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                >
                    <motion.div
                        initial={{ scale: 0.95, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, y: 20 }}
                        className="bg-zinc-950 border border-white/10 w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl"
                    >
                        <div className="relative h-48 bg-gradient-to-br from-primary/20 via-amber-500/10 to-transparent flex items-center justify-center">
                            <button
                                onClick={handleCloseGuide}
                                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            <div className="relative">
                                {/* Native-looking Icon simulation */}
                                <div className="w-24 h-24 rounded-[1.4rem] bg-gradient-to-br from-primary to-amber-300 flex items-center justify-center shadow-lg shadow-primary/30">
                                    <span className="font-serif font-bold text-black text-[3rem] italic leading-none pt-2 pr-1">P</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 md:p-8 space-y-6">
                            <div className="text-center space-y-2">
                                <h3 className="text-2xl font-serif font-bold text-white">
                                    Install Plans
                                </h3>
                                <p className="text-sm text-slate-400">
                                    Add Plans to your home screen for a faster, app-like experience.
                                </p>
                            </div>

                            {isIOS ? (
                                <div className="space-y-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                                    <div className="flex gap-4 items-center text-sm text-slate-300">
                                        <div className="w-8 h-8 flex-shrink-0 bg-white/10 rounded-full flex items-center justify-center">
                                            1
                                        </div>
                                        <p>Tap the <Share className="w-5 h-5 inline mx-1 text-blue-400" /> icon below in Safari.</p>
                                    </div>
                                    <div className="flex gap-4 items-center text-sm text-slate-300">
                                        <div className="w-8 h-8 flex-shrink-0 bg-white/10 rounded-full flex items-center justify-center">
                                            2
                                        </div>
                                        <p>Scroll down and tap <strong>Add to Home Screen</strong> <PlusSquare className="w-4 h-4 inline mx-1 text-white border-2 border-slate-300 rounded-[4px]" />.</p>
                                    </div>
                                    <div className="flex gap-4 items-center text-sm text-slate-300">
                                        <div className="w-8 h-8 flex-shrink-0 bg-white/10 rounded-full flex items-center justify-center">
                                            3
                                        </div>
                                        <p>Confirm by tapping <strong>Add</strong> in the top right.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4 text-center">
                                    <p className="text-sm text-slate-300 bg-white/5 p-4 rounded-2xl border border-white/5">
                                        Tap the install button in your browser's address bar, or open the browser menu and select <strong>Install App</strong>.
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={handleCloseGuide}
                                className="w-full py-4 rounded-xl font-bold bg-white text-black hover:bg-slate-200 transition-colors"
                            >
                                Got it
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
