"use client";

import { SignInButton } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { ArrowRight, Calendar, Download } from "lucide-react";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { SpotlightCard } from "@/components/ui/spotlight-card";

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

const item = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

const features = [
    {
        title: "AI-Powered Ideas",
        description: "Get personalized activity suggestions based on who's coming, where you are, and the vibe you want.",
        gradient: "from-amber-500/20 to-orange-500/20",
    },
    {
        title: "Democratic Voting",
        description: "Stop the endless debate. Everyone votes on options, and the best plan wins automatically.",
        gradient: "from-primary/20 to-primary/5",
    },
    {
        title: "Instant Invites",
        description: "No app required for friends. Send a link, they vote or RSVP in seconds.",
        gradient: "from-emerald-500/20 to-teal-500/20",
    },
];

export function LandingPage() {
    return (
        <main className="min-h-screen bg-background overflow-hidden">
            <AnimatedBackground />

            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="relative max-w-lg mx-auto px-6 pt-20 pb-16 space-y-16"
            >
                {/* ── Hero ── */}
                <motion.section variants={item} className="text-center space-y-6">
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="inline-flex items-center justify-center"
                    >
                        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-amber-300 flex items-center justify-center shadow-2xl shadow-primary/30">
                            <span className="font-serif font-bold text-black text-3xl italic leading-none pt-1 pr-0.5">P</span>
                        </div>
                    </motion.div>

                    <div className="space-y-4">
                        <h1 className="text-5xl md:text-6xl font-serif font-bold text-white leading-tight">
                            Gather
                            <span className="bg-gradient-to-r from-primary to-amber-300 bg-clip-text text-transparent"> better</span>.
                        </h1>
                        <p className="text-lg md:text-xl text-slate-400 max-w-sm mx-auto leading-relaxed">
                            Stop texting back and forth. Start making plans that actually happen.
                        </p>
                    </div>

                    <div className="flex flex-col items-center gap-3 pt-2">
                        <SignInButton mode="modal">
                            <motion.button
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                className="relative w-full max-w-xs py-4 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 group overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                                <span className="relative z-10 flex items-center gap-3">
                                    Get Started
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </span>
                            </motion.button>
                        </SignInButton>

                        <button
                            onClick={() => (window as any).triggerInstallPrompt?.()}
                            className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-2 pt-2"
                        >
                            <Download className="w-4 h-4" /> Add to Home Screen
                        </button>

                        <p className="text-sm text-slate-500 mt-2">Free to use · No credit card needed</p>
                    </div>
                </motion.section>

                {/* ── How it works ── */}
                <motion.section variants={item} className="space-y-6">
                    <div className="text-center">
                        <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">How it works</p>
                        <h2 className="text-2xl font-serif font-bold text-white">Three steps. Zero chaos.</h2>
                    </div>
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-4 pt-4">
                        {[
                            { step: "01", label: "Pick your crew", desc: "Select friends or add guests instantly." },
                            { step: "02", label: "Choose an activity", desc: "AI suggests the perfect spot for your group." },
                            { step: "03", label: "Send invites", desc: "One link. No app needed to RSVP." },
                        ].map((s, i) => (
                            <motion.div
                                key={s.step}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 + i * 0.1 }}
                                className="flex-1 text-center space-y-3"
                            >
                                <div className="text-4xl font-serif font-bold text-white/10 select-none">{s.step}</div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">{s.label}</h3>
                                    <p className="text-sm text-slate-400 max-w-[200px] mx-auto">{s.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.section>

                {/* ── Feature Cards ── */}
                <motion.section variants={item} className="grid gap-6">
                    {features.map((feature, i) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 + i * 0.1 }}
                        >
                            <SpotlightCard className="group p-8" gradient={feature.gradient}>
                                <div className="space-y-3">
                                    <h3 className="text-xl font-serif font-bold text-white tracking-wide">{feature.title}</h3>
                                    <p className="text-base text-slate-400 leading-relaxed max-w-md">{feature.description}</p>
                                </div>
                            </SpotlightCard>
                        </motion.div>
                    ))}
                </motion.section>

                {/* ── Bottom CTA ── */}
                <motion.section variants={item} className="text-center space-y-6 pb-8">
                    <div className="space-y-3">
                        <h2 className="text-3xl font-serif font-bold text-white">
                            Ready to stop planning in group chats?
                        </h2>
                        <p className="text-slate-400">Your friends are waiting.</p>
                    </div>
                    <SignInButton mode="modal">
                        <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            className="relative w-full max-w-xs mx-auto py-4 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 group overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                            <span className="relative z-10 flex items-center gap-3">
                                Create Your First Plan
                                <Calendar className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            </span>
                        </motion.button>
                    </SignInButton>
                    <p className="text-xs text-slate-600 pt-4">
                        Already invited to a plan? Check the link your friend sent you.
                    </p>
                </motion.section>
            </motion.div>
        </main>
    );
}
