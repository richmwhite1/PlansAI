import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { searchCachedEvents } from "@/lib/cache/event-cache";
import { calculateTrustScore } from "@/lib/ai/trust-score";
import { buildGroupContext, buildHangoutHistoryContext } from "@/lib/ai/user-context";
import { auth } from "@clerk/nextjs/server";

// In a real app, we'd use an LLM here to expand the query.
// For now, we'll simulate the "AI Search" by being more aggressive with the search parameters
// and providing better reasoning.

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        console.log("AI Find Activities Body:", JSON.stringify(body, null, 2));

        const { query, latitude, longitude, radius = 25000, friendIds, targetDate, scenario } = body;

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
        let candidates = await searchCachedEvents(aiEnhancedQuery, latitude, longitude, radius, 15, targetDate ? new Date(targetDate) : undefined);

        // Build user/group context for personalized AI fallback
        let userContext = "";
        try {
            const { userId } = await auth();
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
        } catch (ctxErr) {
            console.error("Failed to build user context (non-fatal):", ctxErr);
        }

        const fullContext = userContext || undefined;

        // 3. AI Fallback if Google/Cache fails
        if (candidates.length < 3) {
            console.log("Insufficient results from Google/Cache. AI Fallback triggered.");
            const { findPlacesWithAI, findEventsWithAI } = await import("@/lib/ai/gemini");

            // Determine a target date for event search (use provided or default to today)
            const eventTargetDate = targetDate
                ? new Date(targetDate).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0];

            // Run places + real events search in parallel
            const [aiPlaces, aiEvents] = await Promise.all([
                findPlacesWithAI(aiEnhancedQuery, latitude, longitude, fullContext),
                findEventsWithAI(aiEnhancedQuery, latitude, longitude, eventTargetDate, 50, fullContext),
            ]);

            // Pass through AI places as ephemeral candidates (no DB seeding)
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

            // Pass through AI event results as ephemeral candidates
            for (const event of aiEvents) {
                // Avoid duplicates
                if (!candidates.some(c => c.id === event.id)) {
                    candidates.push(event);
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
