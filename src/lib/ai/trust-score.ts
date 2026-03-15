import { prisma } from "@/lib/prisma";
import type { CachedEvent, Profile, Friendship } from "@prisma/client";

// Types needed for calculation
interface ParticipantWithData extends Profile {
    friendshipsA: Friendship[];
    friendshipsB: Friendship[];
}

export interface TrustScoreResult {
    score: number;
    breakdown: {
        overlap: number;
        preferences: number;
        vibes: number;
        quality: number;
        recency: number;
    };
    reason: string;
}

/**
 * Fetches participant profiles once, then scores all activities in a single pass.
 * Use this when scoring multiple activities to avoid N+1 DB queries.
 */
export async function calculateTrustScoresBulk(
    activities: CachedEvent[],
    participantIds: string[]
): Promise<TrustScoreResult[]> {
    if (participantIds.length === 0) {
        return activities.map(() => ({
            score: 0.5,
            breakdown: { overlap: 0.5, preferences: 0.5, vibes: 0.5, quality: 0.5, recency: 0.5 },
            reason: "Popular nearby",
        }));
    }

    // Single DB fetch for all participants
    const participants = await prisma.profile.findMany({
        where: { id: { in: participantIds } },
        include: { friendshipsA: true, friendshipsB: true },
    });

    return activities.map((activity) => {
        if (participants.length === 0) {
            return { score: 0.5, breakdown: { overlap: 0.5, preferences: 0.5, vibes: 0.5, quality: 0.5, recency: 0.5 }, reason: "No participants" };
        }
        const overlapScore = calculateParticipantOverlap(participants, activity);
        const preferenceScore = calculatePreferenceMatch(participants, activity);
        const vibeScore = calculateVibeHistory(participants, activity);
        const qualityScore = calculateVenueQuality(activity);
        const recencyScore = 1.0; // MVP placeholder

        const totalScore =
            (0.35 * overlapScore) +
            (0.25 * preferenceScore) +
            (0.20 * vibeScore) +
            (0.15 * qualityScore) +
            (0.05 * recencyScore);

        return {
            score: parseFloat(totalScore.toFixed(2)),
            breakdown: {
                overlap: parseFloat(overlapScore.toFixed(2)),
                preferences: parseFloat(preferenceScore.toFixed(2)),
                vibes: parseFloat(vibeScore.toFixed(2)),
                quality: parseFloat(qualityScore.toFixed(2)),
                recency: parseFloat(recencyScore.toFixed(2)),
            },
            reason: generateReason(preferenceScore, vibeScore, qualityScore, activity, participants),
        };
    });
}

/**
 * Calculates the Trust Score for a single activity.
 * Prefer calculateTrustScoresBulk when scoring multiple activities.
 */
export async function calculateTrustScore(
    activity: CachedEvent,
    participantIds: string[]
): Promise<TrustScoreResult> {
    const results = await calculateTrustScoresBulk([activity], participantIds);
    return results[0];
}

// --- Helper Functions ---

function calculateParticipantOverlap(participants: any[], activity: any): number {
    // Logic: Do these people engage in this CATEGORY of activity together?
    // For MVP: Check if they are friends. If they are all friends, high overlap.
    if (participants.length < 2) return 1.0; // Solo = 100% overlap with self

    let friendshipCount = 0;
    const maxFriendships = (participants.length * (participants.length - 1)) / 2;

    // Build a set of friendship IDs for quick lookup
    const friendSet = new Set<string>();
    participants.forEach(p => {
        // @ts-ignore
        p.friendshipsA.forEach(f => friendSet.add(f.profileBId));
        // @ts-ignore
        p.friendshipsB.forEach(f => friendSet.add(f.profileAId));
    });

    // This is a simplified "Are they friends?" check. 
    // Real implementation would check "SharedHangoutCount" from Friendship model
    // For now, return 0.8 as a baseline for friends.
    return 0.8;
}

function calculatePreferenceMatch(participants: any[], activity: any): number {
    let totalMatch = 0;

    for (const p of participants) {
        const prefs = p.preferences as any || {};
        let score = 0.5;

        // Category Match
        if (prefs.interests?.includes(activity.category)) score += 0.4;

        // Vibe Match (Activity Vibes vs Profile Vibes)
        if (prefs.vibes && activity.vibes) {
            const intersection = activity.vibes.filter((v: string) => prefs.vibes.includes(v));
            if (intersection.length > 0) score += 0.2;
        }

        totalMatch += Math.min(score, 1.0);
    }

    return totalMatch / participants.length;
}

function calculateVibeHistory(participants: any[], activity: any): number {
    if (participants.length === 0) return 0.5;

    let totalScore = 0;

    for (const p of participants) {
        const history = (p.vibeHistory as any[]) || [];
        if (history.length === 0) {
            totalScore += 0.5;
            continue;
        }

        // Check for match between activity vibes and user's top vibes
        // Activity vibes are provided by Google/AI seeding
        const activityVibes = activity.vibes || [];
        const matches = history.filter(h =>
            activityVibes.some((av: string) => av.toLowerCase() === h.vibe.toLowerCase())
        );

        if (matches.length > 0) {
            // Sum weights of matching vibes
            const vibeWeight = matches.reduce((sum, m) => sum + (m.weight || 1), 0);
            totalScore += Math.min(0.5 + (vibeWeight * 0.1), 1.0);
        } else {
            totalScore += 0.4; // Base score if no history match
        }
    }

    return totalScore / participants.length;
}

function calculateVenueQuality(activity: any): number {
    let score = 0.5;
    if (activity.rating) score += (activity.rating / 5) * 0.4; // 5 stars -> +0.4
    if (activity.reviewCount && activity.reviewCount > 100) score += 0.1;
    return Math.min(score, 1.0);
}

async function calculateRecencyBoost(participants: any[], activity: any): Promise<number> {
    // Check if this specific googlePlaceId was used in a Hangout recently by these users
    // const output = await prisma.hangout.count({ ... })
    // For MVP, assume it's fresh
    return 1.0;
}

function generateReason(pref: number, vibe: number, quality: number, activity: any, participants?: any[]): string {
    const name = activity.name || activity.category;
    const category = (activity.category || "option").toLowerCase();

    // Gather shared dietary flags from participants for more specific messaging
    const allDietary = participants?.flatMap(p => {
        const prefs = p.preferences as any || {};
        return prefs.dietary || p.dietaryPreferences || [];
    }) ?? [];
    const dietaryNote = allDietary.length > 0 ? ` — ${[...new Set(allDietary)].slice(0, 2).join(" & ")} friendly` : "";

    if (pref > 0.8 && participants && participants.length > 1) {
        return `Matches everyone's shared interest in ${category}${dietaryNote}`;
    }
    if (pref > 0.8) return `Matches your interest in ${category}`;
    if (quality > 0.85 && activity.rating) return `Top-rated ${category} (${activity.rating}★)`;
    if (vibe > 0.75) return `Fits the group vibe${dietaryNote}`;
    if (quality > 0.7) return `Well-rated ${category} nearby`;
    return `Popular ${category} in the area`;
}
