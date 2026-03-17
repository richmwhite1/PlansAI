import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, guestRateLimit } from "@/lib/rate-limit";
import { sendPushToUser } from "@/lib/push/send-push";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ pulseId: string }> }
) {
    try {
        const { pulseId } = await params;
        const body = await req.json();
        const { answer } = body as { answer: "YES" | "MAYBE" | "NO" };

        if (!answer || !["YES", "MAYBE", "NO"].includes(answer)) {
            return NextResponse.json({ error: "answer must be YES, MAYBE, or NO" }, { status: 400 });
        }

        const pulse = await prisma.pulse.findUnique({
            where: { id: pulseId },
            include: { responses: true },
        });

        if (!pulse) {
            return NextResponse.json({ error: "Pulse not found" }, { status: 404 });
        }
        if (pulse.status !== "OPEN") {
            return NextResponse.json({ error: "Pulse is no longer open" }, { status: 400 });
        }
        if (pulse.expiresAt < new Date()) {
            return NextResponse.json({ error: "Pulse has expired" }, { status: 400 });
        }

        // ── Auth: registered user OR guest ───────────────────────────────────
        const { userId } = await auth();
        let profileId: string | null = null;
        let guestId: string | null = null;

        if (userId) {
            const profile = await prisma.profile.findUnique({ where: { clerkId: userId } });
            if (profile) profileId = profile.id;
        } else {
            // Guest path — check cookie token
            const guestToken = req.cookies.get("plans-guest-token")?.value;
            if (!guestToken) {
                return NextResponse.json({ error: "Authentication required" }, { status: 401 });
            }

            // Rate-limit guests by IP
            const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
            const rl = await checkRateLimit(`guest:${ip}`, guestRateLimit);
            if (!rl.success) {
                return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
            }

            const guest = await prisma.guestProfile.findUnique({ where: { token: guestToken } });
            if (!guest) {
                return NextResponse.json({ error: "Invalid guest token" }, { status: 401 });
            }
            guestId = guest.id;
        }

        if (!profileId && !guestId) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        // ── Upsert PulseResponse ──────────────────────────────────────────────
        let response;
        if (profileId) {
            response = await prisma.pulseResponse.upsert({
                where: { pulseId_profileId: { pulseId, profileId } },
                update: { answer },
                create: { pulseId, profileId, answer },
            });
        } else {
            // guestId is non-null here
            response = await prisma.pulseResponse.upsert({
                where: { pulseId_guestId: { pulseId, guestId: guestId! } },
                update: { answer },
                create: { pulseId, guestId: guestId!, answer },
            });
        }

        // ── Count YES responses and check graduation threshold ─────────────────
        const yesCount = await prisma.pulseResponse.count({
            where: { pulseId, answer: "YES" },
        });

        let graduated = false;
        let hangoutSlug: string | undefined;

        if (yesCount >= pulse.graduateThreshold) {
            // Auto-graduate: create a Hangout
            const timeLabel = pulse.targetTime
                .split("_")
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                .join(" ");
            const hangoutTitle = pulse.message || `Plans - ${timeLabel}`;

            const hangout = await prisma.hangout.create({
                data: {
                    title: hangoutTitle,
                    creatorId: pulse.creatorId,
                    status: "PLANNING",
                    type: "CASUAL",
                },
            });

            hangoutSlug = hangout.slug;

            // Update pulse status
            await prisma.pulse.update({
                where: { id: pulseId },
                data: { status: "GRADUATED", graduatedToId: hangout.id },
            });

            graduated = true;

            // Notify all YES respondents
            const yesResponses = await prisma.pulseResponse.findMany({
                where: { pulseId, answer: "YES" },
                select: { profileId: true },
            });
            const yesProfileIds = yesResponses
                .map((r) => r.profileId)
                .filter((id): id is string => id !== null);

            await Promise.allSettled(
                yesProfileIds.map((pid) =>
                    prisma.notification.create({
                        data: {
                            userId: pid,
                            type: "PULSE_GRADUATED",
                            content: `Your plans are happening! ${hangoutTitle} is now a plan.`,
                            link: `/hangouts/${hangout.slug}`,
                        },
                    })
                )
            );
        }

        // ── Notify pulse creator of the response (if not the creator responding) ──
        if (profileId && profileId !== pulse.creatorId) {
            const responderProfile = await prisma.profile.findUnique({
                where: { id: profileId },
                select: { displayName: true },
            });
            const responderName = responderProfile?.displayName ?? "Someone";
            const answerLabel = answer === "YES" ? "said YES" : answer === "MAYBE" ? "said MAYBE" : "said NO";

            await prisma.notification.create({
                data: {
                    userId: pulse.creatorId,
                    type: "PULSE_RESPONSE",
                    content: `${responderName} ${answerLabel} to your pulse`,
                    link: `/pulse/${pulseId}`,
                },
            }).catch((err) => console.error("Failed to create creator notification:", err));

            // Push to creator
            try {
                await sendPushToUser(pulse.creatorId, {
                    title: "Pulse response",
                    body: `${responderName} ${answerLabel} to your pulse`,
                    url: `/pulse/${pulseId}`,
                });
            } catch (err) {
                console.error("Push to creator failed (non-fatal):", err);
            }
        }

        return NextResponse.json({
            answer,
            pulseId,
            ...(graduated && { graduated: true, hangoutSlug }),
        });
    } catch (error: any) {
        console.error("Error responding to pulse:", error);
        return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
    }
}
