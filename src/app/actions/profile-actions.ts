"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
    const { userId } = await auth();

    if (!userId) {
        throw new Error("Unauthorized");
    }

    const bio = formData.get("bio") as string;
    const mbti = formData.get("mbti") as string;
    const enneagram = formData.get("enneagram") as string;
    const zodiac = formData.get("zodiac") as string;
    const customPersonality = formData.get("customPersonality") as string;
    const scheduleFlexibility = formData.get("scheduleFlexibility") as string;

    // Handle array fields
    const dietaryPreferencesRaw = formData.get("dietaryPreferences") as string;
    const dietaryPreferences = dietaryPreferencesRaw ? dietaryPreferencesRaw.split(",").map(s => s.trim()).filter(Boolean) : [];

    const interestsRaw = formData.get("interests") as string;
    const interests = interestsRaw ? interestsRaw.split(",").map(s => s.trim()).filter(Boolean) : [];

    try {
        // We need the email for creation if the profile doesn't exist
        // auth() doesn't return email, so we might need to fetch from Clerk or use a default
        // For now, let's try to find if a profile exists first to be safe
        const existingProfile = await prisma.profile.findUnique({
            where: { clerkId: userId }
        });

        const profileData = {
            bio,
            mbti,
            enneagram,
            zodiac,
            customPersonality,
            scheduleFlexibility,
            dietaryPreferences,
            interests,
        };

        if (existingProfile) {
            await prisma.profile.update({
                where: { clerkId: userId },
                data: profileData,
            });
        } else {
            // Create new profile
            // We'll use a placeholder email or try to get it if available
            await prisma.profile.create({
                data: {
                    clerkId: userId,
                    email: "", // We should ideally get this from Clerk
                    ...profileData,
                },
            });
        }
    } catch (error: any) {
        console.error("CRITICAL: Error updating profile:", error);
        // Log more details if it's a Prisma error
        if (error.code) {
            console.error("Prisma Error Code:", error.code);
            console.error("Prisma Error Message:", error.message);
        }
        throw new Error(`Failed to update profile: ${error.message || 'Unknown error'}`);
    }

    revalidatePath("/profile");
    return { success: true };
}
