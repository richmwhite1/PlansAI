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

        if (query.length < 2) {
            return NextResponse.json({ users: [] });
        }

        // Get current user profile to exclude from results
        const currentProfile = await prisma.profile.findUnique({
            where: { clerkId: userId }
        });

        const where: any = {
            OR: [
                { displayName: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } }
            ]
        };

        // Exclude current user if profile exists
        if (currentProfile) {
            where.id = { not: currentProfile.id };
        }

        // Search profiles by name or email
        const users = await prisma.profile.findMany({
            where,
            select: {
                id: true,
                displayName: true,
                email: true,
                avatarUrl: true
            },
            take: 10
        });

        return NextResponse.json({
            users: users.map((u: any) => ({
                id: u.id,
                name: u.displayName || u.email?.split("@")[0] || "Unknown",
                email: u.email,
                avatar: u.avatarUrl || `https://i.pravatar.cc/150?u=${u.id}`
            }))
        });

    } catch (error) {
        console.error("Error searching users:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
