import prisma from '@/lib/prisma';

export async function archiveTrash(params: {
  entityType: string;
  entityId: string;
  courseId?: string | null;
  deletedById: string;
  payload: unknown;
}) {
  const payload = JSON.parse(JSON.stringify(params.payload));
  return prisma.trashItem.create({
    data: {
      entityType: params.entityType,
      entityId: params.entityId,
      courseId: params.courseId ?? null,
      deletedById: params.deletedById,
      payload,
    },
  });
}
