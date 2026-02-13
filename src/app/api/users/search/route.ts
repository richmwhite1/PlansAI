import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

// Search for users by name or email
export async function GET(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const query = searchParams.get("q") || "";
        const nameQuery = searchParams.get("name") || "";
        const bioQuery = searchParams.get("bio") || "";
        const websiteQuery = searchParams.get("website") || "";
        const locationQuery = searchParams.get("location") || "";

        // Get current user profile to exclude from results
        const currentProfile = await prisma.profile.findUnique({
            where: { clerkId: userId }
        });

        const orFilters: any[] = [];

        if (query) {
            orFilters.push(
                { displayName: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } },
                { bio: { contains: query, mode: 'insensitive' } },
                { websiteUrl: { contains: query, mode: 'insensitive' } },
                { locationUrl: { contains: query, mode: 'insensitive' } }
            );
        }

        if (nameQuery) {
            orFilters.push({ displayName: { contains: nameQuery, mode: 'insensitive' } });
        }
        if (bioQuery) {
            orFilters.push({ bio: { contains: bioQuery, mode: 'insensitive' } });
        }
        if (websiteQuery) {
            orFilters.push({ websiteUrl: { contains: websiteQuery, mode: 'insensitive' } });
        }
        if (locationQuery) {
            orFilters.push({ locationUrl: { contains: locationQuery, mode: 'insensitive' } });
        }

        if (orFilters.length === 0) {
            return NextResponse.json({ users: [] });
        }

        const where: any = { OR: orFilters };

        // Exclude current user if profile exists
        if (currentProfile) {
            where.id = { not: currentProfile.id };
        }

        // Search profiles
        const users = await prisma.profile.findMany({
            where,
            select: {
                id: true,
                displayName: true,
                email: true,
                avatarUrl: true,
                bio: true,
                websiteUrl: true,
                locationUrl: true
            },
            take: 20
        });

        return NextResponse.json({
            users: users.map((u: any) => ({
                id: u.id,
                name: u.displayName || u.email?.split("@")[0] || "Unknown",
                email: u.email,
                avatar: u.avatarUrl || `https://i.pravatar.cc/150?u=${u.id}`,
                bio: u.bio,
                websiteUrl: u.websiteUrl,
                locationUrl: u.locationUrl
            }))
        });

    } catch (error) {
        console.error("Error searching users:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
