import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

export const runtime = "nodejs";
export const revalidate = 3600;
export const alt = "Hangout Details";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;

  const hangout = await prisma.hangout.findUnique({
    where: { slug: params.slug },
    include: {
      finalActivity: { select: { name: true, imageUrl: true, category: true } },
      participants: {
        where: { rsvpStatus: "GOING" },
        take: 5,
        include: {
          profile: { select: { displayName: true, avatarUrl: true } },
          guest: { select: { displayName: true } },
        },
      },
      creator: { select: { displayName: true, avatarUrl: true } },
    },
  });

  if (!hangout) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "1200px",
            height: "630px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#18181b",
            fontFamily: "sans-serif",
          }}
        >
          <div
            style={{
              color: "#a3e635",
              fontSize: 80,
              fontWeight: 800,
              letterSpacing: "0.1em",
              display: "flex",
            }}
          >
            PLANS
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  const goingCount = hangout.participants.filter(
    (p) => p.rsvpStatus === "GOING"
  ).length;

  const dateStr = hangout.scheduledFor
    ? format(new Date(hangout.scheduledFor), "EEEE, MMMM d")
    : (hangout as any).targetTime ?? "Date TBD";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#18181b",
          position: "relative",
          fontFamily: "sans-serif",
          overflow: "hidden",
        }}
      >
        {/* Background image if available */}
        {hangout.finalActivity?.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hangout.finalActivity.imageUrl}
            alt=""
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.3,
            }}
          />
        )}

        {/* Dark gradient overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.85) 100%)",
            display: "flex",
          }}
        />

        {/* Plans wordmark */}
        <div
          style={{
            position: "absolute",
            top: 40,
            left: 60,
            color: "#a3e635",
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: "0.1em",
            display: "flex",
          }}
        >
          PLANS
        </div>

        {/* Main content */}
        <div
          style={{
            position: "absolute",
            bottom: 110,
            left: 60,
            right: 60,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {hangout.finalActivity?.name && (
            <div
              style={{
                color: "#a1a1aa",
                fontSize: 20,
                display: "flex",
              }}
            >
              {hangout.finalActivity.name}
            </div>
          )}
          <div
            style={{
              color: "white",
              fontSize: 64,
              fontWeight: 800,
              lineHeight: 1.1,
              display: "flex",
              flexWrap: "wrap",
            }}
          >
            {hangout.title.length > 40
              ? hangout.title.slice(0, 40) + "…"
              : hangout.title}
          </div>
          <div
            style={{
              color: "#d4d4d8",
              fontSize: 24,
              display: "flex",
            }}
          >
            {dateStr}
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            left: 60,
            right: 60,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {/* Avatar stack + going count */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex" }}>
              {hangout.participants.slice(0, 4).map((p, i) => {
                const name =
                  p.profile?.displayName ?? p.guest?.displayName ?? "?";
                const avatarUrl = p.profile?.avatarUrl;
                return (
                  <div
                    key={i}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      border: "2px solid #18181b",
                      marginLeft: i === 0 ? 0 : -12,
                      backgroundColor: "#3f3f46",
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: 16,
                      fontWeight: 600,
                    }}
                  >
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarUrl}
                        alt=""
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      name.charAt(0).toUpperCase()
                    )}
                  </div>
                );
              })}
            </div>
            {goingCount > 0 && (
              <span
                style={{
                  color: "#a1a1aa",
                  fontSize: 18,
                  marginLeft: 8,
                  display: "flex",
                }}
              >
                {goingCount} going
              </span>
            )}
          </div>

          {/* CTA button */}
          <div
            style={{
              backgroundColor: "#a3e635",
              color: "#18181b",
              padding: "12px 28px",
              borderRadius: 50,
              fontSize: 20,
              fontWeight: 700,
              display: "flex",
            }}
          >
            Join the plan →
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
