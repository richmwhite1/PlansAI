import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUsers() {
    try {
        const users = await prisma.profile.findMany({
            select: {
                id: true,
                clerkId: true,
                email: true,
                displayName: true,
                createdAt: true,
            },
        });

        console.log(`Total users: ${users.length}`);
        users.forEach((user) => {
            console.log(`ID: ${user.id}, ClerkID: ${user.clerkId}, Email: ${user.email}, Name: ${user.displayName}`);
        });
    } catch (error) {
        console.error('Error checking users:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkUsers();
