import { NextRequest, NextResponse } from "next/server";
import { findEventsWithAI } from "@/lib/ai/gemini";
import { buildGroupContext, buildHangoutHistoryContext } from "@/lib/ai/user-context";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { query, latitude, longitude, radiusMiles = 50, scenario = null } = body;
        // Default targetDate to today if not provided
        const targetDate: string = body.targetDate || new Date().toISOString().split("T")[0];

        if (!query || !latitude || !longitude) {
            return NextResponse.json(
                { error: "query, latitude, and longitude are required" },
                { status: 400 }
            );
        }

        console.log(`[EventDiscover] "${query}" on ${targetDate} at ${latitude},${longitude}`);

        // Build user context for personalized results
        let userContext = "";
        try {
            const { userId } = await auth();
            if (userId) {
                const profile = await prisma.profile.findUnique({ where: { clerkId: userId }, select: { id: true } });
                if (profile) {
                    const [groupCtx, historyCtx] = await Promise.all([
                        buildGroupContext([profile.id]),
                        buildHangoutHistoryContext(profile.id),
                    ]);
                    userContext = [groupCtx, historyCtx].filter(Boolean).join(" ");
                }
            }
        } catch (ctxErr) {
            // Non-fatal — proceed without context
        }
        const fullContext = userContext || undefined;

        const events = await findEventsWithAI(query, latitude, longitude, targetDate, radiusMiles, fullContext);

        // Format for frontend consumption
        const formatted = events.map((e: any) => ({
            id: e.id,
            name: e.name,
            description: e.description,
            category: e.category,
            venue: e.subcategory || "",
            address: e.address,
            latitude: e.latitude,
            longitude: e.longitude,
            imageUrl: e.imageUrl || null,
            rating: e.rating || null,
            isTimeBound: true,
            startsAt: e.startsAt,
            ticketUrl: e.ticketUrl || null,
            eventUrl: e.eventUrl || null,
            priceRange: e.priceRange || null,
            performers: e.performers || [],
            matchPercentage: 95,
            reason: "AI identified this activity for you",
            searchLinks: e.searchLinks || null,
            isSuggested: !!e.searchLinks, // true = AI suggestion (not verified real-time), false = grounded result
        }));

        // Always include platform links so users can find verified real-time events
        const hasSuggested = formatted.some(e => e.isSuggested);
        const platformLinks = {
            eventbrite: `https://www.eventbrite.com/d/--/${encodeURIComponent(query)}/?start_date=${targetDate}`,
            google: `https://www.google.com/search?q=${encodeURIComponent(query + " events " + targetDate)}`,
            ticketmaster: `https://www.ticketmaster.com/search?q=${encodeURIComponent(query)}`,
            facebook: `https://www.facebook.com/events/search/?q=${encodeURIComponent(query)}`,
        };

        return NextResponse.json({
            events: formatted,
            count: formatted.length,
            query,
            targetDate,
            hasSuggested,
            platformLinks,
        });

    } catch (error) {
        console.error("[EventDiscover] Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
