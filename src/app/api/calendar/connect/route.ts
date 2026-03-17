import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateAuthUrl } from "@/lib/google-calendar";

export async function GET() {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.profile.findUnique({ where: { clerkId: userId } });
  if (!profile)
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const url = generateAuthUrl(profile.id);
  return NextResponse.redirect(url);
}
