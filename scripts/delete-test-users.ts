import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteTestUsers() {
    try {
        const result = await prisma.profile.deleteMany({
            where: {
                OR: [
                    { email: { endsWith: '@example.com' } },
                    { email: 'verify@test.com' },
                    { email: { endsWith: '@test.com' } } // Covering other potentials
                ]
            }
        });

        console.log(`Deleted ${result.count} test users.`);
    } catch (error) {
        console.error('Error deleting users:', error);
    } finally {
        await prisma.$disconnect();
    }
}

deleteTestUsers();
