"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    const arr = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
    return arr.buffer as ArrayBuffer;
}

async function subscribeToPush(registration: ServiceWorkerRegistration) {
    if (!VAPID_PUBLIC) {
        console.warn("[SW] VAPID public key not set — skipping push subscription");
        return;
    }

    try {
        // Check existing subscription first
        const existing = await registration.pushManager.getSubscription();
        if (existing) {
            // Already subscribed — ensure it's saved on the server
            await saveSubscription(existing);
            return;
        }

        // Request a new subscription
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
        });

        await saveSubscription(subscription);
        console.log("[SW] Push subscription created and saved");
    } catch (err) {
        console.warn("[SW] Push subscription failed:", err);
    }
}

async function saveSubscription(subscription: PushSubscription) {
    const json = subscription.toJSON();
    await fetch("/api/notifications/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            endpoint: json.endpoint,
            keys: json.keys,
        }),
    });
}

export function RegisterSW() {
    const { isSignedIn } = useUser();

    useEffect(() => {
        if (typeof window === "undefined") return;
        if (!("serviceWorker" in navigator)) return;

        navigator.serviceWorker
            .register("/sw.js")
            .then(async (registration) => {
                console.log("[SW] Registered:", registration.scope);

                // Only subscribe to push if the user is signed in
                if (!isSignedIn) return;

                const permission = Notification.permission;

                if (permission === "granted") {
                    // Already have permission — ensure subscription is active
                    await subscribeToPush(registration);
                } else if (permission === "default") {
                    // Ask after a brief delay so it doesn't appear on first page load
                    setTimeout(async () => {
                        const result = await Notification.requestPermission();
                        if (result === "granted") {
                            await subscribeToPush(registration);
                        }
                    }, 4000);
                }
                // If "denied" — silently skip, user chose not to receive notifications
            })
            .catch((err) => {
                console.error("[SW] Registration failed:", err);
            });
    }, [isSignedIn]);

    return null;
}
