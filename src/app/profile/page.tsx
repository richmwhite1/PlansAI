import { UserProfile } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
    const { userId } = await auth();

    if (!userId) {
        redirect("/sign-in");
    }

    const profile = await prisma.profile.findUnique({
        where: { clerkId: userId },
    });

    // If no profile exists yet, we might want to create one or show a specific state.
    // For now, handling null by passing empty/default values where valid.

    return (
        <div className="min-h-screen p-4 pb-24 space-y-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-center mt-8">Your Profile</h1>

            {/* Custom "DNA" Section */}
            <section>
                <ProfileEditor
                    initialData={{
                        bio: profile?.bio,
                        personalityType: profile?.personalityType,
                        socialBattery: profile?.socialBattery,
                        scheduleFlexibility: profile?.scheduleFlexibility,
                        dietaryPreferences: profile?.dietaryPreferences,
                        interests: profile?.interests
                    }}
                />
            </section>

            {/* Clerk Account Settings */}
            <section className="flex flex-col items-center">
                <h2 className="text-xl font-semibold mb-4 text-gray-400">Account Settings</h2>
                <UserProfile
                    appearance={{
                        elements: {
                            rootBox: "w-full mx-auto",
                            card: "bg-slate-900 border border-white/10 shadow-xl w-full",
                            navbar: "hidden", // Hide the navbar to make it cleaner if we just want basics
                            navbarMobileMenuButton: "hidden",
                            headerTitle: "hidden",
                            headerSubtitle: "hidden",
                        }
                    }}
                />
            </section>
        </div>
    );
}
