import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

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
        const { url, caption } = body;

        if (!url) {
            return NextResponse.json({ error: "Photo URL is required" }, { status: 400 });
        }

        const profile = await prisma.profile.findUnique({
            where: { clerkId: userId }
        });

        if (!profile) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        const photo = await prisma.hangoutPhoto.create({
            data: {
                hangoutId,
                uploaderId: profile.id,
                url,
                caption
            },
            include: {
                uploader: true
            }
        });

        return NextResponse.json({ photo });

    } catch (error) {
        console.error("Error uploading photo:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
