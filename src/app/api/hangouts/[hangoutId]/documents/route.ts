import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

// GET — List all documents for a hangout
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ hangoutId: string }> }
) {
    try {
        const { hangoutId } = await params;

        const documents = await prisma.hangoutDocument.findMany({
            where: { hangoutId },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ documents });
    } catch (error: any) {
        console.error("Error fetching documents:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// POST — Add a document
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ hangoutId: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { hangoutId } = await params;
        const body = await req.json();
        const { title, url, description } = body;

        if (!title) {
            return NextResponse.json({ error: "Title required" }, { status: 400 });
        }

        const profile = await prisma.profile.findUnique({ where: { clerkId: userId } });
        if (!profile) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        // Verify user is a participant
        const participant = await prisma.hangoutParticipant.findFirst({
            where: { hangoutId, profileId: profile.id },
        });

        if (!participant) {
            return NextResponse.json({ error: "Not a participant" }, { status: 403 });
        }

        const document = await prisma.hangoutDocument.create({
            data: {
                hangoutId,
                title,
                url: url || null,
                description: description || null,
                uploadedBy: profile.id,
            },
        });

        return NextResponse.json({ document });
    } catch (error: any) {
        console.error("Error creating document:", error);
        return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
    }
}

// DELETE — Remove a document
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ hangoutId: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { hangoutId } = await params;
        const { searchParams } = new URL(req.url);
        const documentId = searchParams.get("documentId");

        if (!documentId) {
            return NextResponse.json({ error: "documentId required" }, { status: 400 });
        }

        const profile = await prisma.profile.findUnique({ where: { clerkId: userId } });
        if (!profile) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        // Verify user is creator/organizer or the uploader
        const doc = await prisma.hangoutDocument.findUnique({ where: { id: documentId } });
        if (!doc) {
            return NextResponse.json({ error: "Document not found" }, { status: 404 });
        }

        const participant = await prisma.hangoutParticipant.findFirst({
            where: {
                hangoutId,
                profileId: profile.id,
                role: { in: ["CREATOR", "ORGANIZER"] },
            },
        });

        if (!participant && doc.uploadedBy !== profile.id) {
            return NextResponse.json({ error: "Not authorized" }, { status: 403 });
        }

        await prisma.hangoutDocument.delete({ where: { id: documentId } });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error deleting document:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
