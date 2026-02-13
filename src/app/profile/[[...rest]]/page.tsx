import { UserProfile } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { ProfileViewer } from "@/components/profile/ProfileViewer";
import { getOrCreateProfile, getProfileById, ExtendedProfile } from "@/lib/profile-utils";
import { redirect, notFound } from "next/navigation";

export default async function ProfilePage(props: { params: Promise<{ rest?: string[] }> }) {
    const { userId } = await auth();

    if (!userId) {
        redirect("/sign-in");
    }

    const myProfile = await getOrCreateProfile(userId);
    if (!myProfile) {
        return <div>Error loading profile</div>; // Should not happen
    }

    const params = await props.params;
    const targetProfileId = params.rest?.[0];

    // If viewing another user
    if (targetProfileId) {
        // If it's me, redirect to my editor
        if (targetProfileId === myProfile.id) {
            redirect("/profile");
        }

        const targetProfile = await getProfileById(targetProfileId);

        if (!targetProfile) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
                    <div className="text-4xl mb-4">🤷‍♂️</div>
                    <h1 className="text-2xl font-bold mb-2">Profile Not Found</h1>
                    <p className="text-muted-foreground mb-6">
                        We couldn't find a profile for ID: <code className="bg-white/10 px-2 py-1 rounded text-xs">{targetProfileId}</code>
                    </p>
                    <a href="/friends" className="px-6 py-2 bg-primary text-primary-foreground rounded-full font-bold">
                        Find Friends
                    </a>
                </div>
            );
        }

        return (
            <div className="min-h-screen p-4 pb-24 max-w-4xl mx-auto">
                <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <ProfileViewer profile={targetProfile as ExtendedProfile} />
                </section>
            </div>
        );
    }

    // Viewing my own profile (Editor)
    return (
        <div className="min-h-screen p-4 pb-32 space-y-12 max-w-4xl mx-auto">
            {/* Custom Profile Section */}
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <ProfileEditor
                    initialData={{
                        id: myProfile.id,
                        displayName: myProfile.displayName,
                        avatarUrl: myProfile.avatarUrl,
                        bio: myProfile.bio,
                        homeCity: myProfile.homeCity,
                        homeState: myProfile.homeState,
                        homeZipcode: myProfile.homeZipcode,
                        mbti: myProfile.mbti,
                        enneagram: myProfile.enneagram,
                        zodiac: myProfile.zodiac,
                        customPersonality: myProfile.customPersonality,
                        dietaryPreferences: myProfile.dietaryPreferences,
                        interests: myProfile.interests,
                        socialEnergy: myProfile.socialEnergy,
                        vibeTags: myProfile.vibeTags,
                        budgetComfort: myProfile.budgetComfort,
                        availabilityWindows: myProfile.availabilityWindows,
                        dealbreakers: myProfile.dealbreakers,
                        funFacts: myProfile.funFacts,
                        transportMode: myProfile.transportMode,
                        cuisinePreferences: myProfile.cuisinePreferences,
                        drinkPreferences: myProfile.drinkPreferences,
                        _count: myProfile._count,
                    }}
                />
            </section>
        </div>
    );
}
