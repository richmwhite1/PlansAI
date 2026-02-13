"use client";

import { useUser, SignInButton } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { DashboardEngine } from "@/components/dashboard/dashboard-engine";
import { ArrowRight, Calendar } from "lucide-react";

export default function Home() {
  const { isSignedIn, isLoaded } = useUser();

  // Show nothing while Clerk loads to avoid flash
  if (!isLoaded) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </main>
    );
  }

  // ─── Authenticated: Show Dashboard Engine ───
  if (isSignedIn) {
    return (
      <main className="min-h-screen bg-background p-4 pb-24 md:p-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-md mx-auto space-y-8 mt-4 mb-20 md:mt-12"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-2"
          >
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-white">
              Gather
              <span className="bg-gradient-to-r from-primary to-amber-300 bg-clip-text text-transparent">
                {" "}better
              </span>
              .
            </h2>
            <p className="text-slate-400 text-lg">
              Coordinate plans without the group chat chaos.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <DashboardEngine />
          </motion.div>
        </motion.div>
      </main>
    );
  }

  // ─── Unauthenticated: Landing Page ───
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.12, delayChildren: 0.1 },
    },
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
      description: "Stop the endless debate. Everyone swipes on options, and the best plan wins automatically.",
      gradient: "from-violet-500/20 to-purple-500/20",
    },
    {
      title: "Instant Invites",
      description: "No app required for friends. Send a link, they vote or RSVP in seconds.",
      gradient: "from-emerald-500/20 to-teal-500/20",
    },
  ];

  return (
    <main className="min-h-screen bg-background overflow-hidden">
      {/* Ambient background gradients */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-violet-500/5 rounded-full blur-[120px]" />
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative max-w-lg mx-auto px-6 pt-20 pb-16 space-y-16"
      >
        {/* ── Hero ── */}
        <motion.section variants={item} className="text-center space-y-6">
          {/* Logo mark */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="inline-flex items-center justify-center"
          >
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-amber-300 flex items-center justify-center shadow-2xl shadow-primary/30">
              <span className="font-serif font-bold text-black text-3xl italic leading-none pt-1 pr-0.5">
                P
              </span>
            </div>
          </motion.div>

          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-serif font-bold text-white leading-tight">
              Gather
              <span className="bg-gradient-to-r from-primary to-amber-300 bg-clip-text text-transparent">
                {" "}better
              </span>
              .
            </h1>
            <p className="text-lg md:text-xl text-slate-400 max-w-sm mx-auto leading-relaxed">
              Stop texting back and forth. Start making plans that actually happen.
            </p>
          </div>

          {/* Primary CTA */}
          <div className="flex flex-col items-center gap-3 pt-2">
            <SignInButton mode="modal">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="w-full max-w-xs py-4 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg rounded-2xl shadow-xl shadow-primary/25 transition-colors flex items-center justify-center gap-3"
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </SignInButton>
            <p className="text-sm text-slate-500">
              Free to use · No credit card needed
            </p>
          </div>
        </motion.section>

        {/* ── How it works ── */}
        <motion.section variants={item} className="space-y-6">
          <div className="text-center">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">How it works</p>
            <h2 className="text-2xl font-serif font-bold text-white">
              Three steps. Zero chaos.
            </h2>
          </div>

          <div className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-4 pt-4">
            {[
              { step: "01", label: "Pick your crew", desc: "Select friends or groups instantly." },
              { step: "02", label: "Choose an activity", desc: "AI suggests the perfect spot." },
              { step: "03", label: "Send invites", desc: "One link. No app needed to RSVP." },
            ].map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="flex-1 text-center space-y-3 relative"
              >
                <div className="text-4xl font-serif font-bold text-white/10 select-none">
                  {s.step}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{s.label}</h3>
                  <p className="text-sm text-slate-400 max-w-[200px] mx-auto">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ── Feature Cards ── */}
        <motion.section variants={item} className="grid md:grid-cols-1 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="group p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors relative overflow-hidden"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />

              <div className="relative space-y-3">
                <h3 className="text-xl font-serif font-bold text-white tracking-wide">
                  {feature.title}
                </h3>
                <p className="text-base text-slate-400 leading-relaxed max-w-md">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.section>

        {/* ── Social proof ── */}
        <motion.section variants={item} className="text-center space-y-6">
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: "10k+", label: "Plans created" },
              { value: "50k+", label: "Friends invited" },
              { value: "98%", label: "Show-up rate" },
            ].map((stat) => (
              <div key={stat.label} className="space-y-1">
                <p className="text-2xl font-bold text-white font-serif">{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── Bottom CTA ── */}
        <motion.section variants={item} className="text-center space-y-6 pb-8">
          <div className="space-y-3">
            <h2 className="text-3xl font-serif font-bold text-white">
              Ready to stop planning in group chats?
            </h2>
            <p className="text-slate-400">
              Your friends are waiting.
            </p>
          </div>

          <SignInButton mode="modal">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="w-full max-w-xs mx-auto py-4 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg rounded-2xl shadow-xl shadow-primary/25 transition-colors flex items-center justify-center gap-3"
            >
              Create Your First Plan
              <Calendar className="w-5 h-5" />
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
