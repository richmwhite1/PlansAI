import { prisma } from "@/lib/prisma";
import { searchNearbyPlaces, GooglePlace } from "@/lib/google-places";
// import { CachedEvent } from "@prisma/client";
type CachedEvent = any;

export async function getCachedEvents(
    latitude: number,
    longitude: number,
    radiusMeters: number = 5000,
    limit: number = 20
): Promise<CachedEvent[]> {
    // 1. Calculate rough bounding box for DB search (optimisation)
    const latDegrees = radiusMeters / 111000; // Rough conversion
    const lngDegrees = radiusMeters / (111000 * Math.cos(latitude * (Math.PI / 180)));

    const minLat = latitude - latDegrees;
    const maxLat = latitude + latDegrees;
    const minLng = longitude - lngDegrees;
    const maxLng = longitude + lngDegrees;

    // 2. Query DB for fresh events
    const cachedEvents = await prisma.cachedEvent.findMany({
        where: {
            latitude: { gte: minLat, lte: maxLat },
            longitude: { gte: minLng, lte: maxLng },
            expiresAt: { gt: new Date() }, // Not expired
        },
        take: limit,
    });

    // 3. If we have enough good results, return them
    if (cachedEvents.length >= 5) {
        console.log(`Found ${cachedEvents.length} cached events.`);
        return cachedEvents;
    }

    // 4. Otherwise, fetch from Google API
    console.log("Cache miss/insufficient. Fetching from Google...");
    const googlePlaces = await searchNearbyPlaces(latitude, longitude, radiusMeters);

    // 5. Transform and Save to DB
    const newEvents = await saveGooglePlacesToCache(googlePlaces);
    return [...cachedEvents, ...newEvents].slice(0, limit);
}

async function saveGooglePlacesToCache(googlePlaces: GooglePlace[]): Promise<CachedEvent[]> {
    const newEvents: CachedEvent[] = [];

    for (const place of googlePlaces) {
        // Skip if already exists (by googlePlaceId)
        const existing = await prisma.cachedEvent.findUnique({
            where: { googlePlaceId: place.id },
        });

        if (existing) {
            newEvents.push(existing);
            continue;
        }

        // Map Google types to our simple category
        const category = mapGoogleTypeToCategory(place.types);

        // Calculate expiration (e.g., 30 days for places)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        // Stale in 7 days
        const staleAt = new Date();
        staleAt.setDate(staleAt.getDate() + 7);

        try {
            const savedEvent = await prisma.cachedEvent.create({
                data: {
                    googlePlaceId: place.id,
                    name: (place as any).displayName?.text || "Unknown Place",
                    description: (place as any).editorialSummary?.text || (place.types ? place.types.join(", ") : ""),
                    category,
                    subcategory: place.types ? place.types[0] : "",
                    address: place.formattedAddress,
                    latitude: place.location.latitude,
                    longitude: place.location.longitude,
                    rating: place.rating,
                    reviewCount: place.userRatingCount,
                    priceLevel: place.priceLevel ? parsePriceLevel(place.priceLevel) : undefined,
                    expiresAt,
                    staleAt,
                    vibes: mapTypesToVibes(place.types || []),
                    imageUrl: (place.photos && place.photos.length > 0) ? `https://places.googleapis.com/v1/${place.photos[0].name}/media?maxHeightPx=400&maxWidthPx=400&key=${process.env.GOOGLE_API_KEY}` : undefined,
                },
            });
            newEvents.push(savedEvent);
        } catch (err) {
            console.error(`Failed to cache place ${place.id}:`, err);
        }
    }
    return newEvents;
}

export async function searchCachedEvents(
    query: string,
    latitude: number,
    longitude: number,
    radiusMeters: number = 5000,
    limit: number = 20
): Promise<CachedEvent[]> {
    // 1. DB Search (Text match + Location)
    const latDegrees = radiusMeters / 111000;
    const lngDegrees = radiusMeters / (111000 * Math.cos(latitude * (Math.PI / 180)));

    const cachedEvents = await prisma.cachedEvent.findMany({
        where: {
            OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
                { category: { contains: query, mode: 'insensitive' } }
            ],
            latitude: { gte: latitude - latDegrees, lte: latitude + latDegrees },
            longitude: { gte: longitude - lngDegrees, lte: longitude + lngDegrees },
            expiresAt: { gt: new Date() },
        },
        take: limit,
    });

    // 2. Fallback to Google if insufficient
    if (cachedEvents.length < 5) {
        console.log(`Cache miss/insufficient for "${query}". Fetching from Google...`);
        // Import dynamically to avoid circular deps if any, or just standard import
        const { searchTextPlaces } = await import("@/lib/google-places");

        try {
            const googlePlaces = await searchTextPlaces(query, latitude, longitude, radiusMeters);
            const newEvents = await saveGooglePlacesToCache(googlePlaces);

            // Combine and de-duplicate (prefer DB version)
            const allEvents = [...cachedEvents];
            const existingIds = new Set(cachedEvents.map(e => e.id));

            for (const event of newEvents) {
                if (!existingIds.has(event.id)) {
                    allEvents.push(event);
                }
            }

            return allEvents.slice(0, limit);
        } catch (err) {
            console.error("Failed to fetch/cache text search results:", err);
            return cachedEvents;
        }
    }

    return cachedEvents;
}

// Helpers

function mapGoogleTypeToCategory(types: string[]): string {
    if (types.includes("restaurant") || types.includes("food")) return "Food";
    if (types.includes("bar") || types.includes("night_club")) return "Nightlife";
    if (types.includes("park") || types.includes("museum") || types.includes("tourist_attraction")) return "Activity";
    return "Other";
}

function mapTypesToVibes(types: string[]): string[] {
    const vibes = new Set<string>();
    if (types.includes("fine_dining") || types.includes("monument")) vibes.add("Classy");
    if (types.includes("bar") || types.includes("pub")) vibes.add("Social");
    if (types.includes("park") || types.includes("campground")) vibes.add("Nature");
    if (types.includes("amusement_park") || types.includes("bowling_alley")) vibes.add("Fun");
    if (types.includes("cafe") || types.includes("book_store")) vibes.add("Chill");
    return Array.from(vibes);
}

function parsePriceLevel(priceLevel: string): number {
    switch (priceLevel) {
        case "PRICE_LEVEL_FREE": return 0;
        case "PRICE_LEVEL_INEXPENSIVE": return 1;
        case "PRICE_LEVEL_MODERATE": return 2;
        case "PRICE_LEVEL_EXPENSIVE": return 3;
        case "PRICE_LEVEL_VERY_EXPENSIVE": return 4;
        default: return 1;
    }
}
