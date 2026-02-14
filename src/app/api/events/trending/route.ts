import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const lat = parseFloat(searchParams.get("lat") || "37.7749");
        const lng = parseFloat(searchParams.get("lng") || "-122.4194");
        const radius = parseFloat(searchParams.get("radius") || "10"); // miles

        // DB Debugging: Log the connection URL (masked) to verify which DB is being used
        const dbUrl = process.env.DATABASE_URL || "unknown";
        const maskedDbUrl = dbUrl.replace(/:([^:@]+)@/, ":****@");
        console.log(`[API/Trending] Connected to DB: ${maskedDbUrl}`);

        // Simplified trending: Recently added or highly rated in the area
        const trendingCount = await prisma.cachedEvent.count({
            where: {
                latitude: { gte: lat - 0.2, lte: lat + 0.2 },
                longitude: { gte: lng - 0.2, lte: lng + 0.2 },
            }
        });

        let trending;

        if (trendingCount > 0) {
            trending = await prisma.cachedEvent.findMany({
                where: {
                    latitude: { gte: lat - 0.2, lte: lat + 0.2 },
                    longitude: { gte: lng - 0.2, lte: lng + 0.2 },
                },
                orderBy: [
                    { timesSelected: 'desc' },
                    { rating: 'desc' },
                    { createdAt: 'desc' }
                ],
                take: 10
            });
        } else {
            // Fallback: Fetch global trending events if no local events found
            console.log(`[API/Trending] No local events found for lat=${lat}, lng=${lng}. Fetching global trending.`);
            trending = await prisma.cachedEvent.findMany({
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
                reason: trendingCount > 0 ? "Trending in your area" : "Global Trending",
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
