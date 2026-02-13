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

