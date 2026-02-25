"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Compass, Copy, Check } from "lucide-react";

export function InstallPrompt() {
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [promptStep, setPromptStep] = useState<"INITIAL" | "GUIDE">("INITIAL");
  const [selectedOS, setSelectedOS] = useState<"ios" | "android" | null>(null);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Run only on client
    if (typeof window === "undefined") return;

    // Check platform and browser context
    const userAgent = window.navigator.userAgent.toLowerCase();

    // Simple heuristic for common in-app browsers
    const isSocialInApp =
      /instagram|fbav|fban|messenger|tiktok|snapchat|pinterest/i.test(
        userAgent,
      );
    setIsInAppBrowser(isSocialInApp);

    // Check if already installed
    const isAppStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isAppStandalone);

    if (isAppStandalone) return;

    // Initialize last_updated if not present
    if (!localStorage.getItem("plans_last_updated")) {
      localStorage.setItem("plans_last_updated", Date.now().toString());
    }

    const checkTimer = () => {
      const isInstalled =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      if (isInstalled) return;

      let count = parseInt(
        localStorage.getItem("plans_install_prompt_count") || "0",
        10,
      );
      if (count >= 3) return;

      const now = Date.now();

      if (document.getElementById("install-guide-modal")) {
        localStorage.setItem("plans_last_updated", now.toString());
        return;
      }

      let timeSpent = parseInt(
        localStorage.getItem("plans_time_spent") || "0",
        10,
      );
      const lastUpdated = parseInt(
        localStorage.getItem("plans_last_updated") || now.toString(),
        10,
      );

      const elapsed = now - lastUpdated;

      // Only add time if the app was recently active (less than 1 minute gap)
      if (elapsed < 60000) {
        timeSpent += elapsed;
      }

      localStorage.setItem("plans_time_spent", timeSpent.toString());
      localStorage.setItem("plans_last_updated", now.toString());

      // Target timings: 10 mins (600,000ms), 40 mins (2,400,000ms), 70 mins (4,200,000ms)
      const targetTime = (10 + count * 30) * 60000;

      if (timeSpent >= targetTime) {
        setShowInstallGuide(true);
        setPromptStep("INITIAL");
        localStorage.setItem(
          "plans_install_prompt_count",
          (count + 1).toString(),
        );
      }
    };

    const interval = setInterval(checkTimer, 5000);

    // Handle visibility change to pause timer when backgrounded
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        localStorage.setItem("plans_last_updated", Date.now().toString());
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Allow manual trigger from the header
    (window as any).triggerInstallPrompt = () => {
      if (isAppStandalone) {
        alert("You are already using the Plans app!");
        return;
      }
      setShowInstallGuide(true);
      setPromptStep("INITIAL");
    };

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const handleCloseGuide = () => {
    setShowInstallGuide(false);
    // Reset state after close so next open is fresh
    setTimeout(() => {
      setPromptStep("INITIAL");
      setSelectedOS(null);
    }, 500);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.host);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGotItClick = () => {
    if (selectedOS === "ios" && isInAppBrowser) {
      alert(
        "To install Plans, please tap the browser icon (compass or three dots) in the corner of your screen to open this page in Safari first.",
      );
      return;
    }
    handleCloseGuide();
  };

  // If installed, display nothing
  if (isStandalone) return null;

  return (
    <AnimatePresence>
      {/* Install Guide Modal */}
      {showInstallGuide && (
        <motion.div
          id="install-guide-modal"
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
              <div className="w-16 h-16 rounded-[1rem] bg-gradient-to-br from-primary to-amber-300 flex items-center justify-center shadow-lg shadow-primary/30 mt-4">
                <span className="font-serif font-bold text-black text-[2rem] italic leading-none pt-1 pr-0.5">
                  P
                </span>
              </div>
            </div>

            <div className="p-6 md:p-8 space-y-6 pt-4 overflow-y-auto">
              {promptStep === "INITIAL" ? (
                <>
                  <div className="text-center space-y-2 pb-6">
                    <h3 className="text-2xl font-serif font-bold text-white leading-tight">
                      Do you want notifications?
                    </h3>
                    <p className="text-sm text-slate-400">
                      Download the app for the full experience.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <button
                      onClick={() => {
                        setSelectedOS("ios");
                        setPromptStep("GUIDE");
                      }}
                      className="w-full py-4 rounded-xl font-bold bg-white text-black hover:bg-slate-200 transition-colors text-lg shadow-lg"
                    >
                      iPhone
                    </button>
                    <button
                      onClick={() => {
                        setSelectedOS("android");
                        setPromptStep("GUIDE");
                      }}
                      className="w-full py-4 rounded-xl font-bold bg-white/10 text-white hover:bg-white/20 transition-colors text-lg border border-white/10"
                    >
                      Android
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center space-y-2 pb-2">
                    <h3 className="text-2xl font-serif font-bold text-white">
                      {selectedOS === "ios"
                        ? "Install on iPhone"
                        : "Install on Android"}
                    </h3>
                    <p className="text-sm text-slate-400">
                      Add Plans to your home screen for a faster, app-like
                      experience.
                    </p>
                  </div>

                  {selectedOS === "ios" ? (
                    isInAppBrowser ? (
                      <div className="space-y-4 bg-rose-500/10 border border-rose-500/20 p-5 rounded-2xl text-center">
                        <Compass className="w-10 h-10 text-rose-400 mx-auto mb-2" />
                        <p className="text-sm text-white font-medium">
                          You are using an in-app browser.
                        </p>
                        <p className="text-xs text-rose-200 mb-4">
                          To install Plans, you must first open this page in
                          Safari. Tap the browser/compass icon in the corner of
                          your screen.
                        </p>
                        <button
                          onClick={handleCopyLink}
                          className="w-full py-3 flex items-center justify-center gap-2 rounded-xl font-bold bg-white/10 text-white hover:bg-white/20 transition-colors text-sm border border-white/10"
                        >
                          {copied ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                          {copied ? "Link Copied!" : "Copy Link"}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-white/5 border border-white/5 p-4 rounded-2xl flex flex-col items-center text-center space-y-3 mb-4">
                          <p className="text-sm text-slate-300">
                            For the best experience, paste this link in{" "}
                            <strong>Safari</strong>:
                          </p>
                          <button
                            onClick={handleCopyLink}
                            className="w-full py-3 flex items-center justify-center gap-2 rounded-xl font-bold bg-white/10 text-white hover:bg-white/20 transition-colors text-sm border border-white/10"
                          >
                            {copied ? (
                              <Check className="w-4 h-4 text-green-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                            {copied ? "Link Copied!" : "Copy Link"}
                          </button>
                        </div>
                        <div className="bg-white/5 border border-white/5 p-4 rounded-2xl space-y-3">
                          <div className="flex items-start gap-4">
                            <div className="w-6 h-6 flex-shrink-0 bg-white/10 rounded-full flex items-center justify-center text-xs mt-0.5 font-bold">
                              1
                            </div>
                            <div className="space-y-2">
                              <p className="text-sm text-slate-300">
                                Open Safari and tap the <strong>Share</strong>{" "}
                                icon below.
                              </p>
                              <img
                                src="/ios-step1.png"
                                alt="Safari Share Icon"
                                className="rounded-lg shadow-md border border-white/10 w-full object-cover"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="bg-white/5 border border-white/5 p-4 rounded-2xl space-y-3">
                          <div className="flex items-start gap-4">
                            <div className="w-6 h-6 flex-shrink-0 bg-white/10 rounded-full flex items-center justify-center text-xs mt-0.5 font-bold">
                              2
                            </div>
                            <div className="space-y-2">
                              <p className="text-sm text-slate-300">
                                Scroll down the menu and tap{" "}
                                <strong>Add to Home Screen</strong>.
                              </p>
                              <img
                                src="/ios-step2.png"
                                alt="Add to Home Screen"
                                className="rounded-lg shadow-md border border-white/10 w-full object-cover"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="bg-white/5 border border-white/5 p-4 rounded-2xl space-y-3">
                          <div className="flex items-start gap-4">
                            <div className="w-6 h-6 flex-shrink-0 bg-white/10 rounded-full flex items-center justify-center text-xs mt-0.5 font-bold">
                              3
                            </div>
                            <div className="space-y-2">
                              <p className="text-sm text-slate-300">
                                Confirm by tapping <strong>Add</strong> in the
                                top right.
                              </p>
                              <img
                                src="/ios-step3.png"
                                alt="Confirm Add"
                                className="rounded-lg shadow-md border border-white/10 w-full object-cover"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-white/5 border border-white/5 p-5 rounded-2xl space-y-4">
                        <div className="flex items-start gap-4">
                          <div className="w-6 h-6 flex-shrink-0 bg-white/10 rounded-full flex items-center justify-center text-xs mt-0.5 font-bold">
                            1
                          </div>
                          <p className="text-sm text-slate-300">
                            Tap the <strong>Install App</strong> button if it
                            appears in your browser's address bar.
                          </p>
                        </div>
                        <div className="flex items-start gap-4">
                          <div className="w-6 h-6 flex-shrink-0 bg-white/10 rounded-full flex items-center justify-center text-xs mt-0.5 font-bold">
                            2
                          </div>
                          <p className="text-sm text-slate-300">
                            Or, tap the <strong>three dots (Menu)</strong> in
                            the top right and select{" "}
                            <strong>Install App</strong> or{" "}
                            <strong>Add to Home Screen</strong>.
                          </p>
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
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
