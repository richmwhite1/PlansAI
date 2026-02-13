import { UserProfile } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { redirect } from "next/navigation";

export default async function ProfilePage(props: { params: Promise<{ rest?: string[] }> }) {
    const { userId } = await auth();

    if (!userId) {
        redirect("/sign-in");
    }

    const profile = await prisma.profile.findUnique({
        where: { clerkId: userId },
    });

    return (
        <div className="min-h-screen p-4 pb-24 space-y-12 max-w-4xl mx-auto">


            {/* Custom Profile Section */}
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <ProfileEditor
                    initialData={{
                        bio: profile?.bio,
                        mbti: profile?.mbti,
                        enneagram: profile?.enneagram,
                        zodiac: profile?.zodiac,
                        customPersonality: profile?.customPersonality,
                        dietaryPreferences: profile?.dietaryPreferences,
                        interests: profile?.interests
                    }}
                />
            </section>

            {/* Clerk Account Settings */}
            <section className="flex flex-col items-center pt-8 border-t border-white/5">
                <h2 className="text-xl font-bold mb-8 bg-gradient-to-r from-slate-400 to-slate-600 bg-clip-text text-transparent uppercase tracking-widest text-sm">My Preferences</h2>
                <UserProfile
                    path="/profile"
                    routing="path"
                    appearance={{
                        baseTheme: dark,
                        elements: {
                            rootBox: "w-full mx-auto",
                            card: "bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-2xl w-full rounded-3xl overflow-hidden",
                            navbar: "hidden",
                            navbarMobileMenuButton: "hidden",
                            headerTitle: "hidden",
                            headerSubtitle: "hidden",
                            scrollBox: "bg-transparent",
                            pageScrollBox: "bg-transparent",
                        }
                    }}
                />
            </section>
        </div>
    );
}
