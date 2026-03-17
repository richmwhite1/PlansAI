import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ pulseId: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const profile = await prisma.profile.findUnique({ where: { clerkId: userId } });
        if (!profile) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        const { pulseId } = await params;

        const pulse = await prisma.pulse.findUnique({
            where: { id: pulseId },
        });

        if (!pulse) {
            return NextResponse.json({ error: "Pulse not found" }, { status: 404 });
        }

        if (pulse.creatorId !== profile.id) {
            return NextResponse.json({ error: "Only the pulse creator can graduate it" }, { status: 403 });
        }

        if (pulse.status !== "OPEN") {
            return NextResponse.json({ error: "Pulse is not open" }, { status: 400 });
        }

        const body = await req.json().catch(() => ({}));
        const { scheduledFor, message } = body as { scheduledFor?: string; message?: string };

        const timeLabel = pulse.targetTime
            .split("_")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(" ");
        const hangoutTitle = message || pulse.message || `Plans - ${timeLabel}`;

        const hangout = await prisma.hangout.create({
            data: {
                title: hangoutTitle,
                creatorId: pulse.creatorId,
                status: "PLANNING",
                type: "CASUAL",
                scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
            },
        });

        await prisma.pulse.update({
            where: { id: pulseId },
            data: { status: "GRADUATED", graduatedToId: hangout.id },
        });

        return NextResponse.json({ hangoutSlug: hangout.slug });
    } catch (error: any) {
        console.error("Error graduating pulse:", error);
        return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
    }
}
