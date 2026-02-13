
import { calculateDistance } from "../src/lib/utils";

const sf = { lat: 37.7749, lng: -122.4194 };
const nyc = { lat: 40.7128, lng: -74.0060 };
const la = { lat: 34.0522, lng: -118.2437 };

// Distance SF to LA is approx 347 miles
const distSfLa = calculateDistance(sf.lat, sf.lng, la.lat, la.lng);
console.log(`SF to LA: ${distSfLa.toFixed(2)} miles (Expected ~347)`);

// Distance SF to NYC is approx 2565 miles
const distSfNyc = calculateDistance(sf.lat, sf.lng, nyc.lat, nyc.lng);
console.log(`SF to NYC: ${distSfNyc.toFixed(2)} miles (Expected ~2565)`);

if (Math.abs(distSfLa - 347) < 50 && Math.abs(distSfNyc - 2565) < 50) {
    console.log("✅ Distance calculation passed sanity check.");
} else {
    console.error("❌ Distance calculation seems off.");
}
