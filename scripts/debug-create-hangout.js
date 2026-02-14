
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("--- DEBUG HANGOUT CREATE START ---");
    try {
        // 1. Mock Data with Randomness to avoid P2002
        const randomSuffix = Math.floor(Math.random() * 1000000);
        const mockUserId = `user_debug_${randomSuffix}`;
        const mockEmail = `test_debug_${randomSuffix}@example.com`;

        console.log(`Creating/Updating Creator (${mockUserId})...`);
        const creator = await prisma.profile.upsert({
            where: { clerkId: mockUserId },
            update: {},
            create: {
                clerkId: mockUserId,
                email: mockEmail,
                displayName: "Debug User",
                homeLatitude: 37.77,
                homeLongitude: -122.41
            }
        });
        console.log("Creator ID:", creator.id);

        // 2. Mock Body
        const body = {
            title: "Debug Hangout",
            description: "Testing creation",
            creatorId: creator.id,
            status: "PLANNING",
            isVotingEnabled: false,
            allowGuestsToInvite: true,
            visibility: "FRIENDS_ONLY",
            consensusThreshold: 60,
            type: "CASUAL",
            participants: {
                create: [
                    {
                        // Fix: Use connect instead of scalar profileId
                        profile: { connect: { id: creator.id } },
                        role: "CREATOR",
                        rsvpStatus: "GOING",
                        isMandatory: false
                    }
                ]
            }
        };

        console.log("Attempting to create Hangout...");
        const hangout = await prisma.hangout.create({
            data: body
        });

        console.log("SUCCESS! Hangout Created:", hangout.id);

    } catch (e) {
        console.error("ERROR CREATING HANGOUT:", e);
        if (e.code) console.error("Prisma Code:", e.code);
        if (e.meta) console.error("Prisma Meta:", e.meta);
    } finally {
        await prisma.$disconnect();
        console.log("--- DEBUG END ---");
    }
}

main();
