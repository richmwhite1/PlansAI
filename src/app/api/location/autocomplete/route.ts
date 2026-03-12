import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (!query) {
        return NextResponse.json({ predictions: [] });
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: "API key missing" }, { status: 500 });
    }

    try {
        // Use the Places Autocomplete API
        // Types: (cities) to restrict to cities/locations
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&types=(cities)&key=${apiKey}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
            console.error("Google Autocomplete Error:", data.status, data.error_message);
            return NextResponse.json({ error: data.status }, { status: 400 });
        }

        const predictions = data.predictions.map((p: any) => ({
            placeId: p.place_id,
            description: p.description,
            mainText: p.structured_formatting.main_text,
            secondaryText: p.structured_formatting.secondary_text,
        }));

        return NextResponse.json({ predictions });
    } catch (error) {
        console.error("Autocomplete Proxy Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
