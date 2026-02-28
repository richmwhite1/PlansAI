import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

// GET — Fetch budget with per-person calculation
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ hangoutId: string }> }
) {
    try {
        const { hangoutId } = await params;

        const budget = await prisma.hangoutBudget.findUnique({
            where: { hangoutId },
        });

        if (!budget) {
            return NextResponse.json({ budget: null });
        }

        // Count confirmed participants (GOING status)
        const participantCount = await prisma.hangoutParticipant.count({
            where: {
                hangoutId,
                rsvpStatus: { in: ["GOING"] },
            },
        });

        const effectiveCount = Math.max(participantCount, 1);
        const costPerPerson = budget.isFlatFee ? budget.totalCost : budget.totalCost / effectiveCount;

        // Get existing payment transfers for this hangout
        const payments = await prisma.paymentTransfer.findMany({
            where: { hangoutId },
            include: {
                sender: { select: { id: true, displayName: true, avatarUrl: true } },
                receiver: { select: { id: true, displayName: true, avatarUrl: true } },
            },
        });

        return NextResponse.json({
            budget: {
                ...budget,
                costPerPerson: Math.round(costPerPerson * 100) / 100,
                participantCount: effectiveCount,
            },
            payments,
        });
    } catch (error: any) {
        console.error("Error fetching budget:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// POST — Set/update the budget and optionally notify participants
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ hangoutId: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { hangoutId } = await params;
        const body = await req.json();
        const { totalCost, currency, notes, isFlatFee, notifyParticipants } = body;

        if (totalCost === undefined || totalCost === null) {
            return NextResponse.json({ error: "totalCost required" }, { status: 400 });
        }

        const profile = await prisma.profile.findUnique({ where: { clerkId: userId } });
        if (!profile) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        // Verify creator/organizer role
        const participant = await prisma.hangoutParticipant.findFirst({
            where: {
                hangoutId,
                profileId: profile.id,
                role: { in: ["CREATOR", "ORGANIZER"] },
            },
        });

        if (!participant) {
            return NextResponse.json({ error: "Not authorized" }, { status: 403 });
        }

        const budget = await prisma.hangoutBudget.upsert({
            where: { hangoutId },
            create: {
                hangoutId,
                totalCost: parseFloat(totalCost),
                currency: currency || "USD",
                notes: notes || null,
                isFlatFee: isFlatFee || false,
            },
            update: {
                totalCost: parseFloat(totalCost),
                currency: currency || undefined,
                notes: notes !== undefined ? notes : undefined,
                isFlatFee: isFlatFee !== undefined ? isFlatFee : undefined,
            },
        });

        // If requested, notify participants of their share
        if (notifyParticipants) {
            const participants = await prisma.hangoutParticipant.findMany({
                where: {
                    hangoutId,
                    rsvpStatus: "GOING",
                    profileId: { not: null },
                },
            });

            const goingCount = Math.max(participants.length, 1);
            const costPerPerson = Math.round((budget.isFlatFee ? budget.totalCost : budget.totalCost / goingCount) * 100) / 100;

            const hangout = await prisma.hangout.findUnique({
                where: { id: hangoutId },
                select: { title: true, slug: true },
            });

            for (const p of participants) {
                if (p.profileId && p.profileId !== profile.id) {
                    await prisma.notification.create({
                        data: {
                            userId: p.profileId,
                            type: "HANGOUT_UPDATE",
                            content: `💰 ${hangout?.title}: Your share is $${costPerPerson}. Check the budget tab for payment details.`,
                            link: `/hangouts/${hangout?.slug}`,
                        },
                    }).catch(err => console.error("Failed to send budget notification:", err));
                }
            }
        }

        return NextResponse.json({ budget });
    } catch (error: any) {
        console.error("Error saving budget:", error);
        return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
    }
}

// DELETE — Remove the budget
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ hangoutId: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { hangoutId } = await params;

        const profile = await prisma.profile.findUnique({ where: { clerkId: userId } });
        if (!profile) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        const participant = await prisma.hangoutParticipant.findFirst({
            where: {
                hangoutId,
                profileId: profile.id,
                role: { in: ["CREATOR", "ORGANIZER"] },
            },
        });

        if (!participant) {
            return NextResponse.json({ error: "Not authorized" }, { status: 403 });
        }

        await prisma.hangoutBudget.delete({ where: { hangoutId } }).catch(() => { });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error deleting budget:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
