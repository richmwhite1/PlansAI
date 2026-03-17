import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { sendSms, formatInviteSms, isValidPhone } from "@/lib/sms";
import { checkRateLimit, smsRateLimit } from "@/lib/rate-limit";
import { randomBytes } from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ hangoutId: string }> }
) {
  try {
    const { hangoutId } = await params;
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.profile.findUnique({ where: { clerkId: userId } });
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Rate limit: 3 SMS per hour per user
    const rateResult = await checkRateLimit(profile.id, smsRateLimit);
    if (!rateResult.success) {
      return NextResponse.json(
        { error: "SMS rate limit reached. Try again later.", reset: rateResult.reset },
        { status: 429 }
      );
    }

    const hangout = await prisma.hangout.findUnique({
      where: { id: hangoutId },
      include: {
        participants: { where: { profileId: profile.id } },
      },
    });
    if (!hangout) {
      return NextResponse.json({ error: "Hangout not found" }, { status: 404 });
    }

    // Must be creator or organizer
    const participant = hangout.participants[0];
    if (
      !participant ||
      (participant.role !== "CREATOR" && participant.role !== "ORGANIZER")
    ) {
      return NextResponse.json(
        { error: "Only the creator or organizer can send invites" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { phoneNumbers }: { phoneNumbers: string[] } = body;

    if (!Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      return NextResponse.json({ error: "No phone numbers provided" }, { status: 400 });
    }
    if (phoneNumbers.length > 10) {
      return NextResponse.json(
        { error: "Max 10 phone numbers per request" },
        { status: 400 }
      );
    }

    // Ensure hangout has an invite token
    let inviteToken = hangout.inviteToken;
    if (!inviteToken) {
      inviteToken = randomBytes(16).toString("hex");
      await prisma.hangout.update({
        where: { id: hangout.id },
        data: { inviteToken },
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://plansapp.io";
    const inviteUrl = `${baseUrl}/join/${inviteToken}`;
    const creatorName = profile.displayName ?? "Someone";

    let sent = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const rawPhone of phoneNumbers) {
      const phone = rawPhone.trim();
      if (!isValidPhone(phone)) {
        errors.push(`Invalid format: ${phone}`);
        continue;
      }

      // Check if user is already on-platform
      const existingProfile = await prisma.profile.findFirst({
        where: { phone },
      });

      if (existingProfile) {
        // Send in-app notification instead of SMS
        await prisma.notification.create({
          data: {
            userId: existingProfile.id,
            type: "HANGOUT_INVITE",
            content: `${creatorName} invited you to "${hangout.title}"`,
            link: `/join/${inviteToken}`,
          },
        });
        skipped++;
        continue;
      }

      try {
        await sendSms(phone, formatInviteSms(hangout.title, creatorName, inviteUrl));
        sent++;
      } catch (err) {
        errors.push(
          `Failed to send to ${phone}: ${err instanceof Error ? err.message : "unknown error"}`
        );
      }
    }

    return NextResponse.json({
      sent,
      skipped,
      errors,
      remaining: rateResult.remaining,
    });
  } catch (err) {
    console.error("SMS invite error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
