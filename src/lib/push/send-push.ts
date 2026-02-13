import webpush from "web-push";
import { prisma } from "@/lib/prisma";

// Generate VAPID keys once and store in env:
// npx web-push generate-vapid-keys
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:plans@example.com";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
    webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
}

interface PushPayload {
    title: string;
    body: string;
    url?: string;
    icon?: string;
}

/**
 * Send push notification to a specific user
 */
export async function sendPushToUser(profileId: string, payload: PushPayload) {
    if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
        console.warn("Push notifications not configured — missing VAPID keys");
        return;
    }

    const subscriptions = await prisma.pushSubscription.findMany({
        where: { profileId },
    });

    const results = await Promise.allSettled(
        subscriptions.map(async (sub: any) => {
            try {
                await webpush.sendNotification(
                    {
                        endpoint: sub.endpoint,
                        keys: { p256dh: sub.p256dh, auth: sub.auth },
                    },
                    JSON.stringify({
                        title: payload.title,
                        body: payload.body,
                        url: payload.url || "/",
                        icon: payload.icon || "/android-chrome-192x192.png",
                    })
                );
            } catch (err: any) {
                // If subscription is expired/invalid, remove it
                if (err.statusCode === 404 || err.statusCode === 410) {
                    await prisma.pushSubscription.delete({ where: { id: sub.id } });
                }
                throw err;
            }
        })
    );

    const sent = results.filter((r: any) => r.status === "fulfilled").length;
    const failed = results.filter((r: any) => r.status === "rejected").length;
    console.log(`Push to ${profileId}: ${sent} sent, ${failed} failed`);
}

/**
 * Send push notification to multiple users
 */
export async function sendPushToUsers(profileIds: string[], payload: PushPayload) {
    await Promise.allSettled(
        profileIds.map((id) => sendPushToUser(id, payload))
    );
}
