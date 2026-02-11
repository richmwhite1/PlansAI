import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { extractVibesFromReflection } from "@/lib/ai/gemini";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ hangoutId: string }> }
) {
    try {
        const { hangoutId } = await params;
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { reflection, rating } = body;

        if (!reflection) {
            return NextResponse.json({ error: "Reflection is required" }, { status: 400 });
        }

        const profile = await prisma.profile.findUnique({
            where: { clerkId: userId }
        });

        if (!profile) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        // 1. Extract Vibes using AI
        const aiData = await extractVibesFromReflection(reflection);
        const { vibes, keywords } = aiData;

        // 2. Save Feedback
        const feedback = await prisma.hangoutFeedback.create({
            data: {
                hangoutId,
                profileId: profile.id,
                reflection,
                rating,
                extractedVibes: vibes,
                extractedKeywords: keywords
            }
        });

        // 3. Update Profile Vibe History
        const currentVibeHistory = (profile.vibeHistory as any[]) || [];
        const newVibeHistory = [...currentVibeHistory];

        vibes.forEach((vibe: string) => {
            const existing = newVibeHistory.find(h => h.vibe.toLowerCase() === vibe.toLowerCase());
            if (existing) {
                existing.weight = (existing.weight || 1) + 1;
                existing.lastMentioned = new Date().toISOString();
            } else {
                newVibeHistory.push({
                    vibe: vibe.toLowerCase(),
                    weight: 1,
                    lastMentioned: new Date().toISOString()
                });
            }
        });

        // Limit to top 20 vibes to prevent JSON bloat
        const limitedVibeHistory = newVibeHistory
            .sort((a, b) => b.weight - a.weight)
            .slice(0, 20);

        await prisma.profile.update({
            where: { id: profile.id },
            data: {
                vibeHistory: limitedVibeHistory,
                // Also update preferences keywords if any (optional)
                preferences: {
                    ...(profile.preferences as any),
                    recentKeywords: [...new Set([...((profile.preferences as any).recentKeywords || []), ...keywords])].slice(0, 50)
                }
            }
        });

        return NextResponse.json({
            success: true,
            extracted: aiData
        });

    } catch (error) {
        console.error("Error submitting feedback:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
