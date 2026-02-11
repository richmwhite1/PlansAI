import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        const user = await currentUser();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { email, phone, friendId } = body;

        if (!email && !phone && !friendId) {
            return NextResponse.json({ error: "Email, phone or friendId required" }, { status: 400 });
        }

        // Get or Create user profile
        console.log("AddFriend: Fetching user info for", userId);
        const userEmail = user?.emailAddresses[0]?.emailAddress;
        console.log("AddFriend: User email is", userEmail);
        const currentProfile = await prisma.profile.upsert({
            where: { clerkId: userId },
            update: {},
            create: {
                clerkId: userId,
                email: userEmail,
                displayName: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : userEmail,
                avatarUrl: user?.imageUrl
            }
        });

        // Find friend by email, phone, or ID
        console.log("AddFriend: Searching for friend with", { email, phone, friendId });
        const friendProfile = await prisma.profile.findFirst({
            where: friendId
                ? { id: friendId }
                : email
                    ? { email: { equals: email, mode: 'insensitive' } }
                    : { phone }
        });

        if (!friendProfile) {
            // Friend not on platform yet - could send invite
            return NextResponse.json({
                error: "User not found",
                canInvite: true,
                message: "User is not on Plans yet. Send them an invite?"
            }, { status: 404 });
        }

        if (friendProfile.id === currentProfile.id) {
            return NextResponse.json({ error: "Cannot add yourself as friend" }, { status: 400 });
        }

        // Check if friendship already exists
        const existingFriendship = await prisma.friendship.findFirst({
            where: {
                OR: [
                    { profileAId: currentProfile.id, profileBId: friendProfile.id },
                    { profileAId: friendProfile.id, profileBId: currentProfile.id }
                ]
            }
        });

        if (existingFriendship) {
            console.log("AddFriend: Existing friendship keys:", Object.keys(existingFriendship));
            if (existingFriendship.status === "ACCEPTED") {
                return NextResponse.json({
                    error: "Already friends",
                    friend: {
                        id: friendProfile.id,
                        name: friendProfile.displayName || friendProfile.email,
                        avatar: friendProfile.avatarUrl
                    }
                }, { status: 409 });
            }

            // If pending and current user didn't initiate it -> Accept it
            if (existingFriendship.status === "PENDING" && existingFriendship.profileBId === currentProfile.id) {
                await prisma.friendship.update({
                    where: { id: existingFriendship.id },
                    data: { status: "ACCEPTED" }
                });

                return NextResponse.json({
                    success: true,
                    status: "ACCEPTED",
                    message: "Friend request accepted!",
                    friend: {
                        id: friendProfile.id,
                        name: friendProfile.displayName || friendProfile.email,
                        avatar: friendProfile.avatarUrl
                    }
                });
            }

            // If pending and current user initiated it -> "Request already sent"
            if (existingFriendship.status === "PENDING" && existingFriendship.profileAId === currentProfile.id) {
                return NextResponse.json({
                    error: "Request already sent",
                    status: "PENDING"
                }, { status: 409 });
            }
        }

        // Create friendship request
        console.log("AddFriend: Creating friendship between", currentProfile.id, "and", friendProfile.id);
        // ProfileA is the requester
        const friendship = await prisma.friendship.create({
            data: {
                profileAId: currentProfile.id,
                profileBId: friendProfile.id,
                sharedHangoutCount: 0
            }
        });

        // Create Notification for ProfileB
        console.log("AddFriend: Creating notification for", friendProfile.id);
        await prisma.notification.create({
            data: {
                userId: friendProfile.id,
                type: "FRIEND_REQUEST",
                content: `${currentProfile.displayName} sent you a friend request`,
                link: "/friends"
            }
        });

        return NextResponse.json({
            success: true,
            status: "PENDING",
            message: "Friend request sent!",
            friend: {
                id: friendProfile.id,
                name: friendProfile.displayName || friendProfile.email || "Unknown",
                avatar: friendProfile.avatarUrl || `https://i.pravatar.cc/150?u=${friendProfile.id}`
            }
        });

    } catch (error) {
        console.error("CRITICAL ERROR adding friend:", error);
        return NextResponse.json({
            error: "Internal Server Error",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
