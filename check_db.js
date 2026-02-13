const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    const hangouts = await prisma.hangout.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            title: true,
            visibility: true,
            createdAt: true
        }
    });

    console.log("Recent Hangouts:");
    console.log(JSON.stringify(hangouts, null, 2));

    const discoverable = await prisma.discoverableHangout.findMany({
        take: 5,
        orderBy: { createdAt: "desc" }
    });
    console.log("\nRecent Discoverable Hangouts:");
    console.log(JSON.stringify(discoverable, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
