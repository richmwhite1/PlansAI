import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Plans - Social Coordination Engine",
  description: "AI-first social gathering app.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Plans",
  },
};

import { BottomNav } from "@/components/layout/bottom-nav";

export const viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prevent zooming for native app feel
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
          colorPrimary: "#8b5cf6", // Violet-500
          colorBackground: "#0f172a", // Slate-900
        },
      }}
    >
      <html lang="en" className="dark">
        <body className={`${inter.className} bg-slate-950 text-slate-100 antialiased selection:bg-violet-500/30 overscroll-none`}>
          {children}
          <BottomNav />
          <Toaster richColors position="bottom-center" />
        </body>
      </html>
    </ClerkProvider>
  );
}
