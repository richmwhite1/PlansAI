import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

// GET — Fetch all itinerary days + activities for a hangout
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ hangoutId: string }> }
) {
    try {
        const { hangoutId } = await params;

        const days = await prisma.itineraryDay.findMany({
            where: { hangoutId },
            include: {
                activities: {
                    orderBy: { displayOrder: "asc" },
                },
            },
            orderBy: { dayNumber: "asc" },
        });

        return NextResponse.json({ days });
    } catch (error: any) {
        console.error("Error fetching itinerary:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// POST — Create or update an itinerary day
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
        const { dayId, dayNumber, date, title, location, accommodations, notes } = body;

        // Verify user is organizer/creator
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

        if (dayId) {
            // Update existing day
            const day = await prisma.itineraryDay.update({
                where: { id: dayId },
                data: {
                    title: title ?? undefined,
                    location: location ?? undefined,
                    accommodations: accommodations ?? undefined,
                    notes: notes ?? undefined,
                },
                include: { activities: true },
            });
            return NextResponse.json({ day });
        } else {
            // Create new day
            const day = await prisma.itineraryDay.create({
                data: {
                    hangoutId,
                    dayNumber,
                    date: new Date(date),
                    title,
                    location,
                    accommodations,
                    notes,
                },
                include: { activities: true },
            });
            return NextResponse.json({ day });
        }
    } catch (error: any) {
        console.error("Error saving itinerary day:", error);
        return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
    }
}

// DELETE — Remove an itinerary day
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
        const dayId = searchParams.get("dayId");

        if (!dayId) {
            return NextResponse.json({ error: "dayId required" }, { status: 400 });
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

        await prisma.itineraryDay.delete({ where: { id: dayId } });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error deleting itinerary day:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
