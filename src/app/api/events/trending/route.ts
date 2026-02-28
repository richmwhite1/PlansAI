import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const lat = parseFloat(searchParams.get("lat") || "37.7749");
        const lng = parseFloat(searchParams.get("lng") || "-122.4194");
        const radiusMiles = parseFloat(searchParams.get("radius") || "10");
        const targetDate = searchParams.get("targetDate");

        const latDegrees = radiusMiles / 69.0;
        const lngDegrees = radiusMiles / (69.0 * Math.cos(lat * (Math.PI / 180)));

        const baseWhere: any = {
            latitude: { gte: lat - latDegrees, lte: lat + latDegrees },
            longitude: { gte: lng - lngDegrees, lte: lng + lngDegrees },
            expiresAt: { gt: new Date() },
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
                take: 50
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
                take: 50
            });
        }

        return NextResponse.json({
            activities: trending.map((a: any) => ({
                id: a.id,
                title: a.name,
                type: a.category,
                matchPercentage: 90, // Static for trending
                reason: trendingCount > 0 ? "Trending in your area" : "Global Trending",
                imageUrl: a.imageUrl,
                rating: a.rating,
                address: a.address,
                timesSelected: a.timesSelected
            }))
        });

    } catch (error) {
        console.error("Error fetching trending events:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
