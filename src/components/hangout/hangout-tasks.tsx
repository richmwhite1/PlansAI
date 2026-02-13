"use client";

import { useState, useEffect } from "react";
import { ClipboardList, Plus, Trash2, Hand, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Participant {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
}

interface TaskVolunteer {
    id: string;
    profile: Participant;
}

interface Task {
    id: string;
    title: string;
    isComplete: boolean;
    volunteers: TaskVolunteer[];
}

interface HangoutTasksProps {
    hangoutId: string;
    participants: Participant[];
    isParticipant: boolean;
    currentUserId?: string;
}

export function HangoutTasks({ hangoutId, participants, isParticipant, currentUserId }: HangoutTasksProps) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newTitle, setNewTitle] = useState("");
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        fetchTasks();
    }, [hangoutId]);

    const fetchTasks = async () => {
        try {
            const res = await fetch(`/api/hangouts/${hangoutId}/tasks`);
            if (res.ok) {
                const data = await res.json();
                setTasks(data.tasks);
            }
        } catch (err) {
            console.error("Failed to fetch tasks:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim() || isAdding) return;

        setIsAdding(true);
        try {
            const res = await fetch(`/api/hangouts/${hangoutId}/tasks`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: newTitle.trim() }),
            });

            if (res.ok) {
                const data = await res.json();
                setTasks((prev) => [data.task, ...prev]);
                setNewTitle("");
                toast.success("Task added!");
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to add task");
            }
        } catch (err) {
            console.error("Failed to add task:", err);
            toast.error("Failed to add task");
        } finally {
            setIsAdding(false);
        }
    };

    const handleVolunteer = async (taskId: string) => {
        try {
            const res = await fetch(`/api/hangouts/${hangoutId}/tasks`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ taskId, action: "volunteer" }),
            });

            if (res.ok) {
                const data = await res.json();
                setTasks((prev) => prev.map((t) => (t.id === taskId ? data.task : t)));
            }
        } catch (err) {
            console.error("Failed to volunteer:", err);
        }
    };

    const handleToggleComplete = async (taskId: string) => {
        // Optimistic update
        setTasks((prev) =>
            prev.map((t) => (t.id === taskId ? { ...t, isComplete: !t.isComplete } : t))
        );

        try {
            const res = await fetch(`/api/hangouts/${hangoutId}/tasks`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ taskId, action: "complete" }),
            });

            if (res.ok) {
                const data = await res.json();
                setTasks((prev) => prev.map((t) => (t.id === taskId ? data.task : t)));
            }
        } catch (err) {
            console.error("Failed to toggle complete:", err);
            fetchTasks(); // Revert
        }
    };

    const handleDelete = async (taskId: string) => {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));

        try {
            await fetch(`/api/hangouts/${hangoutId}/tasks?taskId=${taskId}`, {
                method: "DELETE",
            });
        } catch (err) {
            console.error("Failed to delete task:", err);
            fetchTasks(); // Revert
        }
    };

    const completedCount = tasks.filter((t) => t.isComplete).length;
    const totalCount = tasks.length;
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    if (isLoading) {
        return (
            <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-4 animate-pulse">
                <div className="h-5 bg-white/10 rounded w-1/3" />
                <div className="h-3 bg-white/10 rounded-full" />
                <div className="space-y-3">
                    {[1, 2, 3].map((n) => (
                        <div key={n} className="h-12 bg-white/5 rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-primary" />
                    <h3 className="font-bold text-white text-sm">Checklist</h3>
                </div>
                {totalCount > 0 && (
                    <span className="text-xs text-slate-400">
                        {completedCount}/{totalCount} done
                    </span>
                )}
            </div>

            {/* Progress bar */}
            {totalCount > 0 && (
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}

            {/* Task list */}
            <div className="space-y-2">
                {tasks.map((task) => (
                    <div
                        key={task.id}
                        className={cn(
                            "group flex items-start gap-3 p-3 rounded-xl border transition-all",
                            task.isComplete
                                ? "bg-emerald-500/5 border-emerald-500/10"
                                : "bg-white/5 border-white/5 hover:border-white/10"
                        )}
                    >
                        {/* Complete toggle */}
                        <button
                            onClick={() => handleToggleComplete(task.id)}
                            className="mt-0.5 shrink-0"
                        >
                            {task.isComplete ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            ) : (
                                <Circle className="w-5 h-5 text-slate-500 hover:text-primary transition-colors" />
                            )}
                        </button>

                        {/* Task content */}
                        <div className="flex-1 min-w-0">
                            <span
                                className={cn(
                                    "text-sm",
                                    task.isComplete ? "text-slate-500 line-through" : "text-white"
                                )}
                            >
                                {task.title}
                            </span>

                            {/* Volunteers row */}
                            <div className="flex items-center gap-1.5 mt-1.5">
                                {task.volunteers.map((v) => (
                                    <div key={v.id} className="relative group/vol" title={v.profile.displayName || "Unknown"}>
                                        <Avatar className="w-5 h-5 border border-primary/30">
                                            <AvatarImage src={v.profile.avatarUrl || undefined} />
                                            <AvatarFallback className="text-[8px] bg-primary/20 text-primary">
                                                {(v.profile.displayName || "?").charAt(0).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                    </div>
                                ))}

                                {/* Volunteer button */}
                                {isParticipant && !task.isComplete && (
                                    <button
                                        onClick={() => handleVolunteer(task.id)}
                                        className={cn(
                                            "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all border",
                                            task.volunteers.some((v) => v.profile.id === currentUserId)
                                                ? "bg-primary/20 text-primary border-primary/30 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30"
                                                : "bg-white/5 text-slate-400 border-white/10 hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                                        )}
                                    >
                                        <Hand className="w-3 h-3" />
                                        {task.volunteers.some((v) => v.profile.id === currentUserId)
                                            ? "Signed up"
                                            : "I'll do this"}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Delete */}
                        <button
                            onClick={() => handleDelete(task.id)}
                            className="shrink-0 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}
            </div>

            {/* Add task form */}
            {isParticipant && (
                <form onSubmit={handleAddTask} className="flex gap-2">
                    <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="Add a task..."
                        className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-colors"
                    />
                    <button
                        type="submit"
                        disabled={!newTitle.trim() || isAdding}
                        className="px-3 py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-xl font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    </button>
                </form>
            )}
        </div>
    );
}
