import prisma from '../lib/prisma';
import { ensureUserIdentityId, generateUniqueUsername } from '../lib/user-identity';

async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { identityId: null },
        { username: null },
      ],
    },
    select: {
      id: true,
      role: true,
      username: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  });

  let updated = 0;

  for (const user of users) {
    if (!user.username) {
      const base =
        user.email?.split('@')[0] ||
        [user.firstName, user.lastName].filter(Boolean).join('_') ||
        'user';

      const username = await generateUniqueUsername(base);
      await prisma.user.update({
        where: { id: user.id },
        data: { username },
      });
    }

    await ensureUserIdentityId(
      user.id,
      user.role as 'STUDENT' | 'INSTRUCTOR' | 'ADMIN',
    );
    updated += 1;
  }

  console.log('Backfilled', updated, 'user account(s).');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
