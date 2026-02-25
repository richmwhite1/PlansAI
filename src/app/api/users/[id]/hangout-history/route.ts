import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/users/[id]/hangout-history
 * Returns a user's past hangouts with activity info and feedback ratings.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: profileId } = await params;

        const participations = await prisma.hangoutParticipant.findMany({
            where: { profileId },
            include: {
                hangout: {
                    include: {
                        finalActivity: {
                            select: {
                                name: true,
                                category: true,
                                imageUrl: true,
                                rating: true,
                                address: true,
                            }
                        },
                        feedbacks: {
                            where: { profileId },
                            take: 1,
                            select: {
                                rating: true,
                                reflection: true,
                                extractedVibes: true,
                            }
                        },
                        _count: {
                            select: { participants: true }
                        }
                    }
                }
            },
            orderBy: { hangout: { createdAt: 'desc' } },
            take: 10,
        });

        const history = participations
            .filter(p => p.hangout.finalActivity) // Only include hangouts with a confirmed activity
            .map(p => ({
                hangoutId: p.hangout.id,
                title: p.hangout.title,
                date: p.hangout.scheduledFor || p.hangout.createdAt,
                activity: {
                    name: p.hangout.finalActivity!.name,
                    category: p.hangout.finalActivity!.category,
                    imageUrl: p.hangout.finalActivity!.imageUrl,
                    rating: p.hangout.finalActivity!.rating,
                    address: p.hangout.finalActivity!.address,
                },
                userRating: p.hangout.feedbacks?.[0]?.rating || null,
                reflection: p.hangout.feedbacks?.[0]?.reflection || null,
                vibes: (p.hangout.feedbacks?.[0]?.extractedVibes as any)?.vibes || [],
                participantCount: p.hangout._count.participants,
            }));

        return NextResponse.json({ history });
    } catch (error) {
        console.error("Failed to fetch hangout history:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
