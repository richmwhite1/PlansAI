import { NextRequest, NextResponse } from "next/server";
import { getCachedEvents } from "@/lib/cache/event-cache";
import { prisma } from "@/lib/prisma";
import { calculateTrustScore } from "@/lib/ai/trust-score";
import { buildGroupContext, buildHangoutHistoryContext } from "@/lib/ai/user-context";
import { buildScenarioContext } from "@/lib/ai/scenarios";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { hangoutId, latitude, longitude, radius = 5000, friendIds, targetDate, scenario } = body;

        if (!latitude || !longitude) {
            return NextResponse.json({ error: "Location required" }, { status: 400 });
        }

        // 1. Get Candidates (Cache -> Google)
        let candidates = await getCachedEvents(latitude, longitude, radius, 20, targetDate ? new Date(targetDate) : undefined);

        // Build user context
        let fullContextString: string | undefined = undefined;
        try {
            const { userId } = await auth();
            let userContext = "";
            if (userId) {
                const profile = await prisma.profile.findUnique({ where: { clerkId: userId }, select: { id: true } });
                if (profile) {
                    const allIds = [profile.id, ...(friendIds || [])];
                    const [groupCtx, historyCtx] = await Promise.all([
                        buildGroupContext(allIds),
                        buildHangoutHistoryContext(profile.id),
                    ]);
                    userContext = [groupCtx, historyCtx].filter(Boolean).join(" ");
                }
            }
            const scenarioCtx = buildScenarioContext(scenario);
            fullContextString = [userContext, scenarioCtx].filter(Boolean).join(" ") || undefined;
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

        // 2. Calculate Trust Scores
        // In real implementation: Fetch participant profiles -> Calculate overlap

        const candidatesWithScores = await Promise.all(candidates.map(async (event) => {
            try {
                // In the future, pass fullContextString into calculateTrustScore or similar
                const { score, reason } = await calculateTrustScore(event, friendIds || []);

                // If scenario is set, boost score slightly if category matches (simple heuristic)
                let finalScore = score;
                let finalReason = reason;

                if (scenario === 'date-night' && (event.category === 'restaurant' || event.category === 'Arts')) finalScore = Math.min(1, finalScore + 0.1);
                if (scenario === 'outdoor-adventure' && event.category === 'activity') finalScore = Math.min(1, finalScore + 0.1);
                if (scenario === 'coffee-chat' && event.category === 'restaurant') finalScore = Math.min(1, finalScore + 0.1);

                return {
                    ...event,
                    matchPercentage: Math.round(finalScore * 100),
                    reason: finalReason
                };
            } catch (err) {
                console.error(`Error calculating score for event ${event.id}:`, err);
                return {
                    ...event,
                    matchPercentage: 70, // Default safe score
                    reason: "Popular Global Option"
                };
            }
        }));

        // 3. Sort by score
        const sorted = candidatesWithScores.sort((a, b) => b.matchPercentage - a.matchPercentage);

        return NextResponse.json({
            activities: sorted.slice(0, 5) // Return top 5
        });

    } catch (error) {
        console.error("CRITICAL ERROR suggesting activities:", error);
        return NextResponse.json({
            error: "Internal Server Error",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
