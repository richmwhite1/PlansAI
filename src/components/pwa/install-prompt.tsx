"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Compass } from "lucide-react";

export function InstallPrompt() {
    const [showEngagementPrompt, setShowEngagementPrompt] = useState(false);
    const [showInstallGuide, setShowInstallGuide] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isInAppBrowser, setIsInAppBrowser] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // Run only on client
        if (typeof window === "undefined") return;

        // Check platform and browser context
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIpadOS = window.navigator.maxTouchPoints > 2 && /macintosh/.test(userAgent);
        const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) || isIpadOS;
        setIsIOS(isIOSDevice);

        // Simple heuristic for common in-app browsers on iOS (Instagram, FB, Messenger, TikTok, etc.)
        const isSocialInApp = /instagram|fbav|fban|messenger|tiktok|snapchat|pinterest/i.test(userAgent);
        setIsInAppBrowser(isSocialInApp);

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

    const handleGotItClick = () => {
        if (isIOS && isInAppBrowser) {
            // Try to force trigger safari deep link if possible, though highly restricted.
            // Normally users must tap the specific icon in the app header (e.g. compass in Instagram).
            // Since we can't force them out programmatically in most cases, we alert them:
            alert("To install Plans, please tap the browser icon (compass or three dots) in the corner of your screen to open this page in Safari first.");
            return;
        }
        handleCloseGuide();
    };

    // If installed, display nothing
    if (isStandalone) return null;

    return (
        <AnimatePresence>
            {/* 10-Minute Engagement Prompt */}
            {showEngagementPrompt && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                >
                    <motion.div
                        initial={{ scale: 0.95, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, y: 20 }}
                        className="bg-zinc-950 border border-white/10 w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl relative max-h-[90vh] flex flex-col"
                    >
                        <button
                            onClick={handleDeclinePush}
                            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white transition-colors z-10"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="relative h-32 bg-gradient-to-br from-primary/20 via-amber-500/10 to-transparent flex flex-col items-center justify-center flex-shrink-0">
                            <div className="w-16 h-16 bg-gradient-to-br from-primary to-amber-300 rounded-[1rem] flex items-center justify-center shadow-lg shadow-primary/30 mt-4">
                                <Bell className="w-8 h-8 text-black" />
                            </div>
                        </div>

                        <div className="p-6 md:p-8 space-y-6 pt-6 overflow-y-auto">
                            <div className="text-center space-y-2">
                                <h3 className="text-2xl font-serif font-bold text-white">
                                    Never miss a plan
                                </h3>
                                <p className="text-sm text-slate-400">
                                    Get push notifications when your friends vote, RSVP, or decide on an activity.
                                </p>
                            </div>

                            <button
                                onClick={handleAcceptPush}
                                className="w-full py-4 rounded-xl font-bold bg-white text-black hover:bg-slate-200 transition-colors text-lg"
                            >
                                Turn on Notifications
                            </button>
                            <button
                                onClick={handleDeclinePush}
                                className="w-full py-4 rounded-xl font-semibold bg-white/5 text-white hover:bg-white/10 transition-colors text-lg"
                            >
                                Not right now
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}

            {/* Install Guide Modal */}
            {showInstallGuide && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                >
                    <motion.div
                        initial={{ scale: 0.95, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, y: 20 }}
                        className="bg-zinc-950 border border-white/10 w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl relative max-h-[90vh] flex flex-col"
                    >
                        <button
                            onClick={handleCloseGuide}
                            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white transition-colors z-10"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="relative h-32 bg-gradient-to-br from-primary/20 via-amber-500/10 to-transparent flex flex-col items-center justify-center flex-shrink-0">
                            {/* Native-looking Icon simulation */}
                            <div className="w-16 h-16 rounded-[1rem] bg-gradient-to-br from-primary to-amber-300 flex items-center justify-center shadow-lg shadow-primary/30 mt-4">
                                <span className="font-serif font-bold text-black text-[2rem] italic leading-none pt-1 pr-0.5">P</span>
                            </div>
                        </div>

                        <div className="p-6 md:p-8 space-y-6 pt-4 overflow-y-auto">
                            <div className="text-center space-y-2 pb-2">
                                <h3 className="text-2xl font-serif font-bold text-white">
                                    {isIOS ? "Install on iPhone" : "Install on Android"}
                                </h3>
                                <p className="text-sm text-slate-400">
                                    Add Plans to your home screen for a faster, app-like experience.
                                </p>
                            </div>

                            {isIOS ? (
                                isInAppBrowser ? (
                                    <div className="space-y-4 bg-rose-500/10 border border-rose-500/20 p-5 rounded-2xl text-center">
                                        <Compass className="w-10 h-10 text-rose-400 mx-auto mb-2" />
                                        <p className="text-sm text-white font-medium">You are using an in-app browser.</p>
                                        <p className="text-xs text-rose-200">
                                            To install Plans, you must first open this page in Safari. Tap the browser/compass icon in the corner of your screen.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="bg-white/5 border border-white/5 p-4 rounded-2xl space-y-3">
                                            <div className="flex items-start gap-4">
                                                <div className="w-6 h-6 flex-shrink-0 bg-white/10 rounded-full flex items-center justify-center text-xs mt-0.5 font-bold">1</div>
                                                <div className="space-y-2">
                                                    <p className="text-sm text-slate-300">Tap the <strong>Share</strong> icon below in Safari.</p>
                                                    <img src="/ios-step1.png" alt="Safari Share Icon" className="rounded-lg shadow-md border border-white/10 w-full object-cover" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-white/5 border border-white/5 p-4 rounded-2xl space-y-3">
                                            <div className="flex items-start gap-4">
                                                <div className="w-6 h-6 flex-shrink-0 bg-white/10 rounded-full flex items-center justify-center text-xs mt-0.5 font-bold">2</div>
                                                <div className="space-y-2">
                                                    <p className="text-sm text-slate-300">Scroll down the menu and tap <strong>Add to Home Screen</strong>.</p>
                                                    <img src="/ios-step2.png" alt="Add to Home Screen" className="rounded-lg shadow-md border border-white/10 w-full object-cover" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-white/5 border border-white/5 p-4 rounded-2xl space-y-3">
                                            <div className="flex items-start gap-4">
                                                <div className="w-6 h-6 flex-shrink-0 bg-white/10 rounded-full flex items-center justify-center text-xs mt-0.5 font-bold">3</div>
                                                <div className="space-y-2">
                                                    <p className="text-sm text-slate-300">Confirm by tapping <strong>Add</strong> in the top right.</p>
                                                    <img src="/ios-step3.png" alt="Confirm Add" className="rounded-lg shadow-md border border-white/10 w-full object-cover" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            ) : (
                                <div className="space-y-4">
                                    <div className="bg-white/5 border border-white/5 p-5 rounded-2xl space-y-4">
                                        <div className="flex items-start gap-4">
                                            <div className="w-6 h-6 flex-shrink-0 bg-white/10 rounded-full flex items-center justify-center text-xs mt-0.5 font-bold">1</div>
                                            <p className="text-sm text-slate-300">Tap the <strong>Install App</strong> button if it appears in your browser's address bar.</p>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <div className="w-6 h-6 flex-shrink-0 bg-white/10 rounded-full flex items-center justify-center text-xs mt-0.5 font-bold">2</div>
                                            <p className="text-sm text-slate-300">Or, tap the <strong>three dots (Menu)</strong> in the top right and select <strong>Install App</strong> or <strong>Add to Home Screen</strong>.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleGotItClick}
                                className="w-full py-4 rounded-xl font-bold bg-white text-black hover:bg-slate-200 transition-colors text-lg"
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
