import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const category = searchParams.get("category");
        const city = searchParams.get("city");
        const type = searchParams.get("type") || "all"; // "hangouts", "activities", or "all"

        let hangouts: any[] = [];
        let activities: any[] = [];

        if (type === "all" || type === "hangouts") {
            hangouts = await prisma.hangout.findMany({
                where: {
                    visibility: "PUBLIC",
                    status: {
                        in: ["PLANNING", "VOTING", "CONFIRMED"]
                    }
                },
                include: {
                    creator: true,
                    finalActivity: true,
                    participants: {
                        take: 5,
                        include: {
                            profile: true
                        }
                    },
                    activityOptions: {
                        take: 1,
                        include: {
                            cachedEvent: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                },
                take: 20
            });
        }

        if (type === "all" || type === "activities") {
            const activityWhere: any = {};
            if (category && category !== "all") {
                activityWhere.category = category;
            }
            if (city) {
                activityWhere.city = { contains: city, mode: "insensitive" };
            }

            activities = await prisma.cachedEvent.findMany({
                where: activityWhere,
                orderBy: {
                    rating: 'desc'
                },
                take: 20
            });
        }

        const formattedHangouts = hangouts.map(h => ({
            id: h.id,
            slug: h.slug,
            title: h.title,
            visibility: h.visibility,
            status: h.status,
            date: h.scheduledFor,
            creator: {
                name: h.creator.displayName,
                avatar: h.creator.avatarUrl
            },
            activity: h.finalActivity ? {
                name: h.finalActivity.name,
                category: h.finalActivity.category,
                image: h.finalActivity.imageUrl,
                rating: h.finalActivity.rating,
                address: h.finalActivity.address
            } : (h.activityOptions?.[0]?.cachedEvent ? {
                name: h.activityOptions[0].cachedEvent.name,
                category: h.activityOptions[0].cachedEvent.category,
                image: h.activityOptions[0].cachedEvent.imageUrl,
                rating: h.activityOptions[0].cachedEvent.rating,
                address: h.activityOptions[0].cachedEvent.address
            } : null),
            participantCount: h.participants.length,
            previewParticipants: h.participants.map((p: any) => ({
                id: p.id,
                avatar: p.profile?.avatarUrl
            }))
        }));

        const formattedActivities = activities.map(a => ({
            id: a.id,
            name: a.name,
            description: a.description,
            category: a.category,
            subcategory: a.subcategory,
            address: a.address,
            city: a.city,
            state: a.state,
            rating: a.rating,
            priceLevel: a.priceLevel,
            imageUrl: a.imageUrl,
            vibes: a.vibes,
            latitude: a.latitude,
            longitude: a.longitude
        }));

        return NextResponse.json({
            hangouts: formattedHangouts,
            activities: formattedActivities
        });

    } catch (error) {
        console.error("Discovery error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
