
import { findPlacesWithAI } from "../src/lib/ai/gemini";

async function main() {
    console.log("Debugging Gemini AI Search...");
    const lat = 40.7128;
    const lng = -74.0060;

    try {
        const results = await findPlacesWithAI("Bowling", lat, lng);
        console.log("Results:", JSON.stringify(results, null, 2));
    } catch (err) {
        console.error("Error:", err);
    }
}

main();
