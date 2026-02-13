
import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const { userId } = await auth();

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const user = await currentUser();
        const email = user?.emailAddresses[0]?.emailAddress;

        // Upsert profile to ensure it exists
        const profile = await prisma.profile.upsert({
            where: { clerkId: userId },
            update: {
                email: email, // Keep email in sync
                displayName: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : email,
                avatarUrl: user?.imageUrl
            },
            create: {
                clerkId: userId,
                email: email,
                displayName: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : email,
                avatarUrl: user?.imageUrl,
                homeLatitude: 0,
                homeLongitude: 0
            },
            include: {
                friendshipsA: {
                    where: { status: "ACCEPTED" },
                    include: { profileB: true }
                },
                friendshipsB: {
                    where: { status: "ACCEPTED" },
                    include: { profileA: true }
                }
            }
        });

        // Transform friends list
        const friends = [
            ...profile.friendshipsA.map(f => f.profileB),
            ...profile.friendshipsB.map(f => f.profileA)
        ];

        return NextResponse.json({
            ...profile,
            friends
        });

    } catch (error) {
        console.error("Error fetching user profile:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
