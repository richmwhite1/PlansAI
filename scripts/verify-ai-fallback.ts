
import { prisma } from "../src/lib/prisma";

async function main() {
    console.log("Testing AI Search Fallback...");

    // 1. Call the API (simulated via fetch to localhost if running, or just invoking logic if we could, but let's use fetch to test the route)
    // Actually, calling the route handler directly is hard from a script without mocking Request.
    // Let's just use the internal logic functions to test integration, or fetch if server is up.
    // The server is up on 3001.

    const url = "http://localhost:3001/api/ai/find-activities";
    const body = {
        query: "Bowling",
        latitude: 40.7128,
        longitude: -74.0060,
        friendIds: []
    };

    try {
        console.log(`fetching ${url}...`);
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            console.error("API Error:", res.status, await res.text());
            return;
        }

        const data = await res.json();
        console.log(`Response received. isAiResult: ${data.isAiResult}`);
        console.log(`Found ${data.activities?.length || 0} activities.`);

        if (data.activities?.length > 0) {
            console.log("First Activity:", data.activities[0].name);
            console.log("Category:", data.activities[0].category);
            console.log("Subcategory:", data.activities[0].subcategory); // Should be 'AI Generated'
        }

        // 2. Verify DB persistence
        if (data.activities?.length > 0) {
            const firstId = data.activities[0].id;
            // Ensure it's in DB (by id or googlePlaceId)
            // The route returns the candidates, and upsert returns the object with ID.
            // If searchCachedEvents returns objects, they have IDs.
            // The AI upsert creates them.

            // Wait a moment for async operations if any (though upsert was awaited)
            console.log("Verifying DB persistence...");
            const dbCheck = await prisma.cachedEvent.findFirst({
                where: { name: data.activities[0].name }
            });

            if (dbCheck) {
                console.log("✅ Confirmed: Event saved to DB with ID:", dbCheck.id);
                console.log("Source/Subcategory:", dbCheck.subcategory);
            } else {
                console.error("❌ Event not found in DB!");
            }
        }

    } catch (err) {
        console.error("Test failed:", err);
    }
}

main();
