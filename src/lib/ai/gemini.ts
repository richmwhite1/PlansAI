// ... existing imports
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
        console.log("Gemini Raw Output:", text); // Debug log
        const data = JSON.parse(text);
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error("Gemini place search failed:", error);
        return [];
    }
}
