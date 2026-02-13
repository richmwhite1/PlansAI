import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ hangoutId: string; participantId: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { hangoutId, participantId } = await context.params;
        const body = await req.json();
        const { isMandatory } = body;

        // Verify user is the creator
        const hangout = await prisma.hangout.findUnique({
            where: { id: hangoutId },
            select: { creatorId: true, creator: { select: { clerkId: true } } }
        });

        if (!hangout || hangout.creator.clerkId !== userId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const updated = await prisma.hangoutParticipant.update({
            where: { id: participantId, hangoutId },
            data: { isMandatory }
        });

        return NextResponse.json({ success: true, isMandatory: updated.isMandatory });

    } catch (error) {
        console.error("Failed to toggle mandatory:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
