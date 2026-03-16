import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { Settings } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
    const { userId } = await auth();

    if (!userId) {
        redirect("/sign-in");
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <main className="container mx-auto max-w-2xl px-6 py-8">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Settings className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-foreground">Settings</h1>
                        <p className="text-xs text-slate-500">Manage your preferences and privacy</p>
                    </div>
                </div>

                <SettingsPanel />
            </main>
        </div>
    );
}
