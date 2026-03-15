import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { endOfDay, addDays, nextFriday, nextSaturday, nextSunday } from "date-fns";

function computeExpiry(status: string): Date {
    const now = new Date();
    switch (status) {
        case "TONIGHT":
            return endOfDay(now);
        case "TOMORROW":
            return endOfDay(addDays(now, 1));
        case "FRIDAY": {
            const target = now.getDay() === 5 ? now : nextFriday(now);
            return endOfDay(target);
        }
        case "SATURDAY": {
            const target = now.getDay() === 6 ? now : nextSaturday(now);
            return endOfDay(target);
        }
        case "SUNDAY": {
            const target = now.getDay() === 0 ? now : nextSunday(now);
            return endOfDay(target);
        }
        case "WEEKEND": {
            const sun = now.getDay() === 0 ? now : nextSunday(now);
            return endOfDay(sun);
        }
        default:
            return endOfDay(now);
    }
}

export async function POST(req: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { status } = await req.json();
    const validStatuses = ["TONIGHT", "TOMORROW", "FRIDAY", "SATURDAY", "SUNDAY", "WEEKEND"];
    if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const availableUntil = computeExpiry(status);

    await prisma.profile.update({
        where: { clerkId: userId },
        data: { availableStatus: status, availableUntil },
    });

    return NextResponse.json({ availableStatus: status, availableUntil });
}

export async function DELETE() {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await prisma.profile.update({
        where: { clerkId: userId },
        data: { availableStatus: null, availableUntil: null },
    });

    return NextResponse.json({ ok: true });
}
