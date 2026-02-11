"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma"; // Assuming prisma client is exported from here
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SocialBattery } from "@prisma/client";

export async function updateProfile(formData: FormData) {
    const { userId } = await auth();
    console.log("Updating profile for user:", userId);

    if (!userId) {
        console.error("Unauthorized profile update attempt");
        throw new Error("Unauthorized");
    }

    const bio = formData.get("bio") as string;
    const personalityType = formData.get("personalityType") as string;
    const socialBattery = formData.get("socialBattery") as SocialBattery;
    const scheduleFlexibility = formData.get("scheduleFlexibility") as string;

    // Handle array fields (expecting comma-separated values or multiple entries)
    // For simplicity using comma-separated strings for now from a hidden input or text area
    const dietaryPreferencesRaw = formData.get("dietaryPreferences") as string;
    const dietaryPreferences = dietaryPreferencesRaw ? dietaryPreferencesRaw.split(",").map(s => s.trim()).filter(Boolean) : [];

    const interestsRaw = formData.get("interests") as string;
    const interests = interestsRaw ? interestsRaw.split(",").map(s => s.trim()).filter(Boolean) : [];

    try {
        console.log("Saving profile data:", { bio, personalityType, socialBattery, scheduleFlexibility, dietaryPreferences, interests });
        await prisma.profile.update({
            where: { clerkId: userId },
            data: {
                bio,
                personalityType,
                socialBattery,
                scheduleFlexibility,
                dietaryPreferences,
                interests,
            },
        });
        console.log("Profile updated successfully");
    } catch (error) {
        console.error("Error updating profile:", error);
        throw new Error("Failed to update profile");
    }

    revalidatePath("/profile");
    return { success: true };
}
