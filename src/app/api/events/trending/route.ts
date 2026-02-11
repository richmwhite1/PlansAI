import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const lat = parseFloat(searchParams.get("lat") || "37.7749");
        const lng = parseFloat(searchParams.get("lng") || "-122.4194");
        const radius = parseFloat(searchParams.get("radius") || "10"); // miles

        // Simplified trending: Recently added or highly rated in the area
        const trendingCount = await prisma.cachedEvent.count({
            where: {
                latitude: { gte: lat - 0.2, lte: lat + 0.2 },
                longitude: { gte: lng - 0.2, lte: lng + 0.2 },
            }
        });

        const trending = await prisma.cachedEvent.findMany({
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

        return NextResponse.json({
            activities: trending.map((a: any) => ({
                id: a.id,
                title: a.name,
                type: a.category,
                matchPercentage: 90, // Static for trending
                reason: "Trending in your area",
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
