import { NextRequest, NextResponse } from "next/server";
import { searchCachedEvents } from "@/lib/cache/event-cache";
import { calculateTrustScore } from "@/lib/ai/trust-score";

// In a real app, we'd use an LLM here to expand the query.
// For now, we'll simulate the "AI Search" by being more aggressive with the search parameters
// and providing better reasoning.

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        console.log("AI Find Activities Body:", JSON.stringify(body, null, 2));

        const { query, latitude, longitude, radius = 25000, friendIds } = body;

        if (!query || latitude === undefined || longitude === undefined || latitude === null || longitude === null) {
            console.error("AI Search validation failed:", { query, latitude, longitude });
            return NextResponse.json({
                error: "Query and Location required",
                received: { query, latitude, longitude, body },
            }, { status: 400 });
        }

        // 1. AI Expansion (Implicitly handled by Google's semantic search, but we could add terms here)
        // For example, if they search "chill", we might add "cafe", "park", "lounge"
        const aiEnhancedQuery = query;

        // 2. Search (Larger radius and more aggressive fallback)
        const candidates = await searchCachedEvents(aiEnhancedQuery, latitude, longitude, radius, 15);

        // 3. Calculate Trust Scores and add "AI Reasoning"
        const results = await Promise.all(candidates.map(async (event) => {
            const { score, reason } = await calculateTrustScore(event, friendIds || []);

            return {
                ...event,
                matchPercentage: Math.round(score * 100),
                reason: `AI matched "${query}" to this: ${reason}`
            };
        }));

        // 4. Sort and return
        const sorted = results.sort((a, b) => b.matchPercentage - a.matchPercentage);

        return NextResponse.json({
            activities: sorted.slice(0, 8),
            isAiResult: true
        });

    } catch (error) {
        console.error("CRITICAL ERROR in AI find-activities:", error);
        return NextResponse.json({
            error: "Internal Server Error",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
