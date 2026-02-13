import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile } from "@/lib/profile-utils";

type RouteContext = { params: Promise<{ hangoutId: string }> };

// GET — list tasks for a hangout
export async function GET(request: Request, context: RouteContext) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { hangoutId } = await context.params;
        const tasks = await prisma.hangoutTask.findMany({
            where: { hangoutId },
            include: {
                assignee: { select: { id: true, displayName: true, avatarUrl: true } },
            },
            orderBy: [{ isComplete: "asc" }, { createdAt: "desc" }],
        });

        return NextResponse.json({ tasks });
    } catch (err) {
        console.error("Failed to fetch tasks:", err);
        return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
    }
}

// POST — create a new task
export async function POST(request: Request, context: RouteContext) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { hangoutId } = await context.params;
        const body = await request.json();
        const { title, assigneeId } = body;

        if (!title?.trim()) {
            return NextResponse.json({ error: "Title is required" }, { status: 400 });
        }

        const task = await prisma.hangoutTask.create({
            data: {
                hangoutId,
                title: title.trim(),
                assigneeId: assigneeId || null,
            },
            include: {
                assignee: { select: { id: true, displayName: true, avatarUrl: true } },
            },
        });

        return NextResponse.json({ task });
    } catch (err) {
        console.error("Failed to create task:", err);
        return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
    }
}

// PATCH — toggle completion or reassign
export async function PATCH(request: Request, context: RouteContext) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await request.json();
        const { taskId, isComplete, assigneeId } = body;

        if (!taskId) {
            return NextResponse.json({ error: "Task ID required" }, { status: 400 });
        }

        const updateData: any = {};
        if (typeof isComplete === "boolean") updateData.isComplete = isComplete;
        if (assigneeId !== undefined) updateData.assigneeId = assigneeId || null;

        const task = await prisma.hangoutTask.update({
            where: { id: taskId },
            data: updateData,
            include: {
                assignee: { select: { id: true, displayName: true, avatarUrl: true } },
            },
        });

        return NextResponse.json({ task });
    } catch (err) {
        console.error("Failed to update task:", err);
        return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
    }
}

// DELETE — remove a task
export async function DELETE(request: Request, context: RouteContext) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const taskId = searchParams.get("taskId");

        if (!taskId) {
            return NextResponse.json({ error: "Task ID required" }, { status: 400 });
        }

        await prisma.hangoutTask.delete({ where: { id: taskId } });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Failed to delete task:", err);
        return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
    }
}
