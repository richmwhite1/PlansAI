import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { prompt, city } = body;

        if (!prompt) {
            return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
        }

        // 1. Use AI to extract vibes and categories from the prompt
        const aiPrompt = `
            You are a social planning assistant for an app called "Plans".
            A user is asking for ideas: "${prompt}"
            
            Extract the following in JSON format:
            - "vibes": An array of strings (e.g. ["romantic", "chill", "active"])
            - "categories": An array of strings that match potential database categories (e.g. ["restaurant", "bar", "park", "museum", "activity"])
            - "reasoning": A brief (1-2 sentence) explanation of why these ideas match their request.
            
            JSON only. No markdown formatting.
        `;

        const result = await model.generateContent(aiPrompt);
        const response = await result.response;
        const text = response.text().replace(/```json/g, "").replace(/```/g, "").trim();
        const aiAnalysis = JSON.parse(text);

        // 2. Search database for activities matching the AI Analysis
        const activityWhere: any = {};

        if (aiAnalysis.categories && aiAnalysis.categories.length > 0) {
            activityWhere.category = { in: aiAnalysis.categories };
        }

        if (city) {
            activityWhere.city = { contains: city, mode: "insensitive" };
        }

        // We can also filter by vibes if they exist in the DB
        // But for now let's stick to categories and city for better results

        const activities = await prisma.cachedEvent.findMany({
            where: activityWhere,
            orderBy: {
                rating: 'desc'
            },
            take: 5
        });

        return NextResponse.json({
            suggestions: activities,
            reasoning: aiAnalysis.reasoning,
            vibes: aiAnalysis.vibes
        });

    } catch (error) {
        console.error("AI Ideas error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
