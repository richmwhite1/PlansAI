"use client";

import { useUser, SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { motion } from "framer-motion";
import { DashboardEngine } from "@/components/dashboard/dashboard-engine";
import { Sparkles, Calendar, Users, Compass } from "lucide-react";
import { NotificationsBell } from "@/components/ui/notifications-bell";

export default function Home() {
  const { isSignedIn, user } = useUser();

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950/20 p-4 pb-24 md:p-8">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Plans</h1>
        </div>

        <div className="flex items-center gap-4">
          {!isSignedIn && (
            <SignInButton mode="modal">
              <button className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
                Sign In
              </button>
            </SignInButton>
          )}
          {isSignedIn && (
            <div className="flex items-center gap-3">
              <NotificationsBell />
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8"
                  }
                }}
              />
            </div>
          )}
        </div>
      </motion.header>

      {/* Hero / CTA */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="max-w-md mx-auto space-y-8 mt-12 mb-20 md:mt-24"
      >
        <motion.div variants={item} className="text-center space-y-2">
          <h2 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400">
            Gather better.
          </h2>
          <p className="text-slate-400 text-lg">
            Coordinate plans without the group chat chaos.
          </p>
        </motion.div>

        {/* The Action Card - Dynamic Dashboard Engine */}
        <motion.div variants={item}>
          <DashboardEngine />
        </motion.div>

        {/* Discovery Feed Teaser */}
        {/* <motion.div variants={item} className="pt-8 opacity-50 hover:opacity-100 transition-opacity">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="text-sm font-semibold text-slate-300">Happening Nearby</h3>
            <span className="text-xs text-violet-400 cursor-pointer hover:underline">View all</span>
          </div>

          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="glass-card p-4 flex gap-4 group cursor-pointer border border-white/5 hover:border-violet-500/30">
                <div className="h-16 w-16 rounded-xl bg-slate-800 shrink-0 overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-slate-200 truncate group-hover:text-violet-300 transition-colors">
                    Late Night Ramen Run
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="px-1.5 py-0.5 rounded-full bg-white/10 text-[10px] text-slate-300 backdrop-blur-sm">
                      Op 92% Match
                    </div>
                    <span className="text-xs text-slate-500">• 0.8mi away</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs font-mono text-slate-500">Tonight</span>
                  <div className="flex -space-x-2">
                    <div className="h-5 w-5 rounded-full bg-slate-700 ring-2 ring-slate-900" />
                    <div className="h-5 w-5 rounded-full bg-slate-600 ring-2 ring-slate-900" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div> */}
      </motion.div>
    </main>
  );
}
