import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ hangoutId: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { hangoutId } = await context.params;
        const body = await req.json();
        const { description, consensusThreshold, allowParticipantSuggestions } = body;

        // 1. Get Hangout to verify ownership
        const hangout = await prisma.hangout.findUnique({
            where: { id: hangoutId },
            include: { creator: true }
        });

        if (!hangout) {
            return NextResponse.json({ error: "Hangout not found" }, { status: 404 });
        }

        if (hangout.creator.clerkId !== userId) {
            return NextResponse.json({ error: "Only the creator can edit settings" }, { status: 403 });
        }

        // 2. Update Hangout
        const updatedHangout = await prisma.hangout.update({
            where: { id: hangoutId },
            data: {
                description: description !== undefined ? description : undefined,
                consensusThreshold: consensusThreshold !== undefined ? consensusThreshold : undefined,
                allowParticipantSuggestions: allowParticipantSuggestions !== undefined ? allowParticipantSuggestions : undefined
            }
        });

        return NextResponse.json(updatedHangout);

    } catch (error) {
        console.error("Error updating hangout:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
