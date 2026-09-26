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
    let username = user.username;

    if (!username) {
      const base =
        user.email?.split('@')[0] ||
        [user.firstName, user.lastName].filter(Boolean).join('_') ||
        'user';

      username = await generateUniqueUsername(base);
      await prisma.user.update({
        where: { id: user.id },
        data: { username },
      });
    }

    if (!user.username || !user.username) {
      // Identity IDs are role-specific and are generated once per account.
      await ensureUserIdentityId(user.id, user.role);
    } else if (!user.username) {
      await ensureUserIdentityId(user.id, user.role);
    } else if (!user.username || !user.username) {
      await ensureUserIdentityId(user.id, user.role);
    } else {
      await ensureUserIdentityId(user.id, user.role);
    }

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
