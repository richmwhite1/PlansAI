"use client";

import { useEffect } from "react";

export function RegisterSW() {
    useEffect(() => {
        if (typeof window === "undefined") return;
        if (!("serviceWorker" in navigator)) return;

        navigator.serviceWorker
            .register("/sw.js")
            .then((registration) => {
                console.log("SW registered:", registration.scope);
            })
            .catch((err) => {
                console.error("SW registration failed:", err);
            });
    }, []);

    return null;
}
