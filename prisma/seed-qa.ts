import { PrismaClient, HangoutType, HangoutStatus, RsvpStatus, ParticipantRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting QA Seeding...');

    // 1. Create SLC Events
    console.log('Creating CachedEvents for SLC (84124)...');
    const events = await Promise.all([
        prisma.cachedEvent.upsert({
            where: { googlePlaceId: 'slc_log_haven' },
            update: {},
            create: {
                googlePlaceId: 'slc_log_haven',
                name: 'Log Haven',
                description: 'Romantic mountain lodge serving high-end American cuisine.',
                category: 'restaurant',
                subcategory: 'fine dining',
                address: '6451 E Mill Creek Canyon Rd, Salt Lake City, UT 84109',
                city: 'Salt Lake City',
                state: 'UT',
                latitude: 40.6908,
                longitude: -111.7589,
                rating: 4.8,
                priceLevel: 4,
                imageUrl: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=800&q=80',
                vibes: ['romantic', 'mountain', 'elegant'],
                expiresAt: new Date(Date.now() + 86400000 * 30),
                staleAt: new Date(Date.now() + 86400000 * 7)
            }
        }),
        prisma.cachedEvent.upsert({
            where: { googlePlaceId: 'slc_red_iguan' },
            update: {},
            create: {
                googlePlaceId: 'slc_red_iguan',
                name: 'Red Iguana',
                description: 'Famous Mexican spot known for its moles.',
                category: 'restaurant',
                subcategory: 'mexican',
                address: '736 W North Temple St, Salt Lake City, UT 84116',
                city: 'Salt Lake City',
                state: 'UT',
                latitude: 40.7719,
                longitude: -111.9125,
                rating: 4.7,
                priceLevel: 2,
                imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
                vibes: ['lively', 'authentic', 'casual'],
                expiresAt: new Date(Date.now() + 86400000 * 30),
                staleAt: new Date(Date.now() + 86400000 * 7)
            }
        }),
        prisma.cachedEvent.upsert({
            where: { googlePlaceId: 'slc_snowbird' },
            update: {},
            create: {
                googlePlaceId: 'slc_snowbird',
                name: 'Snowbird Ski Resort',
                description: 'World-class skiing and mountain activities.',
                category: 'activity',
                subcategory: 'skiing',
                address: '9385 S. Snowbird Center Dr., Snowbird, UT 84092',
                city: 'Snowbird',
                state: 'UT',
                latitude: 40.5830,
                longitude: -111.6563,
                rating: 4.8,
                imageUrl: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?auto=format&fit=crop&w=800&q=80',
                vibes: ['active', 'mountain', 'adventure'],
                expiresAt: new Date(Date.now() + 86400000 * 30),
                staleAt: new Date(Date.now() + 86400000 * 7)
            }
        })
    ]);

    // 2. Create Test Profiles (Zipcode 84124)
    console.log('Creating Test Profiles...');
    const sarah = await prisma.profile.upsert({
        where: { clerkId: 'user_sarah' },
        update: {},
        create: {
            clerkId: 'user_sarah',
            email: 'sarah@example.com',
            displayName: 'Sarah Miller',
            avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
            homeLatitude: 40.6865,
            homeLongitude: -111.8344,
            homeCity: 'Salt Lake City',
            homeState: 'UT',
            preferences: { cuisines: ['mexican', 'italian'], vibes: ['chill', 'lively'] }
        }
    });

    const mike = await prisma.profile.upsert({
        where: { clerkId: 'user_mike' },
        update: {},
        create: {
            clerkId: 'user_mike',
            email: 'mike@example.com',
            displayName: 'Mike Chen',
            avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
            homeLatitude: 40.6865,
            homeLongitude: -111.8344,
            homeCity: 'Salt Lake City',
            homeState: 'UT',
            preferences: { cuisines: ['thai', 'american'], vibes: ['adventure', 'relaxed'] }
        }
    });

    const alex = await prisma.profile.upsert({
        where: { clerkId: 'user_alex' },
        update: {},
        create: {
            clerkId: 'user_alex',
            email: 'alex@example.com',
            displayName: 'Alex Reed',
            avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
            homeLatitude: 40.6865,
            homeLongitude: -111.8344,
            homeCity: 'Salt Lake City',
            homeState: 'UT',
            preferences: { cuisines: ['mexican', 'sushi'], vibes: ['chill', 'authentic'] }
        }
    });

    // 3. Create Hangouts
    console.log('Seeding Hangouts...');

    // Scenario 1: Upcoming Public Hangout (Sarah is Creator)
    const upcomingHangout = await prisma.hangout.create({
        data: {
            title: 'Taco Tuesday @ Red Iguana',
            description: 'Joining for some authentic moles and tacos!',
            type: HangoutType.GROUP_DINNER,
            status: HangoutStatus.CONFIRMED,
            creatorId: sarah.id,
            slug: 'taco-tuesday-' + Math.random().toString(36).substring(7),
            visibility: 'PUBLIC',
            scheduledFor: new Date(Date.now() + 86400000 * 2), // 2 days from now
            finalActivityId: events[1].id,
            midpointLat: 40.7719,
            midpointLng: -111.9125,
            participants: {
                create: [
                    { profileId: sarah.id, role: ParticipantRole.CREATOR, rsvpStatus: RsvpStatus.GOING },
                    { profileId: mike.id, role: ParticipantRole.MEMBER, rsvpStatus: RsvpStatus.GOING }
                ]
            }
        }
    });

    // Scenario 2: Past Hangout (Needs Feedback)
    const pastHangout = await prisma.hangout.create({
        data: {
            title: 'Mountain Lunch at Log Haven',
            description: 'Celebrating the weekend.',
            type: HangoutType.ACTIVITY,
            status: HangoutStatus.COMPLETED,
            creatorId: mike.id,
            slug: 'mountain-lunch-' + Math.random().toString(36).substring(7),
            visibility: 'PRIVATE',
            scheduledFor: new Date(Date.now() - 86400000 * 3), // 3 days ago
            finalActivityId: events[0].id,
            midpointLat: 40.6908,
            midpointLng: -111.7589,
            participants: {
                create: [
                    { profileId: mike.id, role: ParticipantRole.CREATOR, rsvpStatus: RsvpStatus.GOING },
                    { profileId: sarah.id, role: ParticipantRole.MEMBER, rsvpStatus: RsvpStatus.GOING },
                    { profileId: alex.id, role: ParticipantRole.MEMBER, rsvpStatus: RsvpStatus.GOING }
                ]
            }
        }
    });

    // Scenario 3: Planning/Voting Phase Hangout
    const votingHangout = await prisma.hangout.create({
        data: {
            title: 'Ski Day Planning',
            description: 'Where should we go?',
            type: HangoutType.ACTIVITY,
            status: HangoutStatus.VOTING,
            creatorId: alex.id,
            slug: 'ski-day-' + Math.random().toString(36).substring(7),
            visibility: 'PRIVATE',
            midpointLat: 40.5830,
            midpointLng: -111.6563,
            participants: {
                create: [
                    { profileId: alex.id, role: ParticipantRole.CREATOR, rsvpStatus: RsvpStatus.GOING },
                    { profileId: mike.id, role: ParticipantRole.MEMBER, rsvpStatus: RsvpStatus.PENDING }
                ]
            },
            activityOptions: {
                create: [
                    { cachedEventId: events[2].id, displayOrder: 0, groupTrustScore: 0.9 }
                ]
            },
            timeOptions: {
                create: [
                    { startTime: new Date(Date.now() + 86400000 * 5) },
                    { startTime: new Date(Date.now() + 86400000 * 6) }
                ]
            }
        }
    });

    // 4. Friendships
    console.log('Establishing Friendships...');
    await prisma.friendship.upsert({
        where: { profileAId_profileBId: { profileAId: sarah.id, profileBId: mike.id } },
        update: {},
        create: { profileAId: sarah.id, profileBId: mike.id, status: 'ACCEPTED', sharedHangoutCount: 2 }
    });
    await prisma.friendship.upsert({
        where: { profileAId_profileBId: { profileAId: mike.id, profileBId: alex.id } },
        update: {},
        create: { profileAId: mike.id, profileBId: alex.id, status: 'ACCEPTED', sharedHangoutCount: 1 }
    });
    await prisma.friendship.upsert({
        where: { profileAId_profileBId: { profileAId: sarah.id, profileBId: alex.id } },
        update: {},
        create: { profileAId: sarah.id, profileBId: alex.id, status: 'PENDING', sharedHangoutCount: 0 }
    });

    console.log('✅ QA Seeding Complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
