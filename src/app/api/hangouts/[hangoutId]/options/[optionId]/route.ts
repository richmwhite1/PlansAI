import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ hangoutId: string; optionId: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { hangoutId, optionId } = await context.params;

        // Verify the user is the creator of the hangout
        const hangout = await prisma.hangout.findUnique({
            where: { id: hangoutId },
            include: { creator: true }
        });

        if (!hangout) {
            return NextResponse.json({ error: "Hangout not found" }, { status: 404 });
        }

        if (hangout.creator.clerkId !== userId) {
            return NextResponse.json({ error: "Only the creator can remove options" }, { status: 403 });
        }

        // Check if the hangout is still in planning/voting
        if (hangout.status !== "VOTING" && hangout.status !== "PLANNING") {
            return NextResponse.json({ error: "Cannot remove options once finalized" }, { status: 400 });
        }

        // Check if removing this option leaves the hangout with 0 options
        const optionCount = await prisma.hangoutActivityOption.count({
            where: { hangoutId }
        });

        // We allow 0 options (they can add more later) or you might want to enforce >= 1.
        // For now, allow deletion freely.

        // Delete the option (this will cascade delete associated votes via Prisma)
        await prisma.hangoutActivityOption.delete({
            where: { id: optionId }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Error deleting option:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
