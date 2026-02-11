import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

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
