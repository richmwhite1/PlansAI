import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SCENARIO_TEMPLATES } from "@/lib/ai/scenarios";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const lat = parseFloat(searchParams.get("lat") || "37.7749");
        const lng = parseFloat(searchParams.get("lng") || "-122.4194");
        const radius = parseFloat(searchParams.get("radius") || "10"); // miles
        const targetDate = searchParams.get("targetDate");
        const scenarioId = searchParams.get("scenario");

        const scenario = scenarioId ? SCENARIO_TEMPLATES.find(s => s.id === scenarioId) : null;

        const baseWhere: any = {
            latitude: { gte: lat - 0.2, lte: lat + 0.2 },
            longitude: { gte: lng - 0.2, lte: lng + 0.2 },
        };

        if (targetDate) {
            const startOfDay = new Date(targetDate);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(targetDate);
            endOfDay.setHours(23, 59, 59, 999);

            baseWhere.AND = [
                {
                    OR: [
                        { isTimeBound: false },
                        {
                            AND: [
                                { isTimeBound: true },
                                { endsAt: { gte: startOfDay } },
                                { startsAt: { lte: endOfDay } }
                            ]
                        }
                    ]
                }
            ];
        }

        if (scenario) {
            const orConditions = scenario.suggestedCategories.map(cat => ({ category: { contains: cat, mode: 'insensitive' } }));
            if (baseWhere.AND) {
                baseWhere.AND.push({ OR: orConditions });
            } else {
                baseWhere.AND = [{ OR: orConditions }];
            }
        }

        const trendingCount = await prisma.cachedEvent.count({
            where: baseWhere
        });

        let trending;

        if (trendingCount > 0) {
            trending = await prisma.cachedEvent.findMany({
                where: baseWhere,
                orderBy: [
                    { timesSelected: 'desc' },
                    { rating: 'desc' },
                    { createdAt: 'desc' }
                ],
                take: 10
            });
        } else {
            console.log(`[API/Trending] No local events found for lat=${lat}, lng=${lng}. Fetching global trending.`);

            const globalWhere = { ...baseWhere };
            delete globalWhere.latitude;
            delete globalWhere.longitude;

            trending = await prisma.cachedEvent.findMany({
                where: globalWhere,
                orderBy: [
                    { timesSelected: 'desc' },
                    { rating: 'desc' },
                    { createdAt: 'desc' }
                ],
                take: 10
            });
        }

        return NextResponse.json({
            activities: trending.map((a: any) => ({
                id: a.id,
                title: a.name,
                type: a.category,
                matchPercentage: 90, // Static for trending
                reason: scenario ? `Matches ${scenario.name} vibe` : (trendingCount > 0 ? "Trending in your area" : "Global Trending"),
                imageUrl: a.imageUrl,
                rating: a.rating,
                address: a.address
            }))
        });

    } catch (error) {
        console.error("Error fetching trending events:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
