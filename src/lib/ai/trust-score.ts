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
 * Calculates the Trust Score for an activity given a group of participants.
 * 
 * Formula:
 * TrustScore = (
 *   0.35 * ParticipantOverlapScore +
 *   0.25 * PreferenceMatchScore +
 *   0.20 * VibeHistoryScore +
 *   0.15 * VenueQualityScore +
 *   0.05 * RecencyBoost
 * )
 */
export async function calculateTrustScore(
    activity: CachedEvent,
    participantIds: string[]
): Promise<TrustScoreResult> {
    // 1. Fetch Participant Data (Profiles + Friendships)
    const participants = await prisma.profile.findMany({
        where: { id: { in: participantIds } },
        include: {
            friendshipsA: true,
            friendshipsB: true,
        },
    });

    if (participants.length === 0) {
        return { score: 0.5, breakdown: { overlap: 0.5, preferences: 0.5, vibes: 0.5, quality: 0.5, recency: 0.5 }, reason: "No participants" };
    }

    // 2. Calculate Component Scores
    const overlapScore = calculateParticipantOverlap(participants, activity);
    const preferenceScore = calculatePreferenceMatch(participants, activity);
    const vibeScore = calculateVibeHistory(participants, activity);
    const qualityScore = calculateVenueQuality(activity);
    const recencyScore = await calculateRecencyBoost(participants, activity);

    // 3. Weighted Sum
    const totalScore =
        (0.35 * overlapScore) +
        (0.25 * preferenceScore) +
        (0.20 * vibeScore) +
        (0.15 * qualityScore) +
        (0.05 * recencyScore);

    // 4. Generate Reason
    const reason = generateReason(preferenceScore, vibeScore, qualityScore, activity);

    return {
        score: parseFloat(totalScore.toFixed(2)),
        breakdown: {
            overlap: parseFloat(overlapScore.toFixed(2)),
            preferences: parseFloat(preferenceScore.toFixed(2)),
            vibes: parseFloat(vibeScore.toFixed(2)),
            quality: parseFloat(qualityScore.toFixed(2)),
            recency: parseFloat(recencyScore.toFixed(2)),
        },
        reason
    };
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

function generateReason(pref: number, vibe: number, quality: number, activity: any): string {
    if (pref > 0.8) return `Matches group interests in ${activity.category}`;
    if (quality > 0.8) return `Highly rated ${activity.category}`;
    if (vibe > 0.7) return `Fits the group's vibe`;
    return `Popular ${activity.category} nearby`;
}
