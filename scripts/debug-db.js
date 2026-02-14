
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log("--- DEBUG START ---");
    try {
        // 1. Check Profile columns
        console.log("Checking Profile table columns...");
        const columns = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Profile';
    `;
        const hasZipcode = columns.some(c => c.column_name === 'homeZipcode');
        console.log(`Profile.homeZipcode exists: ${hasZipcode}`);

        // 2. Check CachedEvent count
        console.log("Checking CachedEvent count...");
        const eventCount = await prisma.cachedEvent.count();
        console.log(`Total CachedEvents: ${eventCount}`);

        // 3. fetch a few events to see if they look valid
        if (eventCount > 0) {
            const events = await prisma.cachedEvent.findMany({ take: 3 });
            console.log("Sample Events:", JSON.stringify(events, null, 2));
        } else {
            console.log("No stored activities found. This explains why 'What' field might be empty if it relies on cache.");
        }

    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        await prisma.$disconnect();
        console.log("--- DEBUG END ---");
    }
}

main();
