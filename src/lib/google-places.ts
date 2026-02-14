const GOOGLE_PLACES_API_URL = "https://places.googleapis.com/v1/places:searchNearby";

export interface GooglePlace {
    id: string;
    name: string;
    formattedAddress: string;
    rating?: number;
    userRatingCount?: number;
    location: {
        latitude: number;
        longitude: number;
    };
    types: string[];
    priceLevel?: string;
    photos?: { name: string; authorAttributions: string[] }[];
    websiteUri?: string;
    nationalPhoneNumber?: string;
}

const API_KEY = process.env.GOOGLE_API_KEY;

if (!API_KEY) {
    console.warn("⚠️ GOOGLE_API_KEY is missing. Places search will fail.");
}

export async function searchNearbyPlaces(
    latitude: number,
    longitude: number,
    radiusMeters: number = 5000, // Default 5km
    includedTypes: string[] = ["restaurant", "bar", "cafe", "park", "museum"]
): Promise<GooglePlace[]> {
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        console.error("GOOGLE_API_KEY is missing");
        return [];
    }

    // DEBUG: Verify Key is loaded
    const maskedKey = apiKey.length > 10 ? `${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 5)}` : "INVALID_LENGTH";
    console.log(`[GooglePlaces] Using API Key: ${maskedKey}`);

    try {
        const response = await fetch(GOOGLE_PLACES_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": apiKey,
                "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.location,places.types,places.priceLevel,places.photos,places.id,places.websiteUri,places.nationalPhoneNumber,places.editorialSummary",
            },
            body: JSON.stringify({
                includedTypes,
                maxResultCount: 20,
                locationRestriction: {
                    circle: {
                        center: {
                            latitude,
                            longitude,
                        },
                        radius: radiusMeters,
                    },
                },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Google Places API error:", errorText);
            return [];
        }

        const data = await response.json();
        return data.places || [];
    } catch (error) {
        console.error("Error fetching places:", error);
        return [];
    }
}

export async function searchTextPlaces(
    textQuery: string,
    latitude: number,
    longitude: number,
    radiusMeters: number = 5000,
    isOpenNow: boolean = false
): Promise<GooglePlace[]> {
    const apiKey = process.env.GOOGLE_API_KEY;
    const URL = "https://places.googleapis.com/v1/places:searchText";

    if (!apiKey) return [];

    try {
        const response = await fetch(URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": apiKey,
                "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.location,places.types,places.priceLevel,places.photos,places.id,places.websiteUri,places.nationalPhoneNumber,places.editorialSummary",
            },
            body: JSON.stringify({
                textQuery,
                locationBias: {
                    circle: {
                        center: { latitude, longitude },
                        radius: radiusMeters,
                    },
                },
                openNow: isOpenNow,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Google Places API Error:", errorText);
            return [];
        }

        const data = await response.json();
        console.log(`Google Text Search for "${textQuery}" returned ${data.places?.length || 0} results`);
        return data.places || [];
    } catch (error) {
        console.error("Error searching places:", error);
        return [];
    }
}
