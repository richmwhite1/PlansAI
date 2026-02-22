import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ hangoutId: string }> }
) {
    try {
        const { hangoutId } = await params;
        const { userId } = await auth();
        const cookieStore = await cookies();
        const guestToken = cookieStore.get("plans-guest-token")?.value;

        if (!userId && !guestToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { timeOptionId, value } = body; // value: 1 or 0

        let profileId = undefined;
        let guestId = undefined;

        if (userId) {
            const profile = await prisma.profile.findUnique({
                where: { clerkId: userId }
            });
            if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
            profileId = profile.id;
        } else if (guestToken) {
            const guestProfile = await prisma.guestProfile.findUnique({
                where: { token: guestToken }
            });
            if (!guestProfile) return NextResponse.json({ error: "Guest not found" }, { status: 404 });
            guestId = guestProfile.id;
        }

        if (value === 1) {
            // Upsert vote
            if (profileId) {
                await prisma.timeVote.upsert({
                    where: {
                        timeOptionId_profileId: { timeOptionId, profileId }
                    },
                    update: { value },
                    create: { timeOptionId, profileId, value }
                });
            } else if (guestId) {
                await prisma.timeVote.upsert({
                    where: {
                        timeOptionId_guestId: { timeOptionId, guestId }
                    },
                    update: { value },
                    create: { timeOptionId, guestId, value }
                });
            }
        } else {
            // Remove vote
            await prisma.timeVote.deleteMany({
                where: {
                    timeOptionId,
                    profileId: profileId ? profileId : undefined,
                    guestId: guestId ? guestId : undefined
                }
            });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Error submitting time vote:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
