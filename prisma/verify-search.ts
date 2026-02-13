import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function testSearch(params: any) {
    console.log(`\nTesting search with params:`, params);
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
        if (val) searchParams.append(key, val as string);
    });

    const url = `http://localhost:3000/api/users/search?${searchParams.toString()}`;
    console.log(`URL: ${url}`);

    // In a real test we'd fetch, but here we can just simulate the query logic
    // or tell the user to check the UI.
}

async function verifyDB() {
    const users = await prisma.profile.findMany({
        where: {
            OR: [
                { bio: { contains: 'moles', mode: 'insensitive' } },
                { displayName: { contains: 'Sarah', mode: 'insensitive' } }
            ]
        }
    });
    console.log(`Found ${users.length} users matching 'moles' or 'Sarah'`);
    users.forEach(u => console.log(`- ${u.displayName} (${u.email})`));
}

verifyDB().catch(console.error).finally(() => prisma.$disconnect());
