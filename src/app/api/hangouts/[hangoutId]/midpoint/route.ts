import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { computeCentroid, milesToDegrees } from "@/lib/geo";
import { checkRateLimit, guestRateLimit } from "@/lib/rate-limit";

// Helper: resolve auth (userId or guestProfile)
async function resolveAuth(req: NextRequest) {
    const { userId } = await auth();
    if (userId) return { userId, guestId: null };

    const cookieStore = await cookies();
    const guestToken = cookieStore.get("plans-guest-token")?.value;
    if (guestToken) {
        const guestProfile = await prisma.guestProfile.findUnique({
            where: { token: guestToken },
        });
        if (guestProfile) return { userId: null, guestId: guestProfile.id };
    }
    return { userId: null, guestId: null };
}

// Build the response shape: midpoint + pins + suggestions
async function buildResponse(hangoutId: string) {
    const hangout = await prisma.hangout.findUnique({
        where: { id: hangoutId },
        select: {
            id: true,
            midpointLat: true,
            midpointLng: true,
            searchRadiusMiles: true,
            participants: {
                select: {
                    id: true,
                    latitude: true,
                    longitude: true,
                    profile: { select: { displayName: true, avatarUrl: true } },
                    guest: { select: { displayName: true } },
                },
            },
        },
    });

    if (!hangout) return null;

    const pins = hangout.participants
        .filter((p) => p.latitude !== null && p.longitude !== null)
        .map((p) => ({
            lat: p.latitude as number,
            lng: p.longitude as number,
            name: p.profile?.displayName || p.guest?.displayName || "Guest",
            avatarUrl: p.profile?.avatarUrl ?? null,
        }));

    const midpoint = computeCentroid(pins);

    let suggestions: object[] = [];
    if (midpoint) {
        const radius = hangout.searchRadiusMiles ?? 10;
        const degrees = milesToDegrees(radius);
        suggestions = await prisma.cachedEvent.findMany({
            where: {
                latitude: { gte: midpoint.lat - degrees, lte: midpoint.lat + degrees },
                longitude: { gte: midpoint.lng - degrees, lte: midpoint.lng + degrees },
            },
            orderBy: { rating: "desc" },
            take: 12,
        });
    }

    return { midpoint, pins, suggestions };
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ hangoutId: string }> }
) {
    try {
        const { hangoutId } = await params;
        const { userId, guestId } = await resolveAuth(req);

        if (!userId && !guestId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const result = await buildResponse(hangoutId);
        if (!result) {
            return NextResponse.json({ error: "Hangout not found" }, { status: 404 });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error("GET /midpoint error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ hangoutId: string }> }
) {
    try {
        const { hangoutId } = await params;
        const { userId, guestId } = await resolveAuth(req);

        if (!userId && !guestId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Rate-limit guests
        if (guestId) {
            const rl = await checkRateLimit(`midpoint:guest:${guestId}`, guestRateLimit);
            if (!rl.success) {
                return NextResponse.json(
                    { error: "Too many requests. Please wait before trying again." },
                    { status: 429 }
                );
            }
        }

        const body = await req.json();
        const { latitude, longitude } = body;

        if (
            typeof latitude !== "number" ||
            typeof longitude !== "number" ||
            latitude < -90 || latitude > 90 ||
            longitude < -180 || longitude > 180
        ) {
            return NextResponse.json(
                { error: "Invalid latitude/longitude values" },
                { status: 400 }
            );
        }

        // Find participant record
        let participant;
        if (userId) {
            const profile = await prisma.profile.findUnique({ where: { clerkId: userId } });
            if (!profile) {
                return NextResponse.json({ error: "Profile not found" }, { status: 404 });
            }
            participant = await prisma.hangoutParticipant.findFirst({
                where: { hangoutId, profileId: profile.id },
            });
        } else {
            participant = await prisma.hangoutParticipant.findFirst({
                where: { hangoutId, guestId },
            });
        }

        if (!participant) {
            return NextResponse.json({ error: "Not a participant" }, { status: 403 });
        }

        // Update participant location
        await prisma.hangoutParticipant.update({
            where: { id: participant.id },
            data: { latitude, longitude },
        });

        // Recompute centroid from all pins
        const allParticipants = await prisma.hangoutParticipant.findMany({
            where: { hangoutId },
            select: { latitude: true, longitude: true },
        });

        const pins = allParticipants.filter(
            (p) => p.latitude !== null && p.longitude !== null
        ) as { latitude: number; longitude: number }[];

        const centroid = computeCentroid(
            pins.map((p) => ({ lat: p.latitude, lng: p.longitude }))
        );

        // Persist updated midpoint on Hangout
        await prisma.hangout.update({
            where: { id: hangoutId },
            data: {
                midpointLat: centroid?.lat ?? null,
                midpointLng: centroid?.lng ?? null,
            },
        });

        const result = await buildResponse(hangoutId);
        if (!result) {
            return NextResponse.json({ error: "Hangout not found" }, { status: 404 });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error("POST /midpoint error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
