import { NextRequest, NextResponse } from "next/server";
import { getCachedEvents } from "@/lib/cache/event-cache";
import { prisma } from "@/lib/prisma";
import { calculateTrustScore } from "@/lib/ai/trust-score";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { hangoutId, latitude, longitude, radius = 5000, friendIds } = body;

        if (!latitude || !longitude) {
            return NextResponse.json({ error: "Location required" }, { status: 400 });
        }

        // 1. Get Candidates (Cache -> Google)
        let candidates = await getCachedEvents(latitude, longitude, radius);

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
                const { score, reason } = await calculateTrustScore(event, friendIds || []);
                return {
                    ...event,
                    matchPercentage: Math.round(score * 100),
                    reason
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
