import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ hangoutId: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { hangoutId } = await context.params;
        const { cachedEventId } = await req.json();

        if (!cachedEventId) {
            return NextResponse.json({ error: "Missing cachedEventId" }, { status: 400 });
        }

        // 1. Get Hangout to check if suggestions are allowed
        const hangout = await prisma.hangout.findUnique({
            where: { id: hangoutId },
            select: { allowParticipantSuggestions: true, status: true }
        });

        if (!hangout) {
            return NextResponse.json({ error: "Hangout not found" }, { status: 404 });
        }

        if (hangout.status !== "VOTING" && hangout.status !== "PLANNING") {
            return NextResponse.json({ error: "Cannot add options to this hangout anymore" }, { status: 400 });
        }

        // 2. Add Activity Option
        const newOption = await prisma.hangoutActivityOption.create({
            data: {
                hangoutId,
                cachedEventId,
                displayOrder: 99 // Add to end
            },
            include: {
                cachedEvent: true
            }
        });

        return NextResponse.json(newOption);

    } catch (error) {
        console.error("Error adding option:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
