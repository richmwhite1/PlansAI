import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { checkRateLimit, guestRateLimit, guestCreateRateLimit } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ hangoutId: string }> } // Correct type for dynamic params
) {
    try {
        const { hangoutId } = await context.params;

        // Get IP
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
                   req.headers.get("x-real-ip") ??
                   "unknown";

        // Rate limit: max 10 guest actions per minute per IP
        const rateLimitResult = await checkRateLimit(`guest:${ip}`, guestRateLimit);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { error: "Too many requests. Please wait a moment and try again." },
                { status: 429, headers: { "Retry-After": String(Math.ceil((rateLimitResult.reset - Date.now()) / 1000)) } }
            );
        }

        // Rate limit guest creation specifically: max 5 per hour per IP
        const createLimitResult = await checkRateLimit(`guest-create:${ip}`, guestCreateRateLimit);
        if (!createLimitResult.success) {
            return NextResponse.json(
                { error: "Too many guest accounts created from this location." },
                { status: 429 }
            );
        }

        const body = await req.json();
        const { displayName, turnstileToken } = body;

        // Verify Turnstile (gracefully skips if not configured in dev)
        if (turnstileToken !== undefined) {
            const turnstileValid = await verifyTurnstile(turnstileToken ?? "");
            if (!turnstileValid) {
                return NextResponse.json({ error: "Bot verification failed. Please try again." }, { status: 403 });
            }
        }

        if (!displayName || displayName.trim().length < 2) {
            return NextResponse.json({ error: "Name is required (min 2 chars)" }, { status: 400 });
        }

        const hangout = await prisma.hangout.findUnique({
            where: { id: hangoutId }
        });

        if (!hangout) {
            return NextResponse.json({ error: "Hangout not found" }, { status: 404 });
        }

        // Create Guest Profile and Participant in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create Guest Profile
            const guest = await tx.guestProfile.create({
                data: {
                    displayName,
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                    convertedToProfileId: null
                }
            });

            // 2. Add as Participant
            const participant = await tx.hangoutParticipant.create({
                data: {
                    hangoutId,
                    guestId: guest.id,
                    role: "MEMBER",
                    rsvpStatus: "PENDING" // Let them explicitly choose afterwards
                }
            });

            return { guest, participant };
        });

        // Set secure cookie
        const cookieStore = await cookies();
        cookieStore.set("plans-guest-token", result.guest.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 30 * 24 * 60 * 60 // 30 days
        });

        return NextResponse.json({
            success: true,
            guest: result.guest,
            participant: result.participant
        });

    } catch (error) {
        console.error("Error joining as guest:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
