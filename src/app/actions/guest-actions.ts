"use server";

import { cookies } from "next/headers";

export async function setGuestCookie(token: string) {
    const cookieStore = await cookies();
    cookieStore.set("plans-guest-token", token, {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 90 // 90 days
    });
}
