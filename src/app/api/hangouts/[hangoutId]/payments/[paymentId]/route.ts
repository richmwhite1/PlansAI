import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile } from "@/lib/profile-utils";

type RouteContext = { params: Promise<{ hangoutId: string; paymentId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const profile = await getOrCreateProfile(userId);
        if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

        const { hangoutId, paymentId } = await context.params;
        const body = await request.json();
        const { status } = body;

        console.log("[Payment PATCH] Confirming payment transfer:", { hangoutId, paymentId, status, receiverId: profile.id });

        if (status !== "COMPLETED" && status !== "REJECTED") {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }

        const payment = await prisma.paymentTransfer.findUnique({
            where: { id: paymentId }
        });

        if (!payment) {
            return NextResponse.json({ error: "Payment not found" }, { status: 404 });
        }

        if (payment.receiverId !== profile.id) {
            return NextResponse.json({ error: "Not authorized to confirm this payment" }, { status: 403 });
        }

        const updatedPayment = await prisma.paymentTransfer.update({
            where: { id: paymentId },
            data: { status },
        });

        if (status === "COMPLETED") {
            // Notify the sender that it was received
            await prisma.notification.create({
                data: {
                    userId: payment.senderId,
                    type: "PAYMENT_RECEIVED", // Or you could use SYSTEM
                    content: `${profile.displayName} confirmed receiving your $${payment.amount.toFixed(2)} payment.`,
                    link: `/messages/${hangoutId}/expenses`,
                }
            });
        }

        return NextResponse.json({ success: true, payment: updatedPayment });
    } catch (err) {
        console.error("Failed to update payment transfer:", err);
        return NextResponse.json({ error: "Failed to update payment" }, { status: 500 });
    }
}
