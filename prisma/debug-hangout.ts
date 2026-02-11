import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugHangout() {
    console.log("🔍 Debugging Hangout Relation: feedbacks");
    try {
        const hangout = await prisma.hangout.findFirst({
            include: {
                feedbacks: true,
                participants: true,
                activityOptions: true
            }
        });

        if (hangout) {
            console.log("✅ Successfully fetched hangout with feedbacks relation!");
            console.log("Title:", hangout.title);
            console.log("Feedback count:", (hangout as any).feedbacks?.length);
        } else {
            console.log("ℹ️ No hangouts found in DB.");
        }
    } catch (err) {
        console.error("💥 CRASHED:");
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

debugHangout();
