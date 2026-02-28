import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

// GET — Fetch activities for a specific itinerary day
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ hangoutId: string }> }
) {
    try {
        const { hangoutId } = await params;
        const { searchParams } = new URL(req.url);
        const dayId = searchParams.get("dayId");

        if (!dayId) {
            return NextResponse.json({ error: "dayId required" }, { status: 400 });
        }

        const activities = await prisma.itineraryActivity.findMany({
            where: { itineraryDayId: dayId },
            orderBy: { displayOrder: "asc" },
        });

        return NextResponse.json({ activities });
    } catch (error: any) {
        console.error("Error fetching activities:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// POST — Add an activity to an itinerary day
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
        const { dayId, title, description, startTime, duration, location, isRequired } = body;

        if (!dayId || !title) {
            return NextResponse.json({ error: "dayId and title required" }, { status: 400 });
        }

        // Verify participant is creator/organizer
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

        // Get display order for new activity
        const maxOrder = await prisma.itineraryActivity.aggregate({
            where: { itineraryDayId: dayId },
            _max: { displayOrder: true },
        });

        const activity = await prisma.itineraryActivity.create({
            data: {
                itineraryDayId: dayId,
                title,
                description: description || null,
                startTime: startTime || null,
                duration: duration || null,
                location: location || null,
                isRequired: isRequired ?? true,
                displayOrder: (maxOrder._max.displayOrder ?? -1) + 1,
            },
        });

        return NextResponse.json({ activity });
    } catch (error: any) {
        console.error("Error creating activity:", error);
        return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
    }
}

// PATCH — Update an activity
export async function PATCH(
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
        const { activityId, title, description, startTime, duration, location, isRequired, displayOrder } = body;

        if (!activityId) {
            return NextResponse.json({ error: "activityId required" }, { status: 400 });
        }

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

        const activity = await prisma.itineraryActivity.update({
            where: { id: activityId },
            data: {
                title: title ?? undefined,
                description: description ?? undefined,
                startTime: startTime ?? undefined,
                duration: duration ?? undefined,
                location: location ?? undefined,
                isRequired: isRequired ?? undefined,
                displayOrder: displayOrder ?? undefined,
            },
        });

        return NextResponse.json({ activity });
    } catch (error: any) {
        console.error("Error updating activity:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// DELETE — Remove an activity
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
        const { searchParams } = new URL(req.url);
        const activityId = searchParams.get("activityId");

        if (!activityId) {
            return NextResponse.json({ error: "activityId required" }, { status: 400 });
        }

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

        await prisma.itineraryActivity.delete({ where: { id: activityId } });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error deleting activity:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
