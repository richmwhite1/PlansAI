// ... existing imports
import { GoogleGenerativeAI } from "@google/generative-ai";
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

export async function findPlacesWithAI(query: string, lat: number, lng: number, userContext?: string): Promise<any[]> {
    const contextBlock = userContext ? `\nUser/Group context: ${userContext}\nPrioritize results that match these preferences.\n` : "";

    const prompt = `
        You are a local expert for the area around Latitude: ${lat}, Longitude: ${lng}.
        The user is searching for: "${query}".
        ${contextBlock}
        Provide 5 REAL, EXISTING places that match this query in this area.
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

        // Return ephemeral results with temp IDs (not cached — only seeded when user selects)
        return places.map((p: any, i: number) => ({
            ...p,
            id: `ai_ephemeral_${Date.now()}_${i}`,
            source: "AI_EPHEMERAL",
        }));
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
    radiusMiles: number = 50,
    userContext?: string
): Promise<any[]> {
    // Use Gemini with Google Search grounding to find real events
    const searchModel = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        tools: [{ googleSearch: {} } as any],
    });

    const contextBlock = userContext ? `\nThe user/group has these preferences: ${userContext}\nPrioritize events that align with these preferences when possible.\n` : "";

    const prompt = `Find real events matching "${query}" happening on or around ${targetDate} within ${radiusMiles} miles of coordinates ${lat}, ${lng}.
${contextBlock}
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

        // Return ephemeral results (not cached — only seeded when user selects for a hangout)
        return events.map((e: any, i: number) => ({
            id: `ai_event_${Date.now()}_${i}`,
            name: e.name || "Unknown Event",
            description: e.description || "",
            category: e.category || "Other",
            subcategory: e.venue || "",
            address: e.address || "",
            latitude: e.lat || lat,
            longitude: e.lng || lng,
            source: "AI_EPHEMERAL",
            isTimeBound: true,
            startsAt: new Date(e.date || targetDate),
            endsAt: (() => { const d = new Date(e.date || targetDate); d.setHours(23, 59, 59, 999); return d; })(),
            ticketUrl: e.ticketUrl || null,
            eventUrl: e.ticketUrl || null,
            priceRange: e.priceRange || null,
            performers: e.performers || [],
            rating: null,
        }));

    } catch (error) {
        console.error("[EventSearch] Gemini event search failed:", error);
        return [];
    }
}
