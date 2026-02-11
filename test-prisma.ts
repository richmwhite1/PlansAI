import { prisma } from "./src/lib/prisma";

async function test() {
    console.log("Testing Prisma Models...");
    try {
        const friendship = await prisma.friendship.findFirst();
        if (friendship) {
            console.log("Friendship keys:", Object.keys(friendship));
        } else {
            console.log("No friendship found to inspect keys.");
        }

        const hangout = await prisma.hangout.findFirst();
        if (hangout) {
            console.log("Hangout keys:", Object.keys(hangout));
        }

    } catch (err) {
        console.error("Prisma Test Failed:", err);
    } finally {
        await prisma.$disconnect();
    }
}

test();
