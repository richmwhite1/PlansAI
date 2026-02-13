"use client";

import { useState, useEffect } from "react";
import { DollarSign, Plus, Trash2, User, Loader2, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface ExpensePayer {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
}

interface Expense {
    id: string;
    amount: number;
    description: string;
    paidBy: ExpensePayer;
    splitAmong: string[];
    createdAt: string;
}

interface Participant {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
}

interface HangoutExpensesProps {
    hangoutId: string;
    participants: Participant[];
    isParticipant: boolean;
}

export function HangoutExpenses({ hangoutId, participants, isParticipant }: HangoutExpensesProps) {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

    // Form state
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");

    useEffect(() => {
        fetchExpenses();
    }, [hangoutId]);

    const fetchExpenses = async () => {
        try {
            const res = await fetch(`/api/hangouts/${hangoutId}/expenses`);
            const data = await res.json();
            if (data.expenses) {
                setExpenses(data.expenses);
                setTotal(data.total || 0);
            }
        } catch (err) {
            console.error("Failed to fetch expenses:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!amount || !description.trim()) return;
        setIsAdding(true);
        try {
            const res = await fetch(`/api/hangouts/${hangoutId}/expenses`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amount: parseFloat(amount),
                    description: description.trim(),
                    splitAmong: participants.map(p => p.id),
                }),
            });
            const data = await res.json();
            if (data.expense) {
                setExpenses(prev => [data.expense, ...prev]);
                setTotal(prev => prev + data.expense.amount);
                setAmount("");
                setDescription("");
                setShowForm(false);
            }
        } catch (err) {
            console.error("Failed to add expense:", err);
        } finally {
            setIsAdding(false);
        }
    };

    const handleDelete = async (expenseId: string, expenseAmount: number) => {
        setExpenses(prev => prev.filter(e => e.id !== expenseId));
        setTotal(prev => prev - expenseAmount);
        try {
            await fetch(`/api/hangouts/${hangoutId}/expenses?expenseId=${expenseId}`, {
                method: "DELETE",
            });
        } catch (err) {
            fetchExpenses(); // Revert
        }
    };

    const perPerson = participants.length > 0 ? total / participants.length : 0;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                        Expenses
                    </h3>
                    {total > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                            ${total.toFixed(2)} total
                        </span>
                    )}
                </div>
                {isParticipant && (
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add Expense
                    </button>
                )}
            </div>

            {/* Summary Card */}
            {total > 0 && (
                <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-primary/10 border border-emerald-500/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Per Person</p>
                            <p className="text-2xl font-bold text-emerald-400">${perPerson.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Total</p>
                            <p className="text-lg font-bold text-foreground">${total.toFixed(2)}</p>
                        </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">
                        Split among {participants.length} {participants.length === 1 ? "person" : "people"}
                    </p>
                </div>
            )}

            {/* Add Expense Form */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 rounded-xl bg-card border border-white/5 space-y-3">
                            <div className="flex gap-3">
                                <div className="relative w-28">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="w-full bg-input/50 border border-white/10 rounded-lg pl-8 pr-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50"
                                        autoFocus
                                    />
                                </div>
                                <input
                                    type="text"
                                    placeholder="What was it for?"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                                    className="flex-1 bg-input/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50"
                                />
                            </div>
                            <button
                                onClick={handleAdd}
                                disabled={isAdding || !amount || !description.trim()}
                                className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-bold transition-all hover:bg-primary/90 disabled:opacity-50"
                            >
                                {isAdding ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Add Expense"}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Expense List */}
            {isLoading ? (
                <div className="space-y-2">
                    {[1, 2].map(i => (
                        <div key={i} className="h-16 rounded-xl bg-card/50 animate-pulse" />
                    ))}
                </div>
            ) : expenses.length === 0 ? (
                <div className="text-center py-8">
                    <Receipt className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                    <p className="text-sm text-muted-foreground">No expenses tracked yet.</p>
                </div>
            ) : (
                <div className="space-y-1.5">
                    <AnimatePresence>
                        {expenses.map((expense) => (
                            <motion.div
                                key={expense.id}
                                layout
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                className="flex items-center gap-3 p-3 rounded-xl bg-card/50 hover:bg-card/80 border border-white/5 transition-all group"
                            >
                                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                                    <DollarSign className="w-5 h-5 text-emerald-400" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">
                                        {expense.description}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        {expense.paidBy.avatarUrl ? (
                                            <img
                                                src={expense.paidBy.avatarUrl}
                                                className="w-3.5 h-3.5 rounded-full"
                                                alt=""
                                            />
                                        ) : (
                                            <User className="w-3 h-3 text-muted-foreground" />
                                        )}
                                        <span className="text-[10px] text-muted-foreground">
                                            Paid by {expense.paidBy.displayName?.split(" ")[0] || "Someone"}
                                        </span>
                                    </div>
                                </div>

                                <span className="text-sm font-bold text-emerald-400 shrink-0">
                                    ${expense.amount.toFixed(2)}
                                </span>

                                {isParticipant && (
                                    <button
                                        onClick={() => handleDelete(expense.id, expense.amount)}
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
