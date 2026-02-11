"use client";

import { useState } from "react";
import { updateProfile } from "@/app/actions/profile-actions";
import { useRouter } from "next/navigation";

// Define the SocialBattery enum since we might not have it available on client w/o importing from prisma client (which is server-side mostly)
// Re-declaring for client usage or importing if shared types exist.
enum SocialBattery {
    LOW = "LOW",
    MEDIUM = "MEDIUM",
    HIGH = "HIGH",
}

interface ProfileEditorProps {
    initialData: {
        bio?: string | null;
        personalityType?: string | null;
        socialBattery?: string;
        scheduleFlexibility?: string | null;
        dietaryPreferences?: string[];
        interests?: string[];
    };
}

export function ProfileEditor({ initialData }: ProfileEditorProps) {
    const [isEditing, setIsEditing] = useState(false);
    const router = useRouter();

    // Local state for form fields to handle UI updates
    // In a real app, use a form library like react-hook-form + zod
    const [loading, setLoading] = useState(false);

    if (!isEditing) {
        return (
            <div className="w-full max-w-2xl mx-auto bg-white/5 p-6 rounded-xl border border-white/10">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Your DNA</h2>
                    <button
                        onClick={() => setIsEditing(true)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
                    >
                        Edit Profile
                    </button>
                </div>

                <div className="space-y-6">
                    <div>
                        <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-2">Bio</h3>
                        <p className="text-lg">{initialData.bio || "No bio added yet."}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-2">Personality</h3>
                            <p>{initialData.personalityType || "Not specified"}</p>
                        </div>
                        <div>
                            <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-2">Social Battery</h3>
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${initialData.socialBattery === 'HIGH' ? 'bg-green-500/20 text-green-400' :
                                        initialData.socialBattery === 'LOW' ? 'bg-red-500/20 text-red-400' :
                                            'bg-yellow-500/20 text-yellow-400'
                                    }`}>
                                    {initialData.socialBattery || "MEDIUM"}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-2">Interests</h3>
                        <div className="flex flex-wrap gap-2">
                            {initialData.interests?.length ? (
                                initialData.interests.map((interest, i) => (
                                    <span key={i} className="px-3 py-1 bg-white/10 rounded-full text-sm">
                                        {interest}
                                    </span>
                                ))
                            ) : (
                                <p className="text-gray-500 italic">No interests listed</p>
                            )}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-2">Dietary Preferences</h3>
                        <div className="flex flex-wrap gap-2">
                            {initialData.dietaryPreferences?.length ? (
                                initialData.dietaryPreferences.map((pref, i) => (
                                    <span key={i} className="px-3 py-1 bg-green-900/30 text-green-400 border border-green-800 rounded-full text-sm">
                                        {pref}
                                    </span>
                                ))
                            ) : (
                                <p className="text-gray-500 italic">No restrictions listed</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-2xl mx-auto bg-white/5 p-6 rounded-xl border border-white/10">
            <h2 className="text-2xl font-bold mb-6">Edit Profile</h2>
            <form
                action={async (formData) => {
                    setLoading(true);
                    try {
                        await updateProfile(formData);
                        setIsEditing(false);
                        router.refresh();
                    } catch (err) {
                        alert("Failed to update profile");
                    } finally {
                        setLoading(false);
                    }
                }}
                className="space-y-6"
            >
                <div>
                    <label className="block text-sm font-medium mb-2">Bio</label>
                    <textarea
                        name="bio"
                        defaultValue={initialData.bio || ""}
                        className="w-full bg-black/20 border border-white/10 rounded-lg p-3 min-h-[100px] focus:outline-none focus:border-blue-500"
                        placeholder="Tell us about yourself..."
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium mb-2">Personality Type</label>
                        <input
                            name="personalityType"
                            defaultValue={initialData.personalityType || ""}
                            className="w-full bg-black/20 border border-white/10 rounded-lg p-3 focus:outline-none focus:border-blue-500"
                            placeholder="e.g. ENFP, Social Butterfly"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Social Battery</label>
                        <select
                            name="socialBattery"
                            defaultValue={initialData.socialBattery || "MEDIUM"}
                            className="w-full bg-black/20 border border-white/10 rounded-lg p-3 focus:outline-none focus:border-blue-500 appearance-none"
                        >
                            <option value="LOW">Low (Introvert mode)</option>
                            <option value="MEDIUM">Medium (Ambivert)</option>
                            <option value="HIGH">High (Full Extrovert)</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">Interests (comma separated)</label>
                    <input
                        name="interests"
                        defaultValue={initialData.interests?.join(", ") || ""}
                        className="w-full bg-black/20 border border-white/10 rounded-lg p-3 focus:outline-none focus:border-blue-500"
                        placeholder="Hiking, Coding, Coffee, Jazz..."
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">Dietary Preferences (comma separated)</label>
                    <input
                        name="dietaryPreferences"
                        defaultValue={initialData.dietaryPreferences?.join(", ") || ""}
                        className="w-full bg-black/20 border border-white/10 rounded-lg p-3 focus:outline-none focus:border-blue-500"
                        placeholder="Vegan, Gluten-Free, Halal..."
                    />
                </div>

                <div className="pt-4 flex gap-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        {loading ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="px-6 py-2 bg-transparent hover:bg-white/5 border border-white/10 rounded-lg font-medium transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}
