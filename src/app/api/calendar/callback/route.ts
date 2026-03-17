import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exchangeCode } from "@/lib/google-calendar";
import { encrypt } from "@/lib/crypto";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const profileId = searchParams.get("state"); // the profileId we set as state
  const error = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (error || !code || !profileId) {
    return NextResponse.redirect(`${appUrl}/settings?calendar=error`);
  }

  try {
    // Verify profile exists
    const profile = await prisma.profile.findUnique({ where: { id: profileId } });
    if (!profile)
      return NextResponse.redirect(`${appUrl}/settings?calendar=error`);

    const tokens = await exchangeCode(code);

    await prisma.googleCalendarToken.upsert({
      where: { profileId },
      create: {
        profileId,
        accessToken: encrypt(tokens.accessToken),
        refreshToken: tokens.refreshToken ? encrypt(tokens.refreshToken) : "",
        expiresAt: tokens.expiresAt,
        scope: tokens.scope,
      },
      update: {
        accessToken: encrypt(tokens.accessToken),
        refreshToken: tokens.refreshToken ? encrypt(tokens.refreshToken) : "",
        expiresAt: tokens.expiresAt,
        scope: tokens.scope,
      },
    });

    return NextResponse.redirect(`${appUrl}/settings?calendar=connected`);
  } catch (err) {
    console.error("Calendar callback error:", err);
    return NextResponse.redirect(`${appUrl}/settings?calendar=error`);
  }
}
