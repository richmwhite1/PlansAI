import twilio from "twilio";

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;

/** Validate E.164 phone number format */
export function isValidPhone(phone: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(phone);
}

/** Format an invite SMS message */
export function formatInviteSms(
  hangoutTitle: string,
  creatorName: string,
  inviteUrl: string
): string {
  return `${creatorName} invited you to "${hangoutTitle}" on Plans. Tap to RSVP (no account needed): ${inviteUrl}\n\nReply STOP to opt out.`;
}

/** Send an SMS via Twilio. Throws on failure. */
export async function sendSms(to: string, body: string): Promise<void> {
  if (!ACCOUNT_SID || !AUTH_TOKEN || !FROM_NUMBER) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[SMS DEV] To: ${to}\n${body}`);
      return;
    }
    throw new Error("Twilio credentials not configured");
  }
  if (!isValidPhone(to)) {
    throw new Error(`Invalid phone number format: ${to}`);
  }
  const client = twilio(ACCOUNT_SID, AUTH_TOKEN);
  await client.messages.create({ to, from: FROM_NUMBER, body });
}
