import { NextRequest, NextResponse } from "next/server";
import { searchCachedEvents } from "@/lib/cache/event-cache";
import { calculateTrustScore } from "@/lib/ai/trust-score";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { query, latitude, longitude, radius = 5000, friendIds, targetDate } = body;

        console.log(`Search request: "${query}" at ${latitude}, ${longitude}, date: ${targetDate}`);

        if (!query || !latitude || !longitude) {
            return NextResponse.json({ error: "Query and Location required" }, { status: 400 });
        }

        // 1. Search (Cache -> Google Text Search)
        let candidates = await searchCachedEvents(query, latitude, longitude, radius, 20, targetDate ? new Date(targetDate) : undefined);

        // 2. AI Fallback if DB is empty
        if (candidates.length < 3) {
            console.log(`[Search] Only ${candidates.length} local results for "${query}". Triggering AI fallback.`);
            try {
                const { findPlacesWithAI } = await import("@/lib/ai/gemini");
                const aiPlaces = await findPlacesWithAI(query, latitude, longitude);

                // Pass through as ephemeral results (no DB seeding)
                for (const place of aiPlaces) {
                    candidates.push({
                        id: place.id,
                        name: place.name,
                        description: place.description || "",
                        category: place.category || "Activity",
                        subcategory: "AI Suggestion",
                        address: place.address || "",
                        latitude: place.lat || latitude,
                        longitude: place.lng || longitude,
                        rating: null,
                        source: "AI_EPHEMERAL",
                    } as any);
                }
            } catch (aiErr) {
                console.error("[Search] AI fallback failed (non-fatal):", aiErr);
            }
        }

        // 3. Calculate Trust Scores (if we have friends)
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
