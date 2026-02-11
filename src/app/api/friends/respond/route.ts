import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { friendId, action } = body; // action: 'ACCEPT' or 'REJECT'

        if (!friendId || !action) {
            return NextResponse.json({ error: "Missing friendId or action" }, { status: 400 });
        }

        if (!["ACCEPT", "REJECT"].includes(action)) {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }

        const profile = await prisma.profile.findUnique({
            where: { clerkId: userId }
        });

        if (!profile) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        // Find the pending request where I am the recipient (profileB)
        // or just find the friendship by ID if we passed friendshipId, but friendId is easier context-wise
        const friendship = await prisma.friendship.findFirst({
            where: {
                status: "PENDING",
                profileAId: friendId,
                profileBId: profile.id
            }
        });

        if (!friendship) {
            return NextResponse.json({ error: "No pending request found" }, { status: 404 });
        }

        if (action === "ACCEPT") {
            await prisma.friendship.update({
                where: { id: friendship.id },
                data: { status: "ACCEPTED" }
            });

            // Notify the requester (profileA) that B (current user) accepted
            await prisma.notification.create({
                data: {
                    userId: friendship.profileAId,
                    type: "FRIEND_REQUEST",
                    content: `${profile.displayName} accepted your friend request`,
                    link: `/friends`
                }
            });

            return NextResponse.json({ success: true, message: "Friend request accepted" });
        } else {
            // Reject - delete the record (or set to BLOCKED?)
            // Usually reject deletes the request so they can request again, or blocks.
            // Let's delete for now (Reject).
            await prisma.friendship.delete({
                where: { id: friendship.id }
            });
            return NextResponse.json({ success: true, message: "Friend request rejected" });
        }

    } catch (error) {
        console.error("Error responding to friend request:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
