import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFreeBusy, isSlotBusy } from "@/lib/google-calendar";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ hangoutId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { hangoutId } = await params;

    const hangout = await prisma.hangout.findUnique({
      where: { id: hangoutId },
      include: {
        timeOptions: true,
        participants: {
          where: { profileId: { not: null } },
          include: { profile: { select: { id: true } } },
        },
      },
    });

    if (!hangout)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (hangout.timeOptions.length === 0) {
      return NextResponse.json({ availability: [], connectedCount: 0 });
    }

    // Get all participant profileIds
    const participantIds = hangout.participants
      .map((p) => p.profileId)
      .filter(Boolean) as string[];

    // Find which participants have connected Google Calendar
    const connectedTokens = await prisma.googleCalendarToken.findMany({
      where: { profileId: { in: participantIds } },
      select: { profileId: true },
    });
    const connectedProfileIds = connectedTokens.map((t) => t.profileId);
    const connectedCount = connectedProfileIds.length;

    if (connectedCount === 0) {
      return NextResponse.json({ availability: [], connectedCount: 0 });
    }

    // For each time option, check free/busy for all connected participants
    const availability = await Promise.all(
      hangout.timeOptions.map(async (option) => {
        const start = new Date(option.startTime);
        const end = option.endTime
          ? new Date(option.endTime)
          : new Date(start.getTime() + 2 * 60 * 60 * 1000);

        let freeCount = 0;
        let busyCount = 0;

        await Promise.all(
          connectedProfileIds.map(async (profileId) => {
            try {
              const busySlots = await getFreeBusy(profileId, start, end);
              if (isSlotBusy(busySlots, start, end)) {
                busyCount++;
              } else {
                freeCount++;
              }
            } catch {
              // Skip this participant if calendar fetch fails
            }
          })
        );

        return {
          timeOptionId: option.id,
          startTime: option.startTime,
          endTime: option.endTime,
          freeCount,
          busyCount,
          totalConnected: connectedCount,
        };
      })
    );

    return NextResponse.json({ availability, connectedCount });
  } catch (err) {
    console.error("Availability check error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
