import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile } from "@/lib/profile-utils";

type RouteContext = { params: Promise<{ hangoutId: string }> };

export async function POST(request: Request, context: RouteContext) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const profile = await getOrCreateProfile(userId);
        if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

        const { hangoutId } = await context.params;
        const body = await request.json();
        const { receiverId, amount, method } = body;

        console.log("[Payment POST] Creating payment transfer:", { hangoutId, senderId: profile.id, receiverId, amount, method });

        if (!receiverId || !amount || amount <= 0) {
            return NextResponse.json({ error: "Invalid payment details" }, { status: 400 });
        }

        const payment = await prisma.paymentTransfer.create({
            data: {
                hangoutId,
                senderId: profile.id,
                receiverId,
                amount: parseFloat(amount),
                method: method || "Unknown",
                status: "PENDING",
            },
            include: {
                sender: { select: { id: true, displayName: true, avatarUrl: true } },
                receiver: { select: { id: true, displayName: true, avatarUrl: true } },
            },
        });

        // Create a notification for the receiver
        await prisma.notification.create({
            data: {
                userId: receiverId,
                type: "PAYMENT_RECEIVED",
                content: `${profile.displayName} sent you $${payment.amount.toFixed(2)} for ${payment.method}. Please confirm receipt.`,
                link: `/messages/${hangoutId}/expenses`, // Fallback link
            }
        });

        return NextResponse.json({ payment });
    } catch (err) {
        console.error("Failed to create payment transfer:", err);
        return NextResponse.json({ error: "Failed to log payment" }, { status: 500 });
    }
}
