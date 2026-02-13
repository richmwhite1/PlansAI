"use client";

import { useState, useEffect } from "react";
import { Check, Plus, Trash2, User, Loader2, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface TaskAssignee {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
}

interface Task {
    id: string;
    title: string;
    isComplete: boolean;
    assignee: TaskAssignee | null;
    createdAt: string;
}

interface Participant {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
}

interface HangoutTasksProps {
    hangoutId: string;
    participants: Participant[];
    isParticipant: boolean;
}

export function HangoutTasks({ hangoutId, participants, isParticipant }: HangoutTasksProps) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newTitle, setNewTitle] = useState("");
    const [newAssignee, setNewAssignee] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        fetchTasks();
    }, [hangoutId]);

    const fetchTasks = async () => {
        try {
            const res = await fetch(`/api/hangouts/${hangoutId}/tasks`);
            const data = await res.json();
            if (data.tasks) setTasks(data.tasks);
        } catch (err) {
            console.error("Failed to fetch tasks:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!newTitle.trim()) return;
        setIsAdding(true);
        try {
            const res = await fetch(`/api/hangouts/${hangoutId}/tasks`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: newTitle.trim(),
                    assigneeId: newAssignee || null,
                }),
            });
            const data = await res.json();
            if (data.task) {
                setTasks(prev => [data.task, ...prev]);
                setNewTitle("");
                setNewAssignee("");
                setShowForm(false);
            }
        } catch (err) {
            console.error("Failed to add task:", err);
        } finally {
            setIsAdding(false);
        }
    };

    const handleToggle = async (taskId: string, isComplete: boolean) => {
        // Optimistic update
        setTasks(prev => prev.map(t =>
            t.id === taskId ? { ...t, isComplete: !isComplete } : t
        ));

        try {
            await fetch(`/api/hangouts/${hangoutId}/tasks`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ taskId, isComplete: !isComplete }),
            });
        } catch (err) {
            // Revert
            setTasks(prev => prev.map(t =>
                t.id === taskId ? { ...t, isComplete } : t
            ));
        }
    };

    const handleDelete = async (taskId: string) => {
        setTasks(prev => prev.filter(t => t.id !== taskId));
        try {
            await fetch(`/api/hangouts/${hangoutId}/tasks?taskId=${taskId}`, {
                method: "DELETE",
            });
        } catch (err) {
            fetchTasks(); // Revert by re-fetching
        }
    };

    const completedCount = tasks.filter(t => t.isComplete).length;
    const totalCount = tasks.length;
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                        Checklist
                    </h3>
                    {totalCount > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {completedCount}/{totalCount}
                        </span>
                    )}
                </div>
                {isParticipant && (
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add Task
                    </button>
                )}
            </div>

            {/* Progress Bar */}
            {totalCount > 0 && (
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-gradient-to-r from-primary to-amber-400 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                </div>
            )}

            {/* Add Task Form */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 rounded-xl bg-card border border-white/5 space-y-3">
                            <input
                                type="text"
                                placeholder="What needs to be done?"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                                className="w-full bg-input/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50"
                                autoFocus
                            />
                            <div className="flex items-center gap-3">
                                <select
                                    value={newAssignee}
                                    onChange={(e) => setNewAssignee(e.target.value)}
                                    className="flex-1 bg-input/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
                                >
                                    <option value="">Unassigned</option>
                                    {participants.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.displayName || "Anonymous"}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    onClick={handleAdd}
                                    disabled={isAdding || !newTitle.trim()}
                                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold transition-all hover:bg-primary/90 disabled:opacity-50"
                                >
                                    {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Task List */}
            {isLoading ? (
                <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-12 rounded-xl bg-card/50 animate-pulse" />
                    ))}
                </div>
            ) : tasks.length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">No tasks yet. Add items for your group to coordinate!</p>
                </div>
            ) : (
                <div className="space-y-1.5">
                    <AnimatePresence>
                        {tasks.map((task) => (
                            <motion.div
                                key={task.id}
                                layout
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                className={cn(
                                    "flex items-center gap-3 p-3 rounded-xl transition-all group",
                                    task.isComplete
                                        ? "bg-card/30 opacity-60"
                                        : "bg-card/50 hover:bg-card/80 border border-white/5"
                                )}
                            >
                                <button
                                    onClick={() => handleToggle(task.id, task.isComplete)}
                                    disabled={!isParticipant}
                                    className="shrink-0"
                                >
                                    {task.isComplete ? (
                                        <CheckCircle2 className="w-5 h-5 text-primary" />
                                    ) : (
                                        <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                                    )}
                                </button>

                                <div className="flex-1 min-w-0">
                                    <p className={cn(
                                        "text-sm font-medium truncate",
                                        task.isComplete && "line-through text-muted-foreground"
                                    )}>
                                        {task.title}
                                    </p>
                                </div>

                                {task.assignee && (
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {task.assignee.avatarUrl ? (
                                            <img
                                                src={task.assignee.avatarUrl}
                                                className="w-5 h-5 rounded-full"
                                                alt={task.assignee.displayName || ""}
                                            />
                                        ) : (
                                            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                                                <User className="w-3 h-3 text-primary" />
                                            </div>
                                        )}
                                        <span className="text-[10px] text-muted-foreground font-medium">
                                            {task.assignee.displayName?.split(" ")[0] || "User"}
                                        </span>
                                    </div>
                                )}

                                {isParticipant && (
                                    <button
                                        onClick={() => handleDelete(task.id)}
                                        className="opacity-0 group-hover:opacity-100 shrink-0 p-1 text-muted-foreground hover:text-red-400 transition-all"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
