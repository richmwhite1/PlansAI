import { OAuth2Client } from "googleapis-common";
import { calendar } from "@googleapis/calendar";
import { encrypt, decrypt } from "./crypto";
import { prisma } from "@/lib/prisma";

const CLIENT_ID = process.env.GOOGLE_CALENDAR_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
const REDIRECT_URI =
  process.env.GOOGLE_CALENDAR_REDIRECT_URI ??
  `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/calendar/callback`;

export function getOAuthClient(): OAuth2Client {
  return new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

export function generateAuthUrl(profileId: string): string {
  const oauth2Client = getOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/calendar.freebusy"],
    state: profileId, // simple state — in production would be a signed JWT
    prompt: "consent", // force refresh token
  });
}

export async function exchangeCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string;
}> {
  const oauth2Client = getOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  if (!tokens.access_token) throw new Error("No access token received");
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? "",
    expiresAt: new Date(tokens.expiry_date ?? Date.now() + 3600 * 1000),
    scope: tokens.scope ?? "",
  };
}

export interface BusySlot {
  start: Date;
  end: Date;
}

export async function getFreeBusy(
  profileId: string,
  timeMin: Date,
  timeMax: Date
): Promise<BusySlot[]> {
  const tokenRecord = await prisma.googleCalendarToken.findUnique({
    where: { profileId },
  });
  if (!tokenRecord) return [];

  const oauth2Client = getOAuthClient();

  // Decrypt tokens
  const accessToken = decrypt(tokenRecord.accessToken);
  let refreshToken = "";
  try {
    refreshToken = decrypt(tokenRecord.refreshToken);
  } catch {
    // ignore if refresh token is not stored
  }

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken || undefined,
    expiry_date: tokenRecord.expiresAt.getTime(),
  });

  // Auto-refresh if expired or expiring soon
  if (tokenRecord.expiresAt < new Date(Date.now() + 5 * 60 * 1000)) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      if (credentials.access_token) {
        await prisma.googleCalendarToken.update({
          where: { profileId },
          data: {
            accessToken: encrypt(credentials.access_token),
            expiresAt: new Date(
              credentials.expiry_date ?? Date.now() + 3600 * 1000
            ),
          },
        });
      }
    } catch (err) {
      console.error("Token refresh failed:", err);
    }
  }

  const cal = calendar({ version: "v3", auth: oauth2Client });

  try {
    const response = await cal.freebusy.query({
      requestBody: {
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        items: [{ id: "primary" }],
      },
    });

    const busy = response.data.calendars?.["primary"]?.busy ?? [];
    return busy
      .filter((slot) => slot.start && slot.end)
      .map((slot) => ({
        start: new Date(slot.start!),
        end: new Date(slot.end!),
      }));
  } catch (err) {
    console.error("Calendar free/busy fetch failed:", err);
    return [];
  }
}

export function isSlotBusy(
  busySlots: BusySlot[],
  start: Date,
  end: Date
): boolean {
  return busySlots.some((slot) => slot.start < end && slot.end > start);
}
