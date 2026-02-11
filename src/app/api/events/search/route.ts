import { NextRequest, NextResponse } from "next/server";
import { searchCachedEvents } from "@/lib/cache/event-cache";
import { calculateTrustScore } from "@/lib/ai/trust-score";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { query, latitude, longitude, radius = 5000, friendIds } = body;

        console.log(`Search request: "${query}" at ${latitude}, ${longitude}`);

        if (!query || !latitude || !longitude) {
            return NextResponse.json({ error: "Query and Location required" }, { status: 400 });
        }

        // 1. Search (Cache -> Google Text Search)
        const candidates = await searchCachedEvents(query, latitude, longitude, radius);

        // 2. Calculate Trust Scores (if we have friends)
        let results = candidates.map(c => ({
            ...c,
            matchPercentage: 0,
            reason: "Found via search"
        }));

        if (friendIds && friendIds.length > 0) {
            const scored = await Promise.all(candidates.map(async (event) => {
                const { score, reason } = await calculateTrustScore(event, friendIds);
                return {
                    ...event,
                    matchPercentage: Math.round(score * 100),
                    reason
                };
            }));
            // Sort by trust score
            results = scored.sort((a, b) => b.matchPercentage - a.matchPercentage);
        }

        return NextResponse.json({
            activities: results.slice(0, 10)
        });

    } catch (error) {
        console.error("CRITICAL ERROR searching events:", error);
        return NextResponse.json({
            error: "Internal Server Error",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
