import { NextRequest, NextResponse } from "next/server";
import { getCachedEvents } from "@/lib/cache/event-cache";
import { prisma } from "@/lib/prisma";
import { calculateTrustScoresBulk } from "@/lib/ai/trust-score";
import { buildGroupContext, buildHangoutHistoryContext } from "@/lib/ai/user-context";
import { auth } from "@clerk/nextjs/server";
import { checkRateLimit, aiRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Authentication required for AI features" }, { status: 401 });
        }

        const rateLimitResult = await checkRateLimit(`ai:${userId}`, aiRateLimit);
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { error: "AI usage limit reached. Try again in an hour.", reset: rateLimitResult.reset },
                { status: 429 }
            );
        }

        const body = await req.json();
        const { hangoutId, latitude, longitude, radius = 5000, friendIds, targetDate, scenario, persistScores } = body;

        if (!latitude || !longitude) {
            return NextResponse.json({ error: "Location required" }, { status: 400 });
        }

        // 1. Get Candidates (Cache -> Google)
        let candidates = await getCachedEvents(latitude, longitude, radius, 20, targetDate ? new Date(targetDate) : undefined);

        // Build user context
        let fullContextString: string | undefined = undefined;
        try {
            let userContext = "";
            const profile = await prisma.profile.findUnique({ where: { clerkId: userId }, select: { id: true } });
            if (profile) {
                const allIds = [profile.id, ...(friendIds || [])];
                const [groupCtx, historyCtx] = await Promise.all([
                    buildGroupContext(allIds),
                    buildHangoutHistoryContext(profile.id),
                ]);
                userContext = [groupCtx, historyCtx].filter(Boolean).join(" ");
            }
            fullContextString = userContext || undefined;
        } catch (e) {
            console.error("Context build error:", e);
        }

        // FALLBACK: If we have few/no results (e.g. Google quota or empty area), fetch Global Top Rated
        if (candidates.length < 3) {
            console.log("[AI/Suggest] Insufficient local candidates. Fetching global fallback.");
            const globalFallback = await prisma.cachedEvent.findMany({
                orderBy: [
                    { timesSelected: 'desc' },
                    { rating: 'desc' },
                ],
                take: 10
            });

            // Deduplicate
            const existingIds = new Set(candidates.map(c => c.id));
            const newFallback = globalFallback.filter(c => !existingIds.has(c.id));
            candidates = [...candidates, ...newFallback];
        }

        // 2. Calculate Trust Scores — single DB fetch for all candidates
        let candidatesWithScores: any[];
        try {
            const scores = await calculateTrustScoresBulk(candidates as any[], friendIds || []);
            candidatesWithScores = candidates.map((event, i) => ({
                ...event,
                matchPercentage: Math.round(scores[i].score * 100),
                reason: scores[i].reason,
            }));
        } catch (err) {
            console.error("Bulk trust score error:", err);
            candidatesWithScores = candidates.map((event) => ({
                ...event,
                matchPercentage: 70,
                reason: "Popular nearby",
            }));
        }

        // 3. Sort by score
        const sorted = candidatesWithScores.sort((a, b) => b.matchPercentage - a.matchPercentage);
        const top5 = sorted.slice(0, 5);

        // 4. If a hangoutId is provided and persistScores is requested, back-fill match scores
        if (hangoutId && persistScores) {
            await Promise.allSettled(
                top5.map(activity =>
                    prisma.hangoutActivityOption.updateMany({
                        where: { hangoutId, cachedEventId: activity.id },
                        data: {
                            matchScore: activity.matchPercentage,
                            matchReasoning: activity.reason ?? null,
                        },
                    })
                )
            );
        }

        return NextResponse.json({
            activities: top5
        });

    } catch (error) {
        console.error("CRITICAL ERROR suggesting activities:", error);
        return NextResponse.json({
            error: "Internal Server Error",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
