// ... existing imports
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as crypto from "crypto";

// Gemini uses its own API key from Google AI Studio (aistudio.google.com)
// Falls back to GOOGLE_API_KEY if GEMINI_API_KEY is not set (may not have grounding)
const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
const genAI = new GoogleGenerativeAI(geminiApiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

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
function buildEventSearchLinks(query: string, lat: number, lng: number, targetDate: string) {
    const encoded = encodeURIComponent(query);
    const dateFormatted = targetDate; // YYYY-MM-DD
    return {
        eventbrite: `https://www.eventbrite.com/d/--/${encoded}/?start_date=${dateFormatted}`,
        google: `https://www.google.com/search?q=${encoded}+events+near+me+${dateFormatted}`,
        ticketmaster: `https://www.ticketmaster.com/search?q=${encoded}`,
        facebook: `https://www.facebook.com/events/search/?q=${encoded}`,
    };
}

export async function findEventsWithAI(
    query: string,
    lat: number,
    lng: number,
    targetDate: string,
    radiusMiles: number = 50,
    userContext?: string
): Promise<any[]> {
    const contextBlock = userContext ? `\nThe user/group has these preferences: ${userContext}\nPrioritize events that align with these preferences when possible.\n` : "";

    const eventPrompt = `Find real events matching "${query}" happening on or around ${targetDate} within ${radiusMiles} miles of coordinates ${lat}, ${lng}.
${contextBlock}
I need events that are actually scheduled — concerts, festivals, shows, sports games, community events, workshops, etc.

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

Return JSON array only. No markdown, no explanation.`;

    const parseEvents = (text: string, source: string): any[] => {
        try {
            const events = JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
            if (!Array.isArray(events)) return [];
            console.log(`[EventSearch] Found ${events.length} events via ${source}`);
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
                searchLinks: source === "fallback" ? buildEventSearchLinks(query, lat, lng, targetDate) : undefined,
            }));
        } catch {
            return [];
        }
    };

    // 1. Try Gemini with Google Search grounding (requires GEMINI_API_KEY or GCP project with grounding enabled)
    try {
        console.log(`[EventSearch] Trying grounded search for "${query}" on ${targetDate}...`);
        const searchModel = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            tools: [{ googleSearch: {} } as any],
        });
        const result = await searchModel.generateContent(eventPrompt);
        const text = result.response.text();
        const events = parseEvents(text, "grounded");
        if (events.length > 0) return events;
    } catch (groundingError: any) {
        const isDisabled = groundingError?.message?.includes("SERVICE_DISABLED") || groundingError?.status === 403;
        console.warn(`[EventSearch] Grounded search ${isDisabled ? "API disabled" : "failed"} — trying base model fallback`);
    }

    // 2. Fallback: base Gemini model (no real-time web, but knows about recurring/typical events)
    try {
        console.log(`[EventSearch] Base model fallback for "${query}" on ${targetDate}...`);
        const fallbackPrompt = `You are a local events assistant. Based on your knowledge, suggest ${query} events that TYPICALLY happen in or near coordinates ${lat}, ${lng} (approximately ${radiusMiles} miles radius) on weekends and evenings. The target date is ${targetDate}.

Focus on recurring venues, clubs, theaters, stadiums that regularly host this type of event. Include the most well-known venues for "${query}" in this area.

Return a JSON array of up to 6 suggestions. Include:
- "name": Event/show name or "Comedy Night at [Venue]" style
- "venue": The venue name
- "address": Approximate address
- "date": "${targetDate}"
- "time": Typical show time (e.g. "8:00 PM") or null
- "description": 1-2 sentence description
- "category": Category string
- "ticketUrl": Venue website or ticketing page URL if you know it
- "priceRange": Typical price range or null
- "performers": Array of typical performers (can be empty)
- "lat": Venue latitude
- "lng": Venue longitude

Return JSON array only. No markdown.`;

        const result = await model.generateContent(fallbackPrompt);
        const text = result.response.text();
        const events = parseEvents(text, "fallback");
        return events;
    } catch (fallbackError) {
        console.error("[EventSearch] Both grounded and fallback searches failed:", fallbackError);
        return [];
    }
}
