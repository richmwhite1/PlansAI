import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import "./globals.css";
import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google"; // Import Playfair Display
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://plans.app"),
  title: {
    default: "Plans - Social Coordination Engine",
    template: "%s | Plans"
  },
  description: "Coordinate plans without the group chat chaos. Gather better.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Plans",
  },
  openGraph: {
    type: "website",
    siteName: "Plans",
    title: "Plans - Social Coordination Engine",
    description: "You're invited to gather better. Coordinate plans without the group chat chaos.",
    images: [{ url: "/og-invite.png", width: 1200, height: 630, alt: "Plans App" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Plans - Social Coordination Engine",
    description: "You're invited to gather better. Coordinate plans without the group chat chaos.",
    images: ["/og-invite.png"],
  }
};

import { BottomNav } from "@/components/layout/bottom-nav";
import { TopHeader } from "@/components/layout/top-header";
import { RegisterSW } from "@/components/register-sw";

export const viewport = {
  themeColor: "#0A0A0A", // Updated to Midnight Carbon
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#D4A373", // Warm Ochre
          colorBackground: "#0A0A0A", // Midnight Carbon
          colorText: "#EDEDED",
        },
      }}
    >
      <html lang="en" className="dark" suppressHydrationWarning>
        <body className={`${inter.variable} ${playfair.variable} font-sans bg-background text-foreground antialiased selection:bg-primary/30 overscroll-none`}>
          <TopHeader />
          {children}
          <BottomNav />
          <RegisterSW />
          <Toaster richColors position="bottom-center" theme="dark" />
        </body>
      </html>
    </ClerkProvider>
  );
}
