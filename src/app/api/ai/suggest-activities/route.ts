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
        const candidates = await getCachedEvents(latitude, longitude, radius);

        // 2. Calculate Trust Scores
        // In real implementation: Fetch participant profiles -> Calculate overlap

        const candidatesWithScores = await Promise.all(candidates.map(async (event) => {
            const { score, reason } = await calculateTrustScore(event, friendIds || []);

            return {
                ...event,
                matchPercentage: Math.round(score * 100),
                reason
            };
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
