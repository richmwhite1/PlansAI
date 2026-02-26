"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function SpotlightCard({
    children,
    className,
    gradient = "from-primary/20 to-amber-500/20",
}: {
    children: React.ReactNode;
    className?: string;
    gradient?: string;
}) {
    const divRef = useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [opacity, setOpacity] = useState(0);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!divRef.current || isFocused) return;

        const rect = divRef.current.getBoundingClientRect();
        setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    const handleFocus = () => {
        setIsFocused(true);
        setOpacity(1);
    };

    const handleBlur = () => {
        setIsFocused(false);
        setOpacity(0);
    };

    const handleMouseEnter = () => {
        setOpacity(1);
    };

    const handleMouseLeave = () => {
        setOpacity(0);
    };

    return (
        <motion.div
            ref={divRef}
            onMouseMove={handleMouseMove}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className={cn(
                "relative overflow-hidden rounded-3xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors shadow-2xl z-10",
                className
            )}
        >
            <div
                className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 z-0"
                style={{
                    opacity,
                    background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(255,255,255,0.06), transparent 40%)`,
                }}
            />

            {/* Accent gradient that reveals slightly on hover */}
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 hover:opacity-10 transition-opacity duration-500 blur-xl -z-10`} />

            <div className="relative z-10 w-full h-full">
                {children}
            </div>
        </motion.div>
    );
}
