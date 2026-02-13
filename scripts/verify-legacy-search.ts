
import { searchTextPlaces } from "../src/lib/google-places";

async function main() {
    console.log("Testing Legacy Google Places Search...");

    // 40.7128, -74.0060 (NYC)
    const lat = 40.7128;
    const lng = -74.0060;

    try {
        const results = await searchTextPlaces("Bowling", lat, lng, 5000);
        console.log(`Found ${results.length} results for 'Bowling'.`);

        if (results.length > 0) {
            console.log("First result:", JSON.stringify(results[0], null, 2));
            console.log("✅ Legacy Search is working.");
        } else {
            console.error("❌ Legacy Search returned no results.");
        }
    } catch (error) {
        console.error("❌ Error running search:", error);
    }
}

main();
