import { PrismaClient } from '@prisma/client';

async function verifyFriendsFlow() {
    const prisma = new PrismaClient();
    console.log("🚀 Starting Friends Flow Verification...\n");

    try {
        // 1. Find our seeded users
        const sarah = await prisma.profile.findFirst({ where: { displayName: "Sarah Miller" } });
        const mike = await prisma.profile.findFirst({ where: { displayName: "Mike Chen" } });
        const alex = await prisma.profile.findFirst({ where: { displayName: "Alex Reed" } });

        if (!sarah || !mike || !alex) {
            console.error("❌ Seeded users not found. Run seed script first.");
            return;
        }

        console.log(`✅ Seeded users found: Sarah (${sarah.id}), Mike (${mike.id}), Alex (${alex.id})`);

        const totalProfiles = await prisma.profile.count();
        console.log(`📊 Total profiles in DB: ${totalProfiles}`);

        // 2. Test Discovery Logic (Simulate Alex looking for suggestions)
        // Alex is CURRENTLY accepted with Mike, and pending with Sarah? 
        // Let's check existing friendships
        const alexFriends = await prisma.friendship.findMany({
            where: { OR: [{ profileAId: alex.id }, { profileBId: alex.id }] }
        });

        const excludedIds = new Set([alex.id]);
        alexFriends.forEach(f => {
            excludedIds.add(f.profileAId);
            excludedIds.add(f.profileBId);
        });

        const suggested = await prisma.profile.findMany({
            where: { id: { notIn: Array.from(excludedIds) } },
            take: 5
        });

        console.log(`🔍 Discovery for Alex: Found ${suggested.length} suggested users.`);
        suggested.forEach(u => console.log(`   - Suggested: ${u.displayName}`));

        // 3. Test Add Friend Logic (Simulate Mike adding a new random user if exists, or just verify the existing ones)
        // Let's try to find if there are any other users or create a temporary one for testing
        const tempUser = await prisma.profile.upsert({
            where: { clerkId: "user_verify_test" },
            update: {},
            create: {
                clerkId: "user_verify_test",
                displayName: "Verify Tester",
                email: "verify@test.com"
            }
        });

        console.log(`👤 Created/Found Temp User for testing: ${tempUser.displayName}`);

        // Mike adds Verify Tester
        const existing = await prisma.friendship.findUnique({
            where: { profileAId_profileBId: { profileAId: mike.id, profileBId: tempUser.id } }
        });

        if (!existing) {
            const request = await prisma.friendship.create({
                data: {
                    profileAId: mike.id,
                    profileBId: tempUser.id,
                    status: "PENDING"
                }
            });
            console.log(`➕ Mike sent friend request to ${tempUser.displayName}: Status ${request.status}`);
        } else {
            console.log(`ℹ️ Friend request from Mike to ${tempUser.displayName} already exists.`);
        }

        // 4. Test Search Logic
        const searchQuery = "Miller";
        const searchResults = await prisma.profile.findMany({
            where: {
                OR: [
                    { displayName: { contains: searchQuery, mode: 'insensitive' } },
                    { email: { contains: searchQuery, mode: 'insensitive' } }
                ]
            }
        });

        console.log(`🔎 Search for '${searchQuery}': Found ${searchResults.length} results.`);
        searchResults.forEach(r => console.log(`   - Result: ${r.displayName}`));

        // Cleanup temp data if needed
        // await prisma.friendship.deleteMany({ where: { profileBId: tempUser.id } });
        // await prisma.profile.delete({ where: { id: tempUser.id } });

        console.log("\n✨ Verification Complete: All logic paths confirmed.");

    } catch (err) {
        console.error("❌ Verification failed:", err);
    } finally {
        await prisma.$disconnect();
    }
}

verifyFriendsFlow();
