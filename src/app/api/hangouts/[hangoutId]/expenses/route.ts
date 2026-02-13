import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile } from "@/lib/profile-utils";

type RouteContext = { params: Promise<{ hangoutId: string }> };

// GET — list expenses for a hangout with settlement calculation
export async function GET(request: Request, context: RouteContext) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { hangoutId } = await context.params;
        const expenses = await prisma.hangoutExpense.findMany({
            where: { hangoutId },
            include: {
                paidBy: { select: { id: true, displayName: true, avatarUrl: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        // Get all participants
        const participants = await prisma.hangoutParticipant.findMany({
            where: { hangoutId },
            include: { profile: { select: { id: true, displayName: true, avatarUrl: true } } },
        });

        const participantProfiles = participants
            .filter((p: any) => p.profile)
            .map((p: any) => p.profile);

        // Calculate totals
        const total = expenses.reduce((sum: number, e: any) => sum + e.amount, 0);

        // Calculate settlement: who owes who
        // Each person's balance: positive = owed money, negative = owes money
        const balances: Record<string, number> = {};
        participantProfiles.forEach((p: any) => { balances[p.id] = 0; });

        for (const expense of expenses) {
            const ex = expense as any;
            const payerId = ex.paidById;
            let splitPeople: string[];

            if (ex.splitType === "CUSTOM" && ex.splitAmong?.length > 0) {
                splitPeople = ex.splitAmong;
            } else {
                // EVEN: split among all participants
                splitPeople = participantProfiles.map((p: any) => p.id);
            }

            const perPerson = ex.amount / splitPeople.length;

            // Payer is owed money
            balances[payerId] = (balances[payerId] || 0) + ex.amount;
            // Each person in the split owes their share
            for (const personId of splitPeople) {
                balances[personId] = (balances[personId] || 0) - perPerson;
            }
        }

        // Build settlements: simplify debts
        const settlements: { from: any; to: any; amount: number }[] = [];
        const debtors = Object.entries(balances)
            .filter(([_, b]) => b < -0.01)
            .map(([id, b]) => ({ id, amount: Math.abs(b) }))
            .sort((a, b) => b.amount - a.amount);
        const creditors = Object.entries(balances)
            .filter(([_, b]) => b > 0.01)
            .map(([id, b]) => ({ id, amount: b }))
            .sort((a, b) => b.amount - a.amount);

        let i = 0, j = 0;
        while (i < debtors.length && j < creditors.length) {
            const payment = Math.min(debtors[i].amount, creditors[j].amount);
            if (payment > 0.01) {
                settlements.push({
                    from: participantProfiles.find((p: any) => p.id === debtors[i].id) || { id: debtors[i].id, displayName: "Unknown" },
                    to: participantProfiles.find((p: any) => p.id === creditors[j].id) || { id: creditors[j].id, displayName: "Unknown" },
                    amount: Math.round(payment * 100) / 100,
                });
            }
            debtors[i].amount -= payment;
            creditors[j].amount -= payment;
            if (debtors[i].amount < 0.01) i++;
            if (creditors[j].amount < 0.01) j++;
        }

        console.log("[Expenses GET] Found", expenses.length, "expenses, total:", total);
        return NextResponse.json({ expenses, total, settlements, participantCount: participantProfiles.length });
    } catch (err) {
        console.error("Failed to fetch expenses:", err);
        return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
    }
}

// POST — add an expense
export async function POST(request: Request, context: RouteContext) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const profile = await getOrCreateProfile(userId);
        if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

        const { hangoutId } = await context.params;
        const body = await request.json();
        const { amount, description, splitType, splitAmong } = body;

        console.log("[Expenses POST] Creating expense:", { hangoutId, amount, description, splitType, paidById: profile.id });

        if (!amount || amount <= 0) {
            return NextResponse.json({ error: "Valid amount is required" }, { status: 400 });
        }

        if (!description?.trim()) {
            return NextResponse.json({ error: "Description is required" }, { status: 400 });
        }

        const expense = await prisma.hangoutExpense.create({
            data: {
                hangoutId,
                paidById: profile.id,
                amount: parseFloat(amount),
                description: description.trim(),
                splitType: splitType || "EVEN",
                splitAmong: splitAmong || [],
            },
            include: {
                paidBy: { select: { id: true, displayName: true, avatarUrl: true } },
            },
        });

        console.log("[Expenses POST] Expense created:", expense.id);
        return NextResponse.json({ expense });
    } catch (err) {
        console.error("Failed to create expense:", err);
        return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
    }
}

// DELETE — remove an expense
export async function DELETE(request: Request, context: RouteContext) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const expenseId = searchParams.get("expenseId");

        if (!expenseId) {
            return NextResponse.json({ error: "Expense ID required" }, { status: 400 });
        }

        await prisma.hangoutExpense.delete({ where: { id: expenseId } });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Failed to delete expense:", err);
        return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
    }
}
