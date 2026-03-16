"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Bell, Eye, Info, Loader2, Moon, Radio, Users, Zap } from "lucide-react";
import { toast } from "sonner";

interface Preferences {
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    weekendNudges?: boolean;
    friendAvailabilityAlerts?: boolean;
    isDiscoverable?: boolean;
    showAvailabilityStatus?: boolean;
}

function SettingsToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            onClick={() => onChange(!checked)}
            className={cn(
                "relative w-10 h-[22px] rounded-full border transition-all shrink-0",
                checked ? "bg-primary border-primary" : "bg-white/10 border-white/15"
            )}
            role="switch"
            aria-checked={checked}
        >
            <motion.div
                animate={{ x: checked ? 18 : 2 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="absolute top-[3px] w-4 h-4 rounded-full bg-white shadow-sm"
            />
        </button>
    );
}

interface SettingsRowProps {
    icon: React.ReactNode;
    label: string;
    description: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    disabled?: boolean;
}

function SettingsRow({ icon, label, description, checked, onChange, disabled }: SettingsRowProps) {
    return (
        <div className={cn("flex items-center gap-3 py-3", disabled && "opacity-50 pointer-events-none")}>
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center shrink-0 text-slate-400">
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{description}</p>
            </div>
            <SettingsToggle checked={checked} onChange={onChange} />
        </div>
    );
}

export function SettingsPanel() {
    const [prefs, setPrefs] = useState<Preferences>({
        emailNotifications: true,
        pushNotifications: false,
        weekendNudges: true,
        friendAvailabilityAlerts: false,
        isDiscoverable: true,
        showAvailabilityStatus: true,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetch("/api/users/me")
            .then(res => res.json())
            .then(data => {
                if (data.preferences) {
                    setPrefs(prev => ({ ...prev, ...data.preferences }));
                }
            })
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, []);

    const updatePref = async (key: keyof Preferences, value: boolean) => {
        setPrefs(prev => ({ ...prev, [key]: value }));
        setIsSaving(true);

        try {
            const res = await fetch("/api/users/me", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ preferences: { [key]: value } }),
            });

            if (!res.ok) {
                throw new Error("Save failed");
            }
            toast.success("Saved");
        } catch {
            // Revert on failure
            setPrefs(prev => ({ ...prev, [key]: !value }));
            toast.error("Failed to save setting");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-16">
                <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Notification Preferences */}
            <section className="bg-white/[0.03] border border-white/6 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-1">
                    <Bell className="w-4 h-4 text-primary" />
                    <h2 className="text-sm font-semibold text-foreground">Notifications</h2>
                    {isSaving && <Loader2 className="w-3 h-3 text-slate-500 animate-spin ml-auto" />}
                </div>
                <p className="text-xs text-slate-500 mb-3">Choose what you hear about and when.</p>

                <div className="divide-y divide-white/5">
                    <SettingsRow
                        icon={<Bell className="w-4 h-4" />}
                        label="Email notifications"
                        description="Receive plan updates and invites via email"
                        checked={prefs.emailNotifications ?? true}
                        onChange={v => updatePref("emailNotifications", v)}
                    />
                    <SettingsRow
                        icon={<Zap className="w-4 h-4" />}
                        label="Push notifications"
                        description="Get alerts on your device for new activity"
                        checked={prefs.pushNotifications ?? false}
                        onChange={v => updatePref("pushNotifications", v)}
                    />
                    <SettingsRow
                        icon={<Moon className="w-4 h-4" />}
                        label="Weekend nudges"
                        description="Get a nudge Thursday/Friday to lock in plans"
                        checked={prefs.weekendNudges ?? true}
                        onChange={v => updatePref("weekendNudges", v)}
                    />
                    <SettingsRow
                        icon={<Radio className="w-4 h-4" />}
                        label="Friend availability alerts"
                        description="Know when a friend marks themselves as free"
                        checked={prefs.friendAvailabilityAlerts ?? false}
                        onChange={v => updatePref("friendAvailabilityAlerts", v)}
                    />
                </div>
            </section>

            {/* Privacy */}
            <section className="bg-white/[0.03] border border-white/6 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-1">
                    <Eye className="w-4 h-4 text-primary" />
                    <h2 className="text-sm font-semibold text-foreground">Privacy</h2>
                </div>
                <p className="text-xs text-slate-500 mb-3">Control who can see you and your status.</p>

                <div className="divide-y divide-white/5">
                    <SettingsRow
                        icon={<Users className="w-4 h-4" />}
                        label="Show me in People Discovery"
                        description="Let others find and add you as a friend"
                        checked={prefs.isDiscoverable ?? true}
                        onChange={v => updatePref("isDiscoverable", v)}
                    />
                    <SettingsRow
                        icon={<Eye className="w-4 h-4" />}
                        label="Share availability status"
                        description="Allow friends to see when you're free"
                        checked={prefs.showAvailabilityStatus ?? true}
                        onChange={v => updatePref("showAvailabilityStatus", v)}
                    />
                </div>
            </section>

            {/* App Info */}
            <section className="bg-white/[0.03] border border-white/6 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Info className="w-4 h-4 text-primary" />
                    <h2 className="text-sm font-semibold text-foreground">App Info</h2>
                </div>
                <div className="space-y-2 text-xs text-slate-500">
                    <div className="flex items-center justify-between">
                        <span>Version</span>
                        <span className="text-slate-400 font-mono">1.0.0</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span>Feedback</span>
                        <a
                            href="mailto:feedback@plansapp.com"
                            className="text-primary hover:text-primary/80 transition-colors"
                        >
                            feedback@plansapp.com
                        </a>
                    </div>
                </div>
            </section>
        </div>
    );
}
