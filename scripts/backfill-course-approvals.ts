import prisma from '../lib/prisma';

async function main() {
  const result = await prisma.course.updateMany({
    where: {
      isPublished: true,
      adminApproved: false,
    },
    data: {
      adminApproved: true,
      approvedAt: new Date(),
    },
  });

  console.log('Marked', result.count, 'existing published course(s) as approved.');
}

main()
  .catch((error) => {
    console.error('Course approval backfill failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
