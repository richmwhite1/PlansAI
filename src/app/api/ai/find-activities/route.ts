import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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
        let candidates = await searchCachedEvents(aiEnhancedQuery, latitude, longitude, radius, 15);

        // 3. AI Fallback if Google/Cache fails
        if (candidates.length < 3) {
            console.log("Insufficient results from Google/Cache. innovative AI Fallback triggered.");
            const { findPlacesWithAI } = await import("@/lib/ai/gemini");
            const aiPlaces = await findPlacesWithAI(aiEnhancedQuery, latitude, longitude);

            // Seed these into the DB so they are real selectable options
            for (const place of aiPlaces) {
                try {
                    // Create a deterministic but unique ID for the "googlePlaceId" field to avoid collisions
                    // We use a prefix to identify it as AI generated
                    const aiId = `ai_gen_${place.name.replace(/\s+/g, '_').toLowerCase()}_${Math.floor(place.lat * 100)}_${Math.floor(place.lng * 100)}`;

                    const saved = await prisma.cachedEvent.upsert({
                        where: { googlePlaceId: aiId },
                        update: {}, // If exists, just use it
                        create: {
                            googlePlaceId: aiId,
                            name: place.name,
                            description: place.description,
                            category: place.category || "Activity",
                            subcategory: "AI Generated",
                            address: place.address,
                            latitude: place.lat,
                            longitude: place.lng,
                            rating: 4.5, // AI confidence assumption
                            reviewCount: 10,
                            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days
                            staleAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
                            imageUrl: undefined // We don't have a photo yet
                        }
                    });
                    candidates.push(saved);
                } catch (err) {
                    console.error("Failed to seed AI place:", place.name, err);
                }
            }
        }

        // 4. Calculate Trust Scores and add "AI Reasoning"
        const results = await Promise.all(candidates.map(async (event) => {
            const { score, reason } = await calculateTrustScore(event, friendIds || []);

            return {
                ...event,
                matchPercentage: Math.round(score * 100),
                reason: `AI matched "${query}" to this: ${reason}`
            };
        }));

        // 5. Sort and return
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
