import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

// POST — Generate AI-powered itinerary suggestions
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ hangoutId: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { hangoutId } = await params;
        const body = await req.json();
        const { dayId } = body; // Optional: generate for a specific day only

        // Verify user is creator/organizer
        const profile = await prisma.profile.findUnique({ where: { clerkId: userId } });
        if (!profile) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        const participant = await prisma.hangoutParticipant.findFirst({
            where: {
                hangoutId,
                profileId: profile.id,
                role: { in: ["CREATOR", "ORGANIZER"] },
            },
        });

        if (!participant) {
            return NextResponse.json({ error: "Not authorized" }, { status: 403 });
        }

        // Fetch hangout details
        const hangout = await prisma.hangout.findUnique({
            where: { id: hangoutId },
            include: {
                itineraryDays: {
                    include: { activities: true },
                    orderBy: { dayNumber: "asc" },
                },
                participants: {
                    where: { rsvpStatus: { in: ["GOING", "PENDING"] } },
                    include: {
                        profile: {
                            select: {
                                interests: true,
                                dietaryPreferences: true,
                                vibeTags: true,
                                scheduleFlexibility: true,
                                transportMode: true,
                                budgetComfort: true,
                            },
                        },
                    },
                },
            },
        });

        if (!hangout) {
            return NextResponse.json({ error: "Hangout not found" }, { status: 404 });
        }

        // Aggregate participant preferences (Social DNA)
        const groupPrefs = hangout.participants
            .filter((p: any) => p.profile)
            .map((p: any) => ({
                interests: p.profile.interests,
                dietary: p.profile.dietaryPreferences,
                vibes: p.profile.vibeTags,
                flexibility: p.profile.scheduleFlexibility,
                transport: p.profile.transportMode,
                budget: p.profile.budgetComfort,
            }));

        const allInterests = groupPrefs.flatMap(p => p.interests || []);
        const allVibes = groupPrefs.flatMap(p => p.vibes || []);
        const allDietary = groupPrefs.flatMap(p => p.dietary || []);
        const transportModes = groupPrefs.map(p => p.transport).filter(Boolean);

        const contextBlock = [
            allInterests.length > 0 ? `Group interests: ${[...new Set(allInterests)].join(", ")}` : "",
            allVibes.length > 0 ? `Group vibes: ${[...new Set(allVibes)].join(", ")}` : "",
            allDietary.length > 0 ? `Dietary considerations: ${[...new Set(allDietary)].join(", ")}` : "",
            transportModes.length > 0 ? `Transport modes: ${[...new Set(transportModes)].join(", ")}` : "",
        ].filter(Boolean).join("\n");

        // Determine which days to generate for
        const targetDays = dayId
            ? hangout.itineraryDays.filter((d: any) => d.id === dayId)
            : hangout.itineraryDays.filter((d: any) => d.activities.length === 0); // Only empty days

        if (targetDays.length === 0) {
            return NextResponse.json({
                error: "No empty itinerary days to fill. Clear existing activities first or specify a dayId.",
            }, { status: 400 });
        }

        // Build the AI prompt
        const location = hangout.itineraryDays[0]?.location ||
            (profile.homeCity ? `${profile.homeCity}, ${profile.homeState}` : "nearby");

        const searchModel = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            tools: [{ googleSearch: {} } as any],
        });

        const dayDescriptions = targetDays.map((d: any) =>
            `Day ${d.dayNumber} (${new Date(d.date).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })})`
        ).join(", ");

        const prompt = `You are a travel and event planner. Generate a detailed itinerary for a group event.

Event: "${hangout.title}"
${hangout.description ? `Description: ${hangout.description}` : ""}
Location/Region: ${location}
Days to plan: ${dayDescriptions}
Number of participants: ${hangout.participants.length}
${contextBlock ? `\nGroup Profile:\n${contextBlock}` : ""}

For EACH day listed, provide:
1. A suggested title/summary for the day (e.g. "Santiago → Valparaiso" or "Beach Day & Market Tour")
2. A location for that day (city, area, or venue)
3. Suggested accommodations (hotel name, camping spot, etc. — be specific if possible)
4. 3-6 activities throughout the day

Return a JSON array of day objects. Each day object:
{
  "dayNumber": <number>,
  "title": "<day summary>",
  "location": "<day location>",
  "accommodations": "<lodging suggestion>",
  "activities": [
    {
      "title": "<activity name>",
      "description": "<1-2 sentence description>",
      "startTime": "<HH:MM format, e.g. 09:00>",
      "duration": <minutes as integer>,
      "location": "<specific location if different from day location>",
      "isRequired": <true or false — false for optional detours/free time>
    }
  ]
}

Make activities realistic and time-appropriate. Include meals, travel time, and rest breaks.
Return JSON array only. No markdown, no explanation.`;

        console.log(`[AI Itinerary] Generating for ${targetDays.length} days of "${hangout.title}"...`);

        const result = await searchModel.generateContent(prompt);
        const response = await result.response;
        const text = response.text().replace(/```json/g, "").replace(/```/g, "").trim();

        let suggestions: any[] = [];
        try {
            suggestions = JSON.parse(text);
            if (!Array.isArray(suggestions)) suggestions = [];
        } catch (parseErr) {
            console.error("[AI Itinerary] Failed to parse AI response:", text.substring(0, 300));
            return NextResponse.json({ error: "AI response could not be parsed" }, { status: 500 });
        }

        // Save generated activities to the database
        let activitiesCreated = 0;
        for (const daySuggestion of suggestions) {
            const targetDay = targetDays.find((d: any) => d.dayNumber === daySuggestion.dayNumber);
            if (!targetDay) continue;

            // Update day details
            await prisma.itineraryDay.update({
                where: { id: targetDay.id },
                data: {
                    title: daySuggestion.title || undefined,
                    location: daySuggestion.location || undefined,
                    accommodations: daySuggestion.accommodations || undefined,
                },
            });

            // Create activities
            if (Array.isArray(daySuggestion.activities)) {
                for (let i = 0; i < daySuggestion.activities.length; i++) {
                    const act = daySuggestion.activities[i];
                    await prisma.itineraryActivity.create({
                        data: {
                            itineraryDayId: targetDay.id,
                            title: act.title || "Activity",
                            description: act.description || null,
                            startTime: act.startTime || null,
                            duration: act.duration || null,
                            location: act.location || null,
                            isRequired: act.isRequired ?? true,
                            displayOrder: i,
                        },
                    });
                    activitiesCreated++;
                }
            }
        }

        console.log(`[AI Itinerary] Created ${activitiesCreated} activities across ${suggestions.length} days`);

        // Fetch the updated itinerary
        const updatedDays = await prisma.itineraryDay.findMany({
            where: { hangoutId },
            include: { activities: { orderBy: { displayOrder: "asc" } } },
            orderBy: { dayNumber: "asc" },
        });

        return NextResponse.json({
            success: true,
            daysUpdated: suggestions.length,
            activitiesCreated,
            days: updatedDays,
        });
    } catch (error: any) {
        console.error("[AI Itinerary] Error:", error);
        return NextResponse.json({
            error: "Failed to generate itinerary",
            details: error.message,
        }, { status: 500 });
    }
}
