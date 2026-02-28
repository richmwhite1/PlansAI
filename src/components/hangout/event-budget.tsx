"use client";

import { useState, useEffect } from "react";
import { DollarSign, Users, Send, CheckCircle2, Clock, Loader2, Bell, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface Participant {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
    venmoHandle?: string | null;
    paypalHandle?: string | null;
    zelleHandle?: string | null;
    cashappHandle?: string | null;
    applePayHandle?: string | null;
}

interface Payment {
    id: string;
    amount: number;
    status: string;
    method: string | null;
    sender: { id: string; displayName: string | null; avatarUrl: string | null };
    receiver: { id: string; displayName: string | null; avatarUrl: string | null };
    createdAt: string;
}

interface BudgetData {
    id: string;
    totalCost: number;
    currency: string;
    notes: string | null;
    isFlatFee: boolean;
    costPerPerson: number;
    participantCount: number;
}

interface EventBudgetProps {
    hangoutId: string;
    participants: Participant[];
    isOrganizer: boolean;
    isParticipant: boolean;
    currentUserId?: string;
}

export function EventBudget({ hangoutId, participants, isOrganizer, isParticipant, currentUserId }: EventBudgetProps) {
    const [budget, setBudget] = useState<BudgetData | null>(null);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [totalCost, setTotalCost] = useState("");
    const [isFlatFee, setIsFlatFee] = useState(false);
    const [notes, setNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchBudget();
    }, [hangoutId]);

    const fetchBudget = async () => {
        try {
            const res = await fetch(`/api/hangouts/${hangoutId}/budget`);
            if (res.ok) {
                const data = await res.json();
                setBudget(data.budget);
                setPayments(data.payments || []);
                if (data.budget) {
                    setTotalCost(data.budget.totalCost.toString());
                    setIsFlatFee(data.budget.isFlatFee || false);
                    setNotes(data.budget.notes || "");
                }
            }
        } catch (err) {
            console.error("Failed to fetch budget:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveBudget = async (notify: boolean = false) => {
        if (!totalCost || parseFloat(totalCost) <= 0) {
            toast.error("Please enter a valid total cost");
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch(`/api/hangouts/${hangoutId}/budget`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    totalCost: parseFloat(totalCost),
                    notes,
                    isFlatFee,
                    notifyParticipants: notify,
                }),
            });

            if (res.ok) {
                await fetchBudget();
                setEditing(false);
                toast.success(notify ? "Budget saved & participants notified!" : "Budget saved!");
            }
        } catch (err) {
            toast.error("Failed to save budget");
        } finally {
            setSubmitting(false);
        }
    };

    const handleMarkAsSent = async (receiverId: string, method: string) => {
        try {
            const res = await fetch(`/api/hangouts/${hangoutId}/payments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    receiverId,
                    amount: budget?.costPerPerson || 0,
                    method,
                }),
            });

            if (res.ok) {
                await fetchBudget();
                toast.success("Marked as sent!");
            }
        } catch (err) {
            toast.error("Failed to update payment status");
        }
    };

    const handleConfirmReceived = async (paymentId: string) => {
        try {
            const res = await fetch(`/api/hangouts/${hangoutId}/payments/${paymentId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "COMPLETED" }),
            });

            if (res.ok) {
                await fetchBudget();
                toast.success("Payment confirmed!");
            }
        } catch (err) {
            toast.error("Failed to confirm payment");
        }
    };

    // Find the organizer's payment handles
    const organizer = participants.find(p =>
        [p.venmoHandle, p.paypalHandle, p.zelleHandle, p.cashappHandle, p.applePayHandle].some(Boolean)
    );

    const getPaymentLink = (handle: string | null | undefined, type: string) => {
        if (!handle) return null;
        switch (type) {
            case "venmo": return `venmo://paycharge?txn=pay&recipients=${handle}`;
            case "paypal": return `https://paypal.me/${handle}`;
            case "cashapp": return `https://cash.app/$${handle}`;
            default: return null;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-400" />
                    Event Budget
                </h3>
                {isOrganizer && !editing && (
                    <button
                        onClick={() => setEditing(true)}
                        className="text-xs font-medium text-primary hover:text-primary/80"
                    >
                        {budget ? "Edit" : "Set Budget"}
                    </button>
                )}
            </div>

            {/* Budget Setup / Edit */}
            <AnimatePresence>
                {(editing || (!budget && isOrganizer)) && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-slate-900/60 rounded-xl p-4 border border-white/10 space-y-3 overflow-hidden"
                    >
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs text-slate-400">{isFlatFee ? "Flat Fee (Per Person)" : "Total Event Cost"}</label>
                                <button
                                    onClick={() => setIsFlatFee(!isFlatFee)}
                                    className="text-xs font-bold text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                                >
                                    {isFlatFee ? "Switch to Split Cost" : "Switch to Flat Fee"}
                                </button>
                            </div>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={totalCost}
                                    onChange={(e) => setTotalCost(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full bg-slate-800/50 border border-white/10 rounded-lg pl-7 pr-3 py-2.5 text-lg font-bold text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                                />
                            </div>
                            <textarea
                                placeholder="Notes (e.g. what the budget covers)"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 resize-none h-14"
                            />

                            {totalCost && parseFloat(totalCost) > 0 && (
                                <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-center">
                                    <p className="text-xs text-slate-400">
                                        {isFlatFee
                                            ? `Total collected (from ${participants.length || 1} people)`
                                            : `Per person (÷ ${participants.length || 1} participants)`}
                                    </p>
                                    <p className="text-2xl font-bold text-primary">
                                        ${isFlatFee
                                            ? (parseFloat(totalCost) * Math.max(participants.length, 1)).toFixed(2)
                                            : (parseFloat(totalCost) / Math.max(participants.length, 1)).toFixed(2)}
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleSaveBudget(false)}
                                    disabled={submitting}
                                    className="flex-1 py-2 bg-white/10 text-white rounded-lg text-xs font-bold disabled:opacity-50"
                                >
                                    Save
                                </button>
                                <button
                                    onClick={() => handleSaveBudget(true)}
                                    disabled={submitting}
                                    className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1.5"
                                >
                                    {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bell className="w-3 h-3" />}
                                    Save & Notify
                                </button>
                            </div>
                            {budget && (
                                <button
                                    onClick={() => setEditing(false)}
                                    className="w-full text-xs text-slate-400 hover:text-white py-1"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Budget Summary */}
            {
                budget && !editing && (
                    <div className="bg-slate-900/60 rounded-xl p-4 border border-white/5 space-y-4">
                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">{budget.isFlatFee ? "Total Expected" : "Total"}</p>
                                <p className="text-lg font-bold text-white">${budget.isFlatFee ? (budget.totalCost * budget.participantCount).toFixed(2) : budget.totalCost.toFixed(2)}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">{budget.isFlatFee ? "Flat Fee" : "Per Person"}</p>
                                <p className="text-lg font-bold text-primary">${budget.costPerPerson.toFixed(2)}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Splitting</p>
                                <p className="text-lg font-bold text-white flex items-center justify-center gap-1">
                                    <Users className="w-4 h-4" /> {budget.participantCount}
                                </p>
                            </div>
                        </div>

                        {budget.notes && (
                            <p className="text-xs text-slate-400 italic border-t border-white/5 pt-3">{budget.notes}</p>
                        )}

                        {/* Payment Status */}
                        {payments.length > 0 && (
                            <div className="border-t border-white/5 pt-3 space-y-2">
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Payment Status</p>
                                {payments.map(payment => (
                                    <div key={payment.id} className="flex items-center gap-3 text-xs">
                                        <div className="flex-1">
                                            <span className="text-white font-medium">{payment.sender.displayName}</span>
                                            <span className="text-slate-500"> → </span>
                                            <span className="text-white font-medium">{payment.receiver.displayName}</span>
                                        </div>
                                        <span className="text-slate-400">${payment.amount.toFixed(2)}</span>
                                        <span className={cn(
                                            "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                                            payment.status === "COMPLETED" ? "bg-green-500/20 text-green-400" :
                                                payment.status === "PENDING" ? "bg-amber-500/20 text-amber-400" :
                                                    "bg-slate-500/20 text-slate-400"
                                        )}>
                                            {payment.status === "COMPLETED" ? (
                                                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Paid</span>
                                            ) : (
                                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {payment.status}</span>
                                            )}
                                        </span>
                                        {isOrganizer && payment.status === "PENDING" && (
                                            <button
                                                onClick={() => handleConfirmReceived(payment.id)}
                                                className="text-[9px] font-bold text-green-400 hover:text-green-300"
                                            >
                                                Confirm
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Payment Actions for Non-Organizers */}
                        {isParticipant && !isOrganizer && budget && organizer && (
                            <div className="border-t border-white/5 pt-3 space-y-2">
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Send Your Share</p>
                                <div className="flex flex-wrap gap-2">
                                    {organizer.venmoHandle && (
                                        <a
                                            href={getPaymentLink(organizer.venmoHandle, "venmo") || "#"}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={() => handleMarkAsSent(organizer.id, "venmo")}
                                            className="px-3 py-1.5 bg-[#008CFF]/20 text-[#008CFF] rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-[#008CFF]/30 transition-all"
                                        >
                                            Venmo <ExternalLink className="w-3 h-3" />
                                        </a>
                                    )}
                                    {organizer.paypalHandle && (
                                        <a
                                            href={getPaymentLink(organizer.paypalHandle, "paypal") || "#"}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={() => handleMarkAsSent(organizer.id, "paypal")}
                                            className="px-3 py-1.5 bg-[#003087]/20 text-[#009CDE] rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-[#003087]/30 transition-all"
                                        >
                                            PayPal <ExternalLink className="w-3 h-3" />
                                        </a>
                                    )}
                                    {organizer.cashappHandle && (
                                        <a
                                            href={getPaymentLink(organizer.cashappHandle, "cashapp") || "#"}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={() => handleMarkAsSent(organizer.id, "cashapp")}
                                            className="px-3 py-1.5 bg-[#00D632]/20 text-[#00D632] rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-[#00D632]/30 transition-all"
                                        >
                                            Cash App <ExternalLink className="w-3 h-3" />
                                        </a>
                                    )}
                                    {organizer.zelleHandle && (
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(organizer.zelleHandle || "");
                                                handleMarkAsSent(organizer.id, "zelle");
                                                toast.success("Zelle info copied!");
                                            }}
                                            className="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-purple-500/30 transition-all"
                                        >
                                            Zelle (Copy)
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )
            }

            {/* No Budget Set */}
            {
                !budget && !isOrganizer && (
                    <div className="text-center py-6 bg-white/5 rounded-xl border border-dashed border-white/10">
                        <DollarSign className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground text-xs italic">No budget set yet.</p>
                    </div>
                )
            }
        </div >
    );
}
