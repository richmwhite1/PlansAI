import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";
import { randomBytes } from "crypto";

// Generate invite link for a hangout
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ hangoutId: string }> }
) {
    try {
        const { hangoutId } = await params;
        const { userId } = await auth();
        const user = await currentUser();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get or Create user profile
        const email = user?.emailAddresses[0]?.emailAddress;
        const profile = await prisma.profile.upsert({
            where: { clerkId: userId },
            update: {},
            create: {
                clerkId: userId,
                email: email,
                displayName: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : email,
                avatarUrl: user?.imageUrl
            }
        });

        // Check if user is a participant/creator
        const participant = await prisma.hangoutParticipant.findFirst({
            where: { hangoutId, profileId: profile.id }
        });

        if (!participant) {
            return NextResponse.json({ error: "Not authorized" }, { status: 403 });
        }

        // Check for existing invite token
        const hangout = await prisma.hangout.findUnique({
            where: { id: hangoutId },
            select: { inviteToken: true, slug: true }
        });

        let token = hangout?.inviteToken;

        // Generate new token if none exists
        if (!token) {
            token = randomBytes(16).toString("hex");
            await prisma.hangout.update({
                where: { id: hangoutId },
                data: { inviteToken: token }
            });
        }

        const origin = req.headers.get("origin") || "http://localhost:3000";
        const inviteUrl = `${origin}/join/${token}`;

        return NextResponse.json({
            success: true,
            token,
            inviteUrl
        });

    } catch (error) {
        console.error("Error generating invite:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
