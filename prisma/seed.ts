import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';

const prisma = new PrismaClient();

async function identityId(role: Role): Promise<string> {
  const prefix: Record<Role, string> = {
    STUDENT: 'stud',
    INSTRUCTOR: 'inst',
    ADMIN: 'admin',
  };

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const value = prefix[role] + randomInt(0, 100_000_000).toString().padStart(8, '0');
    const existing = await prisma.user.findUnique({ where: { identityId: value }, select: { id: true } });
    if (!existing) return value;
  }

  throw new Error('Unable to generate seed identity ID');
}

async function ensureUser(email: string, username: string, name: string, password: string, role: Role) {
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        email,
        name,
        username,
        role,
        onboardingCompleted: true,
        isEmailVerified: true,
        identityId: existing.identityId ?? await identityId(role),
      },
    });
  }

  return prisma.user.create({
    data: {
      email,
      name,
      username,
      identityId: await identityId(role),
      password: await bcrypt.hash(password, 12),
      role,
      onboardingCompleted: true,
      isEmailVerified: true,
    },
  });
}

async function main() {
  console.log('Starting development seed...');

  const instructor = await ensureUser(
    'instructor@test.com',
    'instructor',
    'Test Instructor',
    'password123',
    Role.INSTRUCTOR,
  );

  await ensureUser(
    'admin@test.com',
    'admin',
    'Test Admin',
    'admin123',
    Role.ADMIN,
  );

  await ensureUser(
    'student@test.com',
    'student',
    'Test Student',
    'student123',
    Role.STUDENT,
  );

  const course1 = await prisma.course.upsert({
    where: { id: '69d7b6697c44e1862620da7f' },
    update: {
      title: 'Introduction to React',
      isPublished: true,
      adminApproved: true,
    },
    create: {
      id: '69d7b6697c44e1862620da7f',
      title: 'Introduction to React',
      description: 'Learn the fundamentals of React.js including components, hooks, and state management.',
      thumbnail: 'https://example.com/react-thumbnail.jpg',
      instructorId: instructor.id,
      isPublished: true,
      adminApproved: true,
      approvedAt: new Date(),
      isFree: true,
      price: 0,
    },
  });

  const videos1 = [
    {
      title: 'Big Buck Bunny',
      description: 'Three rodents amuse themselves by harassing creatures of the forest.',
      url: 'https://www.youtube.com/watch?v=LXb3EKWsInQ',
      thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Big.Buck.Bunny.-.Opening.Screen.png',
      duration: 600,
      order: 1,
    },
    {
      title: 'Sintel',
      description: 'A lonely young woman helps and befriends a dragon.',
      url: 'https://www.youtube.com/watch?v=S9L9H1R7Sgg',
      thumbnail: 'http://uhdtv.io/wp-content/uploads/2020/10/Sintel-3.jpg',
      duration: 900,
      order: 2,
    },
  ];

  for (const video of videos1) {
    await prisma.video.upsert({
      where: { id: course1.id + '-' + video.order },
      update: video,
      create: { id: course1.id + '-' + video.order, ...video, courseId: course1.id },
    });
  }

  await prisma.course.upsert({
    where: { id: '69d7b6697c44e1862620da7e' },
    update: {
      title: 'Advanced TypeScript',
      isPublished: false,
      adminApproved: false,
    },
    create: {
      id: '69d7b6697c44e1862620da7e',
      title: 'Advanced TypeScript',
      description: 'Deep dive into TypeScript advanced types, generics, and patterns.',
      thumbnail: 'https://example.com/typescript-thumbnail.jpg',
      instructorId: instructor.id,
      isPublished: false,
      adminApproved: false,
      isFree: true,
      price: 0,
    },
  });

  console.log('Seed complete.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
