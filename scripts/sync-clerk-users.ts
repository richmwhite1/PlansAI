
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

if (!CLERK_SECRET_KEY) {
    console.error("Error: CLERK_SECRET_KEY is missing from .env");
    process.exit(1);
}

async function main() {
    console.log("Syncing users from Clerk...");

    const response = await fetch("https://api.clerk.com/v1/users?limit=100", {
        headers: {
            "Authorization": `Bearer ${CLERK_SECRET_KEY}`,
            "Content-Type": "application/json"
        }
    });

    if (!response.ok) {
        console.error("Failed to fetch from Clerk:", response.status, response.statusText);
        const body = await response.text();
        console.error("Response:", body);
        process.exit(1);
    }

    const clerkUsers = await response.json();
    console.log(`Found ${clerkUsers.length} users in Clerk.`);

    for (const u of clerkUsers) {
        const email = u.email_addresses[0]?.email_address;
        const displayName = u.first_name
            ? `${u.first_name} ${u.last_name || ""}`.trim()
            : email?.split("@")[0] || "Unknown";

        console.log(`Syncing: ${displayName} (${email})`);

        await prisma.profile.upsert({
            where: { clerkId: u.id },
            update: {
                // Update basic fields just in case
                email: email,
                displayName: displayName,
                avatarUrl: u.image_url
            },
            create: {
                clerkId: u.id,
                email: email,
                displayName: displayName,
                avatarUrl: u.image_url,
                // Default location for now, user can update later
                homeCity: "San Francisco",
                homeState: "CA",
                homeZipcode: "94103",
                homeLatitude: 37.7749,
                homeLongitude: -122.4194
            }
        });
    }

    console.log("Sync completed successfully.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
