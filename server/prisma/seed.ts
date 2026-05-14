import { PrismaClient, MoodTag } from '@prisma/client';

const prisma = new PrismaClient();

const AVATAR_COLORS = [
  '#7C5CFF', '#FF5C8A', '#4FC3F7', '#FF8C42', '#FFD93D',
  '#E91E8C', '#78909C', '#69F0AE', '#FF6B6B', '#4ECDC4',
  '#45B7D1', '#96CEB4',
];

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { phoneNumber: '+10000000000' },
    update: {},
    create: {
      phoneNumber: '+10000000000',
      username: 'echo_admin',
      displayName: 'Echo Admin',
      avatarColor: AVATAR_COLORS[0],
      isVerified: true,
      isAdmin: true,
    },
  });
  console.log('Created admin user:', admin.username);

  // Create test users
  const testUsers = [
    {
      phoneNumber: '+10000000001',
      username: 'alice_voice',
      displayName: 'Alice',
      avatarColor: AVATAR_COLORS[1],
    },
    {
      phoneNumber: '+10000000002',
      username: 'bob_speaks',
      displayName: 'Bob',
      avatarColor: AVATAR_COLORS[2],
    },
    {
      phoneNumber: '+10000000003',
      username: 'carol_echo',
      displayName: 'Carol',
      avatarColor: AVATAR_COLORS[3],
    },
    {
      phoneNumber: '+10000000004',
      username: 'dave_audio',
      displayName: 'Dave',
      avatarColor: AVATAR_COLORS[4],
    },
  ];

  for (const userData of testUsers) {
    const user = await prisma.user.upsert({
      where: { phoneNumber: userData.phoneNumber },
      update: {},
      create: {
        ...userData,
        isVerified: true,
        streakCount: Math.floor(Math.random() * 10),
      },
    });
    console.log('Created test user:', user.username);
  }

  // Create a sample active challenge
  const now = new Date();
  const challengeStart = new Date(now);
  challengeStart.setHours(0, 0, 0, 0); // Start of today

  const challengeEnd = new Date(challengeStart);
  challengeEnd.setDate(challengeEnd.getDate() + 7); // 1 week

  const challenge = await prisma.challenge.upsert({
    where: { id: 'seed-challenge-001' },
    update: {
      title: 'Tell us your morning routine in 30 seconds',
      startsAt: challengeStart,
      endsAt: challengeEnd,
    },
    create: {
      id: 'seed-challenge-001',
      promptAudioUrl: 'audio/challenges/morning-routine-prompt.m4a',
      title: 'Tell us your morning routine in 30 seconds',
      startsAt: challengeStart,
      endsAt: challengeEnd,
    },
  });
  console.log('Created challenge:', challenge.title);

  // Create a past challenge for history
  const pastStart = new Date(now);
  pastStart.setDate(pastStart.getDate() - 14);
  const pastEnd = new Date(now);
  pastEnd.setDate(pastEnd.getDate() - 7);

  await prisma.challenge.upsert({
    where: { id: 'seed-challenge-000' },
    update: {},
    create: {
      id: 'seed-challenge-000',
      promptAudioUrl: 'audio/challenges/weekend-plans-prompt.m4a',
      title: 'What are your weekend plans?',
      startsAt: pastStart,
      endsAt: pastEnd,
      entryCount: 42,
    },
  });
  console.log('Created past challenge');

  // Create sample follows between test users
  const [alice, bob, carol] = await prisma.user.findMany({
    where: {
      username: { in: ['alice_voice', 'bob_speaks', 'carol_echo'] },
    },
    select: { id: true, username: true },
  });

  if (alice && bob) {
    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId: alice.id, followingId: bob.id } },
      update: {},
      create: { followerId: alice.id, followingId: bob.id },
    });
    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId: bob.id, followingId: alice.id } },
      update: {},
      create: { followerId: bob.id, followingId: alice.id },
    });
  }

  if (carol && alice) {
    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId: carol.id, followingId: alice.id } },
      update: {},
      create: { followerId: carol.id, followingId: alice.id },
    });
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
