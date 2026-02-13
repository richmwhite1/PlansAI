import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile } from "@/lib/profile-utils";

type RouteContext = { params: Promise<{ hangoutId: string }> };

// GET — list expenses for a hangout
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

        // Calculate totals
        const total = expenses.reduce((sum: number, e: any) => sum + e.amount, 0);

        return NextResponse.json({ expenses, total });
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
        const { amount, description, splitAmong } = body;

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
                splitAmong: splitAmong || [],
            },
            include: {
                paidBy: { select: { id: true, displayName: true, avatarUrl: true } },
            },
        });

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
