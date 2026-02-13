"use client";

import { useState, useEffect } from "react";
import { DollarSign, Plus, Trash2, ArrowRight, Loader2, Users, User } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Participant {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
}

interface Settlement {
    from: Participant;
    to: Participant;
    amount: number;
}

interface Expense {
    id: string;
    amount: number;
    description: string;
    splitType: string;
    splitAmong: string[];
    paidBy: Participant;
    createdAt: string;
}

interface HangoutExpensesProps {
    hangoutId: string;
    participants: Participant[];
    isParticipant: boolean;
}

export function HangoutExpenses({ hangoutId, participants, isParticipant }: HangoutExpensesProps) {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [settlements, setSettlements] = useState<Settlement[]>([]);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    // Form state
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [splitType, setSplitType] = useState<"EVEN" | "CUSTOM">("EVEN");
    const [selectedSplit, setSelectedSplit] = useState<string[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        fetchExpenses();
    }, [hangoutId]);

    const fetchExpenses = async () => {
        try {
            const res = await fetch(`/api/hangouts/${hangoutId}/expenses`);
            if (res.ok) {
                const data = await res.json();
                setExpenses(data.expenses);
                setTotal(data.total);
                setSettlements(data.settlements || []);
            }
        } catch (err) {
            console.error("Failed to fetch expenses:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        const parsedAmount = parseFloat(amount);
        if (!description.trim() || isNaN(parsedAmount) || parsedAmount <= 0 || isAdding) return;

        if (splitType === "CUSTOM" && selectedSplit.length === 0) {
            toast.error("Select who to split with");
            return;
        }

        setIsAdding(true);
        try {
            const res = await fetch(`/api/hangouts/${hangoutId}/expenses`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    description: description.trim(),
                    amount: parsedAmount,
                    splitType,
                    splitAmong: splitType === "CUSTOM" ? selectedSplit : [],
                }),
            });

            if (res.ok) {
                toast.success("Expense logged!");
                setDescription("");
                setAmount("");
                setSplitType("EVEN");
                setSelectedSplit([]);
                setShowForm(false);
                fetchExpenses(); // Refetch to get updated settlements
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to add expense");
            }
        } catch (err) {
            console.error("Failed to add expense:", err);
            toast.error("Failed to add expense");
        } finally {
            setIsAdding(false);
        }
    };

    const handleDelete = async (expenseId: string) => {
        setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
        try {
            await fetch(`/api/hangouts/${hangoutId}/expenses?expenseId=${expenseId}`, {
                method: "DELETE",
            });
            fetchExpenses(); // Refetch for updated settlements
        } catch (err) {
            console.error("Failed to delete expense:", err);
            fetchExpenses();
        }
    };

    const toggleSplitPerson = (id: string) => {
        setSelectedSplit((prev) =>
            prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
        );
    };

    if (isLoading) {
        return (
            <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-4 animate-pulse">
                <div className="h-5 bg-white/10 rounded w-1/3" />
                <div className="space-y-3">
                    {[1, 2].map((n) => (
                        <div key={n} className="h-14 bg-white/5 rounded-xl" />
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
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <h3 className="font-bold text-white text-sm">Expenses</h3>
                </div>
                {total > 0 && (
                    <span className="text-xs font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                        ${total.toFixed(2)} total
                    </span>
                )}
            </div>

            {/* Expense list */}
            {expenses.length > 0 && (
                <div className="space-y-2">
                    {expenses.map((expense) => (
                        <div
                            key={expense.id}
                            className="group flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all"
                        >
                            {/* Payer avatar */}
                            <Avatar className="w-7 h-7 border border-emerald-500/30 shrink-0">
                                <AvatarImage src={expense.paidBy.avatarUrl || undefined} />
                                <AvatarFallback className="text-[10px] bg-emerald-500/20 text-emerald-400">
                                    {(expense.paidBy.displayName || "?").charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>

                            {/* Details */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-sm text-white font-medium truncate">{expense.description}</span>
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-[10px] text-slate-500">
                                        {expense.paidBy.displayName || "Someone"} paid
                                    </span>
                                    <span className="text-[10px] text-slate-600">·</span>
                                    <span className="text-[10px] text-slate-500">
                                        {expense.splitType === "CUSTOM"
                                            ? `Split with ${expense.splitAmong.length}`
                                            : "Split evenly"}
                                    </span>
                                </div>
                            </div>

                            {/* Amount */}
                            <span className="text-sm font-mono font-bold text-emerald-400 shrink-0">
                                ${expense.amount.toFixed(2)}
                            </span>

                            {/* Delete */}
                            <button
                                onClick={() => handleDelete(expense.id)}
                                className="shrink-0 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Settlement Summary */}
            {settlements.length > 0 && (
                <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-primary/5 border border-emerald-500/20 p-4 space-y-3">
                    <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                        💸 Who Owes Who
                    </h4>
                    <div className="space-y-2">
                        {settlements.map((s, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                                <Avatar className="w-5 h-5 border border-white/10">
                                    <AvatarImage src={s.from.avatarUrl || undefined} />
                                    <AvatarFallback className="text-[8px] bg-white/10">
                                        {(s.from.displayName || "?").charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="text-slate-300 truncate">{s.from.displayName}</span>
                                <ArrowRight className="w-3 h-3 text-emerald-400 shrink-0" />
                                <Avatar className="w-5 h-5 border border-white/10">
                                    <AvatarImage src={s.to.avatarUrl || undefined} />
                                    <AvatarFallback className="text-[8px] bg-white/10">
                                        {(s.to.displayName || "?").charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="text-slate-300 truncate">{s.to.displayName}</span>
                                <span className="text-emerald-400 font-mono font-bold ml-auto shrink-0">
                                    ${s.amount.toFixed(2)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Add Expense */}
            {isParticipant && (
                <>
                    {!showForm ? (
                        <button
                            onClick={() => setShowForm(true)}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-slate-400 hover:text-white transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            Log an expense
                        </button>
                    ) : (
                        <form onSubmit={handleAddExpense} className="space-y-3 p-3 rounded-xl bg-white/5 border border-white/10">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="What was it for?"
                                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary/50"
                                />
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="w-24 pl-7 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary/50"
                                    />
                                </div>
                            </div>

                            {/* Split type toggle */}
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSplitType("EVEN")}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border",
                                        splitType === "EVEN"
                                            ? "bg-primary/20 text-primary border-primary/30"
                                            : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
                                    )}
                                >
                                    <Users className="w-3.5 h-3.5" />
                                    Split Evenly
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSplitType("CUSTOM")}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border",
                                        splitType === "CUSTOM"
                                            ? "bg-primary/20 text-primary border-primary/30"
                                            : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
                                    )}
                                >
                                    <User className="w-3.5 h-3.5" />
                                    Custom Split
                                </button>
                            </div>

                            {/* Custom split: select people */}
                            {splitType === "CUSTOM" && (
                                <div className="flex flex-wrap gap-2">
                                    {participants.map((p) => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => toggleSplitPerson(p.id)}
                                            className={cn(
                                                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all border",
                                                selectedSplit.includes(p.id)
                                                    ? "bg-primary/20 text-primary border-primary/30"
                                                    : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
                                            )}
                                        >
                                            <Avatar className="w-4 h-4">
                                                <AvatarImage src={p.avatarUrl || undefined} />
                                                <AvatarFallback className="text-[8px]">
                                                    {(p.displayName || "?").charAt(0).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            {p.displayName || "Unknown"}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowForm(false);
                                        setDescription("");
                                        setAmount("");
                                        setSplitType("EVEN");
                                        setSelectedSplit([]);
                                    }}
                                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-400 rounded-lg text-sm transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!description.trim() || !amount || isAdding}
                                    className="flex-1 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                    Log Expense
                                </button>
                            </div>
                        </form>
                    )}
                </>
            )}
        </div>
    );
}
