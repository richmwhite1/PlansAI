
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Checking database schema...");
        // Attempt to query raw SQL to check columns
        const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Profile';
    `;

        console.log("Columns in Profile table:", result);

        const hasZipcode = (result as any[]).some((row: any) => row.column_name === 'homeZipcode');

        if (hasZipcode) {
            console.log("SUCCESS: homeZipcode column EXISTS.");
        } else {
            console.log("FAILURE: homeZipcode column is MISSING.");
        }

    } catch (e) {
        console.error('Error checking schema:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
