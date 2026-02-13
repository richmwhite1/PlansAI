
import { searchTextPlaces } from "../src/lib/google-places";

async function main() {
    console.log("Debugging Google Places Search (New API)...");

    const lat = 40.7128; // NYC
    const lng = -74.0060;

    try {
        console.log("Searching for 'Bowling'...");
        const results = await searchTextPlaces("Bowling", lat, lng, 5000);

        if (results.length > 0) {
            console.log(`✅ Success! Found ${results.length} results.`);
            console.log("First result:", results[0].name);
        } else {
            console.log("❌ No results returned.");
        }
    } catch (error) {
        console.error("❌ Exception:", error);
    }
}

main();
