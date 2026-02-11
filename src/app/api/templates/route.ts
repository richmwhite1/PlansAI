import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

// GET /api/templates - List user's templates
export async function GET(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const profile = await prisma.profile.findUnique({
            where: { clerkId: userId }
        });

        if (!profile) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        const templates = await prisma.hangoutTemplate.findMany({
            where: { creatorId: profile.id },
            include: { activity: true },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ templates });

    } catch (error) {
        console.error("Error fetching templates:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// POST /api/templates - Create a template
export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const profile = await prisma.profile.findUnique({
            where: { clerkId: userId }
        });

        if (!profile) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        const body = await req.json();
        const { name, type, activityId } = body;

        if (!name || !type) {
            return NextResponse.json({ error: "Name and type are required" }, { status: 400 });
        }

        const template = await prisma.hangoutTemplate.create({
            data: {
                name,
                type,
                creatorId: profile.id,
                activityId
            }
        });

        return NextResponse.json({ template });

    } catch (error) {
        console.error("Error creating template:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
