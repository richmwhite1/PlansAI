// ... existing imports
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";
import * as crypto from "crypto";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

function hashQuery(query: string, lat: number, lng: number): string {
    return crypto.createHash("md5").update(`${query}:${lat.toFixed(2)}:${lng.toFixed(2)}`).digest("hex");
}

export async function extractVibesFromReflection(reflection: string) {
    const prompt = `
        You are a social vibe analyst for an app called "Plans".
        A user has provided feedback/reflections on a recent hangout.
        
        Feedback: "${reflection}"
        
        Extract the following in JSON format:
        - "vibes": An array of strings representing the overall atmosphere or personality of the event (e.g. "chill", "high-energy", "sophisticated", "casual", "foodie", "active").
        - "keywords": An array of strings representing specific interests or topics mentioned (e.g. "sushi", "hiking", "board games", "jazz").
        - "summary": A very brief 1-sentence summary of the experience.
        
        JSON only. No markdown formatting.
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(text);
    } catch (error) {
        console.error("Gemini vibe extraction failed:", error);
        return { vibes: ["casual"], keywords: [], summary: "A nice hangout." };
    }
}

export async function findPlacesWithAI(query: string, lat: number, lng: number): Promise<any[]> {
    // Check cache first — look for AI-generated results matching this query hash
    const queryHash = hashQuery(query, lat, lng);
    const cached = await prisma.cachedEvent.findMany({
        where: {
            source: "AI_GENERATED",
            externalId: queryHash,
            expiresAt: { gt: new Date() },
        },
        take: 5,
    });

    if (cached.length >= 3) {
        console.log(`AI cache hit for "${query}" (${cached.length} results)`);
        return cached.map(c => ({
            name: c.name,
            address: c.address || "",
            description: c.description || "",
            category: c.category,
            lat: c.latitude,
            lng: c.longitude,
        }));
    }

    const prompt = `
        You are a local expert for the area around Latitude: ${lat}, Longitude: ${lng}.
        The user is searching for: "${query}".
        
        The Google Places API is currently unavailable, so you need to provide 5 REAL, EXISTING places that match this query in this area.
        If you are unsure of exact specific places, provide the most famous/popular ones you know of in the general vicinity (City/Neighborhood).
        
        Return a JSON array of objects with these fields:
        - "name": The name of the place.
        - "address": The approximate address or cross-streets.
        - "description": A short, inviting description (1 sentence).
        - "category": One of [Food, Activity, Nightlife, Other].
        - "lat": Approximate latitude (number).
        - "lng": Approximate longitude (number).
        
        JSON only. No markdown. Array of 5 items.
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().replace(/```json/g, "").replace(/```/g, "").trim();
        const data = JSON.parse(text);
        const places = Array.isArray(data) ? data : [];

        // Cache AI results in DB
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days
        const staleAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 3);   // 3 days

        for (const place of places) {
            try {
                await prisma.cachedEvent.create({
                    data: {
                        name: place.name,
                        description: place.description || "",
                        category: place.category || "Other",
                        address: place.address || "",
                        latitude: place.lat || lat,
                        longitude: place.lng || lng,
                        source: "AI_GENERATED",
                        externalId: queryHash,
                        expiresAt,
                        staleAt,
                    } as any,
                });
            } catch (err) {
                // Ignore duplicate errors
            }
        }

        return places;
    } catch (error) {
        console.error("Gemini place search failed:", error);
        return [];
    }
}

/**
 * Find REAL, TIME-BOUND EVENTS (concerts, festivals, shows, etc.)
 * using Gemini with Google Search grounding.
 * 
 * This is the core event discovery engine. It searches the web for actual
 * events happening on a specific date near a given location.
 * Results are cached aggressively so one search serves all users in the area.
 */
export async function findEventsWithAI(
    query: string,
    lat: number,
    lng: number,
    targetDate: string, // ISO date string like "2026-02-26"
    radiusMiles: number = 50
): Promise<any[]> {
    // 1. Check cache first
    const cacheKey = `events:${query}:${targetDate}:${lat.toFixed(1)}:${lng.toFixed(1)}`;
    const queryHash = hashQuery(cacheKey, lat, lng);

    const cached = await prisma.cachedEvent.findMany({
        where: {
            source: "AI_GENERATED",
            externalId: queryHash,
            isTimeBound: true,
            expiresAt: { gt: new Date() },
        },
        take: 10,
    });

    if (cached.length >= 3) {
        console.log(`[EventSearch] Cache hit for "${query}" on ${targetDate} (${cached.length} results)`);
        return cached;
    }

    // 2. Use Gemini with Google Search grounding to find real events
    const searchModel = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        tools: [{ googleSearch: {} } as any],
    });

    const prompt = `Find real events matching "${query}" happening on or around ${targetDate} within ${radiusMiles} miles of coordinates ${lat}, ${lng}.

I need REAL events that are actually scheduled — concerts, festivals, shows, sports games, community events, workshops, etc.

Return a JSON array of up to 8 events. Each event object must have:
- "name": The event name (string)
- "venue": The venue/location name (string)
- "address": Full address (string)
- "date": The event date in YYYY-MM-DD format (string)
- "time": Start time like "7:00 PM" (string or null)
- "description": 1-2 sentence description (string)
- "category": One of ["Music", "Sports", "Arts", "Comedy", "Festival", "Community", "Food", "Nightlife", "Other"] (string)
- "ticketUrl": Direct URL to buy tickets or event page (string or null)
- "priceRange": e.g. "$25-$75" or "Free" (string or null)
- "performers": Array of performer/artist names (string array, can be empty)
- "lat": Approximate latitude (number)
- "lng": Approximate longitude (number)

CRITICAL: Only include events you can verify are real and actually happening. Do NOT make up events.
Return JSON array only. No markdown, no explanation.`;

    try {
        console.log(`[EventSearch] Searching for "${query}" on ${targetDate} near ${lat},${lng}...`);
        const result = await searchModel.generateContent(prompt);
        const response = await result.response;
        const text = response.text().replace(/```json/g, "").replace(/```/g, "").trim();

        let events: any[] = [];
        try {
            events = JSON.parse(text);
            if (!Array.isArray(events)) events = [];
        } catch (parseErr) {
            console.error("[EventSearch] Failed to parse AI response:", text.substring(0, 200));
            return [];
        }

        console.log(`[EventSearch] Found ${events.length} events for "${query}" on ${targetDate}`);

        // 3. Cache results in DB
        const savedEvents: any[] = [];
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 3); // 3 day cache
        const staleAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 1);   // 1 day stale

        for (const event of events) {
            try {
                // Parse the event date for startsAt/endsAt
                const eventDate = new Date(event.date || targetDate);
                const endsAt = new Date(eventDate);
                endsAt.setHours(23, 59, 59, 999);

                const saved = await prisma.cachedEvent.create({
                    data: {
                        name: event.name || "Unknown Event",
                        description: event.description || "",
                        category: event.category || "Other",
                        subcategory: event.venue || "",
                        address: event.address || "",
                        latitude: event.lat || lat,
                        longitude: event.lng || lng,
                        source: "AI_GENERATED",
                        externalId: queryHash,
                        isTimeBound: true,
                        startsAt: eventDate,
                        endsAt: endsAt,
                        ticketUrl: event.ticketUrl || null,
                        eventUrl: event.ticketUrl || null,
                        priceRange: event.priceRange || null,
                        performers: event.performers || [],
                        vibes: [],
                        expiresAt,
                        staleAt,
                    } as any,
                });
                savedEvents.push(saved);
            } catch (err) {
                // Ignore duplicate errors
                console.error(`[EventSearch] Failed to cache event "${event.name}":`, err);
            }
        }

        return savedEvents.length > 0 ? savedEvents : events.map((e: any) => ({
            id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            name: e.name,
            description: e.description,
            category: e.category,
            subcategory: e.venue,
            address: e.address,
            latitude: e.lat || lat,
            longitude: e.lng || lng,
            isTimeBound: true,
            startsAt: new Date(e.date || targetDate),
            ticketUrl: e.ticketUrl,
            priceRange: e.priceRange,
            performers: e.performers || [],
        }));

    } catch (error) {
        console.error("[EventSearch] Gemini event search failed:", error);
        return [];
    }
}
