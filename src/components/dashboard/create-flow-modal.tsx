"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Compass, Plus, Sparkles, Map, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface CreateFlowModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreateFlowModal({ isOpen, onClose }: CreateFlowModalProps) {
    const router = useRouter();
    const [isTransitioning, setIsTransitioning] = useState(false);

    const handleSelectOption = (isMultiDay: boolean) => {
        setIsTransitioning(true);
        // Delay navigation slightly for animation to play
        setTimeout(() => {
            router.push(`/?create=${isMultiDay ? 'complex' : 'quick'}`);
            onClose();
            setIsTransitioning(false);
        }, 300);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, y: "100%", scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: "100%", scale: 0.95 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 z-[70] p-4 pb-12 sm:pb-8 sm:p-6 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:max-w-md sm:mx-auto"
                    >
                        <div className="bg-[#0A0A0A] border border-white/10 rounded-3xl shadow-2xl overflow-hidden shadow-primary/10">
                            {/* Header */}
                            <div className="p-6 border-b border-white/5 relative">
                                <button
                                    onClick={onClose}
                                    className="absolute right-4 top-4 p-2 text-slate-400 hover:text-white bg-white/5 rounded-full transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                                <h2 className="text-2xl font-serif font-bold text-white mb-2">Create a Plan</h2>
                                <p className="text-slate-400 text-sm">Choose how you want to gather.</p>
                            </div>

                            <div className="p-4 space-y-3">
                                {/* Option 1: Quick Hangout */}
                                <button
                                    onClick={() => handleSelectOption(false)}
                                    disabled={isTransitioning}
                                    className="w-full relative group text-left overflow-hidden rounded-2xl p-5 border border-white/5 bg-white/5 hover:bg-white/10 hover:border-primary/30 transition-all"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative flex items-start gap-4">
                                        <div className="p-3 rounded-xl bg-primary/20 text-primary shrink-0">
                                            <Sparkles className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white mb-1 group-hover:text-primary transition-colors">Quick Hangout</h3>
                                            <p className="text-sm text-slate-400">Pick an activity, vote on a time, and go. Best for dinners, drinks, or casual meetups.</p>
                                        </div>
                                    </div>
                                </button>

                                {/* Option 2: Complex Event */}
                                <button
                                    onClick={() => handleSelectOption(true)}
                                    disabled={isTransitioning}
                                    className="w-full relative group text-left overflow-hidden rounded-2xl p-5 border border-white/5 bg-white/5 hover:bg-white/10 hover:amber-500/30 transition-all"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative flex items-start gap-4">
                                        <div className="p-3 rounded-xl bg-amber-500/20 text-amber-500 shrink-0">
                                            <Map className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white mb-1 group-hover:text-amber-500 transition-colors">Complex Event</h3>
                                            <p className="text-sm text-slate-400">Manage an itinerary, split costs, and organize a trip. Best for weekends or retreats.</p>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
