import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { generateUniqueIdentityId } from '@/lib/user-identity';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const updateData: Record<string, unknown> = {};

  if (body.firstName !== undefined) {
    if (typeof body.firstName !== 'string' || !body.firstName.trim()) {
      return NextResponse.json({ success: false, error: 'Invalid first name' }, { status: 400 });
    }
    updateData.firstName = body.firstName.trim();
  }

  if (body.lastName !== undefined) {
    if (typeof body.lastName !== 'string' || !body.lastName.trim()) {
      return NextResponse.json({ success: false, error: 'Invalid last name' }, { status: 400 });
    }
    updateData.lastName = body.lastName.trim();
  }

  if (body.name !== undefined) {
    if (body.name !== null && (typeof body.name !== 'string' || !body.name.trim())) {
      return NextResponse.json({ success: false, error: 'Invalid name' }, { status: 400 });
    }
    updateData.name = body.name === null ? null : body.name.trim();
  }

  if (body.role !== undefined) {
    if (!['STUDENT', 'INSTRUCTOR', 'ADMIN'].includes(body.role)) {
      return NextResponse.json({ success: false, error: 'Invalid role' }, { status: 400 });
    }
    if (id === session.user.id && body.role !== session.user.role) {
      return NextResponse.json({ success: false, error: 'Cannot change your own admin role' }, { status: 400 });
    }
    updateData.role = body.role;
  }

  if (body.isActive !== undefined) {
    if (typeof body.isActive !== 'boolean') {
      return NextResponse.json({ success: false, error: 'isActive must be boolean' }, { status: 400 });
    }
    if (id === session.user.id && body.isActive === false) {
      return NextResponse.json({ success: false, error: 'Cannot deactivate your own admin account' }, { status: 400 });
    }
    updateData.isActive = body.isActive;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ success: false, error: 'No supported fields to update' }, { status: 400 });
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { role: true },
    });

    if (!existingUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    if (body.role && body.role !== existingUser.role) {
      updateData.identityId = await generateUniqueIdentityId(body.role);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        identityId: true,
        firstName: true,
        lastName: true,
        name: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error('[users/[id] PATCH]', error instanceof Error ? error.message : error);
    return NextResponse.json({ success: false, error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  if (id === session.user.id) {
    return NextResponse.json(
      { success: false, error: 'Cannot delete your own account' },
      { status: 400 }
    );
  }

  try {
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'User deleted' });
  } catch (error) {
    console.error('[users/[id] DELETE]', error instanceof Error ? error.message : error);
    return NextResponse.json({ success: false, error: 'Failed to delete user' }, { status: 500 });
  }
}
