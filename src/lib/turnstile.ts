export async function verifyTurnstile(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  // If not configured (dev), skip verification
  if (!secret) return true;

  // Allow test tokens in development
  if (process.env.NODE_ENV === "development" && token === "dev-bypass") return true;

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: token }),
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    // On network error, fail open in dev, fail closed in prod
    return process.env.NODE_ENV === "development";
  }
}
