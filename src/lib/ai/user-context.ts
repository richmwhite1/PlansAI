import { prisma } from "@/lib/prisma";

/**
 * Builds a compact, token-efficient context string from a user's profile
 * and hangout history. This string is injected into AI prompts to personalize
 * suggestions without burning excessive tokens.
 * 
 * Target: ~50-80 tokens per user context string.
 */
export async function buildUserContext(profileId: string): Promise<string> {
    const profile = await prisma.profile.findUnique({
        where: { id: profileId },
        select: {
            displayName: true,
            interests: true,
            cuisinePreferences: true,
            vibeTags: true,
            budgetComfort: true,
            socialBattery: true,
            dietaryPreferences: true,
            drinkPreferences: true,
            scheduleFlexibility: true,
            personalityType: true,
        }
    });

    if (!profile) return "";

    const parts: string[] = [];

    if (profile.interests?.length > 0) {
        parts.push(`Interests: ${profile.interests.slice(0, 5).join(", ")}`);
    }
    if (profile.cuisinePreferences?.length > 0) {
        parts.push(`Food: ${profile.cuisinePreferences.slice(0, 4).join(", ")}`);
    }
    if (profile.vibeTags?.length > 0) {
        parts.push(`Vibes: ${profile.vibeTags.slice(0, 4).join(", ")}`);
    }
    if (profile.budgetComfort !== null && profile.budgetComfort !== undefined) {
        const budgetLabel = profile.budgetComfort <= 2 ? "budget-friendly" : profile.budgetComfort <= 4 ? "moderate" : "splurge-ready";
        parts.push(`Budget: ${budgetLabel}`);
    }
    if (profile.socialBattery) {
        parts.push(`Energy: ${profile.socialBattery.toLowerCase()}`);
    }
    if (profile.dietaryPreferences?.length > 0) {
        parts.push(`Diet: ${profile.dietaryPreferences.join(", ")}`);
    }
    if (profile.drinkPreferences?.length > 0) {
        parts.push(`Drinks: ${profile.drinkPreferences.slice(0, 3).join(", ")}`);
    }

    return parts.join(". ") + ".";
}

/**
 * Builds a compact context string for an entire group of participants.
 * Finds overlapping interests and shared preferences to give the AI
 * a sense of "what this group likes together."
 */
export async function buildGroupContext(profileIds: string[]): Promise<string> {
    if (profileIds.length === 0) return "";

    const profiles = await prisma.profile.findMany({
        where: { id: { in: profileIds } },
        select: {
            displayName: true,
            interests: true,
            cuisinePreferences: true,
            vibeTags: true,
            budgetComfort: true,
            dietaryPreferences: true,
        }
    });

    if (profiles.length === 0) return "";

    // Find overlapping interests
    const allInterests = profiles.flatMap(p => p.interests || []);
    const interestCounts = allInterests.reduce((acc, i) => { acc[i] = (acc[i] || 0) + 1; return acc; }, {} as Record<string, number>);
    const sharedInterests = Object.entries(interestCounts)
        .filter(([_, count]) => count > 1)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([interest]) => interest);

    // Find overlapping cuisines
    const allCuisines = profiles.flatMap(p => p.cuisinePreferences || []);
    const cuisineCounts = allCuisines.reduce((acc, c) => { acc[c] = (acc[c] || 0) + 1; return acc; }, {} as Record<string, number>);
    const sharedCuisines = Object.entries(cuisineCounts)
        .filter(([_, count]) => count > 1)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([cuisine]) => cuisine);

    // Average budget
    const budgets = profiles.map(p => p.budgetComfort).filter(b => b !== null && b !== undefined) as number[];
    const avgBudget = budgets.length > 0 ? Math.round(budgets.reduce((a, b) => a + b, 0) / budgets.length) : null;

    // Dietary restrictions (union — respect everyone's)
    const allDietary = [...new Set(profiles.flatMap(p => p.dietaryPreferences || []))];

    const parts: string[] = [];
    parts.push(`Group of ${profiles.length}`);

    if (sharedInterests.length > 0) parts.push(`Shared interests: ${sharedInterests.join(", ")}`);
    if (sharedCuisines.length > 0) parts.push(`Shared food prefs: ${sharedCuisines.join(", ")}`);
    if (avgBudget !== null) {
        const label = avgBudget <= 2 ? "budget-friendly" : avgBudget <= 4 ? "moderate" : "high-end";
        parts.push(`Budget: ${label}`);
    }
    if (allDietary.length > 0) parts.push(`Dietary: ${allDietary.join(", ")}`);

    return parts.join(". ") + ".";
}

/**
 * Fetches a user's recent hangout history and feedback to inform AI recommendations.
 * Returns a compact summary of what they've done and liked/disliked.
 */
export async function buildHangoutHistoryContext(profileId: string): Promise<string> {
    // Get recent hangouts with their activities and feedback
    const recentParticipations = await prisma.hangoutParticipant.findMany({
        where: { profileId },
        include: {
            hangout: {
                include: {
                    finalActivity: true,
                    feedbacks: {
                        where: { profileId },
                        take: 1,
                    }
                }
            }
        },
        orderBy: { hangout: { createdAt: 'desc' } },
        take: 5,
    });

    if (recentParticipations.length === 0) return "";

    const historyParts: string[] = [];

    for (const p of recentParticipations) {
        if (!p.hangout.finalActivity) continue;
        const activity = p.hangout.finalActivity;
        const feedback = p.hangout.feedbacks?.[0];

        let entry = activity.name;
        if (activity.category) entry += ` (${activity.category})`;
        if (feedback?.rating) {
            entry += feedback.rating >= 4 ? " ★loved" : feedback.rating <= 2 ? " ✗disliked" : "";
        }
        historyParts.push(entry);
    }

    if (historyParts.length === 0) return "";
    return `Recent hangouts: ${historyParts.join(", ")}.`;
}
