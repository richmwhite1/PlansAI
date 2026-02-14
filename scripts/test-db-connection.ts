
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        await prisma.$connect();
        console.log('Successfully connected to the database');
        const userCount = await prisma.profile.count();
        console.log(`Profile count: ${userCount}`);
        const profileCount = await prisma.profile.count();
        console.log(`Profile count: ${profileCount}`);
    } catch (e) {
        console.error('Error connecting to database:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
