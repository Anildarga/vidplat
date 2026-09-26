import { randomInt } from 'crypto';
import prisma from '@/lib/prisma';

export type IdentityRole = 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';

const PREFIX: Record<IdentityRole, string> = {
  STUDENT: 'stud',
  INSTRUCTOR: 'inst',
  ADMIN: 'admin',
};

export function identityPrefix(role: IdentityRole): string {
  return PREFIX[role];
}

export async function generateUniqueIdentityId(role: IdentityRole): Promise<string> {
  const prefix = identityPrefix(role);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const number = randomInt(0, 100_000_000).toString().padStart(8, '0');
    const identityId = prefix + number;

    const existing = await prisma.user.findUnique({ where: { identityId }, select: { id: true } });
    if (!existing) return identityId;
  }

  throw new Error('Unable to generate a unique identity ID');
}

export function buildDisplayName(firstName?: string | null, lastName?: string | null): string {
  return [firstName, lastName]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim())
    .join(' ');
}

export async function ensureUserIdentityId(userId: string, role: IdentityRole): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { identityId: true } });
  if (user?.identityId) return user.identityId;

  const identityId = await generateUniqueIdentityId(role);
  try {
    const updated = await prisma.user.update({ where: { id: userId }, data: { identityId }, select: { identityId: true } });
    return updated.identityId!;
  } catch {
    const retry = await prisma.user.findUnique({ where: { id: userId }, select: { identityId: true } });
    if (retry?.identityId) return retry.identityId;
    throw new Error('Unable to assign user identity ID');
  }
}
