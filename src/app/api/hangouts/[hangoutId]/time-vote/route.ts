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
        const { timeOptionId, value } = body; // value: 1 or 0

        const profile = await prisma.profile.findUnique({
            where: { clerkId: userId }
        });

        if (!profile) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        if (value === 1) {
            // Upsert vote
            await prisma.timeVote.upsert({
                where: {
                    timeOptionId_profileId: {
                        timeOptionId,
                        profileId: profile.id
                    }
                },
                update: { value },
                create: {
                    timeOptionId,
                    profileId: profile.id,
                    value
                }
            });
        } else {
            // Remove vote
            await prisma.timeVote.deleteMany({
                where: {
                    timeOptionId,
                    profileId: profile.id
                }
            });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Error submitting time vote:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
