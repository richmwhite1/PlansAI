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
                volunteers: {
                    include: {
                        profile: { select: { id: true, displayName: true, avatarUrl: true } },
                    },
                },
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
        const { title } = body;

        console.log("[Tasks POST] Creating task:", { hangoutId, title });

        if (!title?.trim()) {
            return NextResponse.json({ error: "Title is required" }, { status: 400 });
        }

        const task = await prisma.hangoutTask.create({
            data: {
                hangoutId,
                title: title.trim(),
            },
            include: {
                assignee: { select: { id: true, displayName: true, avatarUrl: true } },
                volunteers: {
                    include: {
                        profile: { select: { id: true, displayName: true, avatarUrl: true } },
                    },
                },
            },
        });

        console.log("[Tasks POST] Task created:", task.id);
        return NextResponse.json({ task });
    } catch (err) {
        console.error("Failed to create task:", err);
        return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
    }
}

// PATCH — toggle volunteer or toggle completion
export async function PATCH(request: Request, context: RouteContext) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const profile = await getOrCreateProfile(userId);
        if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

        const body = await request.json();
        const { taskId, action } = body;

        console.log("[Tasks PATCH]", { taskId, action, profileId: profile.id });

        if (!taskId) {
            return NextResponse.json({ error: "Task ID required" }, { status: 400 });
        }

        if (action === "volunteer") {
            // Toggle volunteer: if already volunteered, remove; otherwise add
            const existing = await prisma.hangoutTaskVolunteer.findUnique({
                where: { taskId_profileId: { taskId, profileId: profile.id } },
            });

            if (existing) {
                await prisma.hangoutTaskVolunteer.delete({ where: { id: existing.id } });
                console.log("[Tasks PATCH] Removed volunteer");
            } else {
                await prisma.hangoutTaskVolunteer.create({
                    data: { taskId, profileId: profile.id },
                });
                console.log("[Tasks PATCH] Added volunteer");
            }
        } else if (action === "complete") {
            const task = await prisma.hangoutTask.findUnique({ where: { id: taskId } });
            if (task) {
                await prisma.hangoutTask.update({
                    where: { id: taskId },
                    data: { isComplete: !task.isComplete },
                });
            }
        }

        // Return updated task
        const task = await prisma.hangoutTask.findUnique({
            where: { id: taskId },
            include: {
                assignee: { select: { id: true, displayName: true, avatarUrl: true } },
                volunteers: {
                    include: {
                        profile: { select: { id: true, displayName: true, avatarUrl: true } },
                    },
                },
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
