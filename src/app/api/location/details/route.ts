import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const placeId = searchParams.get("placeId");

    if (!placeId) {
        return NextResponse.json({ error: "placeId is required" }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: "API key missing" }, { status: 500 });
    }

    try {
        // Use the Places Details API (New v1 API if possible, or legacy)
        // I will use legacy for autocomplete compatibility
        const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,address_components,name&key=${apiKey}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.status !== "OK") {
            console.error("Google Place Details Error:", data.status, data.error_message);
            return NextResponse.json({ error: data.status }, { status: 400 });
        }

        const result = data.result;
        const lat = result.geometry.location.lat;
        const lng = result.geometry.location.lng;

        // Extract city, state, zip from address components
        let city = "";
        let state = "";
        let zip = "";

        result.address_components.forEach((c: any) => {
            if (c.types.includes("locality")) city = c.long_name;
            if (c.types.includes("administrative_area_level_1")) state = c.short_name;
            if (c.types.includes("postal_code")) zip = c.long_name;
        });

        return NextResponse.json({
            city,
            state,
            zip,
            lat,
            lng,
            name: result.name
        });
    } catch (error) {
        console.error("Place Details Proxy Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
