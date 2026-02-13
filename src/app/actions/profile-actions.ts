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

    // Handle array fields (comma-separated)
    const parseArray = (key: string): string[] => {
        const raw = formData.get(key) as string;
        return raw ? raw.split(",").map(s => s.trim()).filter(Boolean) : [];
    };

    const dietaryPreferences = parseArray("dietaryPreferences");
    const interests = parseArray("interests");
    const vibeTags = parseArray("vibeTags");
    const availabilityWindows = parseArray("availabilityWindows");
    const dealbreakers = parseArray("dealbreakers");
    const funFacts = parseArray("funFacts");

    // Numeric fields
    const socialEnergyRaw = formData.get("socialEnergy") as string;
    const socialEnergy = socialEnergyRaw ? parseInt(socialEnergyRaw, 10) : null;

    const budgetComfortRaw = formData.get("budgetComfort") as string;
    const budgetComfort = budgetComfortRaw ? parseInt(budgetComfortRaw, 10) : null;

    const transportMode = formData.get("transportMode") as string;
    const cuisinePreferences = parseArray("cuisinePreferences");
    const drinkPreferences = parseArray("drinkPreferences");

    try {
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
            socialEnergy,
            vibeTags,
            budgetComfort,
            availabilityWindows,
            dealbreakers,
            funFacts,
            transportMode,
            cuisinePreferences,
            drinkPreferences,
        };

        if (existingProfile) {
            await prisma.profile.update({
                where: { clerkId: userId },
                data: profileData,
            });
        } else {
            await prisma.profile.create({
                data: {
                    clerkId: userId,
                    email: "",
                    ...profileData,
                },
            });
        }
    } catch (error: any) {
        console.error("CRITICAL: Error updating profile:", error);
        if (error.code) {
            console.error("Prisma Error Code:", error.code);
            console.error("Prisma Error Message:", error.message);
        }
        throw new Error(`Failed to update profile: ${error.message || 'Unknown error'}`);
    }

    revalidatePath("/profile");
    return { success: true };
}
