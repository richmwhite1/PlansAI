import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ hangoutId: string }> }
) {
    try {
        const { hangoutId } = await context.params;

        const hangout = await prisma.hangout.findUnique({
            where: { id: hangoutId },
            select: {
                id: true,
                status: true,
                participants: {
                    select: {
                        id: true,
                        role: true,
                        rsvpStatus: true,
                        profile: {
                            select: {
                                id: true,
                                displayName: true,
                                avatarUrl: true
                            }
                        },
                        guest: {
                            select: {
                                id: true,
                                displayName: true
                            }
                        }
                    }
                },
                activityOptions: {
                    select: {
                        id: true,
                        votes: {
                            select: {
                                value: true,
                                profileId: true,
                                guestId: true
                            }
                        }
                    }
                }
            }
        });

        if (!hangout) {
            return NextResponse.json({ error: "Hangout not found" }, { status: 404 });
        }

        return NextResponse.json(hangout);

    } catch (error) {
        console.error("Error polling hangout status:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
