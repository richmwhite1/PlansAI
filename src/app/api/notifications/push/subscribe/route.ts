import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile } from "@/lib/profile-utils";

// POST — save push subscription for current user
export async function POST(request: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const profile = await getOrCreateProfile(userId);
        if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

        const body = await request.json();
        const { endpoint, keys } = body;

        if (!endpoint || !keys?.p256dh || !keys?.auth) {
            return NextResponse.json({ error: "Invalid subscription data" }, { status: 400 });
        }

        // Upsert — update if endpoint exists, create if not
        await prisma.pushSubscription.upsert({
            where: { endpoint },
            update: {
                p256dh: keys.p256dh,
                auth: keys.auth,
                profileId: profile.id,
            },
            create: {
                profileId: profile.id,
                endpoint,
                p256dh: keys.p256dh,
                auth: keys.auth,
            },
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Failed to save push subscription:", err);
        return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 });
    }
}

// DELETE — remove push subscription
export async function DELETE(request: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await request.json();
        const { endpoint } = body;

        if (!endpoint) {
            return NextResponse.json({ error: "Endpoint required" }, { status: 400 });
        }

        await prisma.pushSubscription.deleteMany({
            where: { endpoint },
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Failed to remove push subscription:", err);
        return NextResponse.json({ error: "Failed to remove subscription" }, { status: 500 });
    }
}
