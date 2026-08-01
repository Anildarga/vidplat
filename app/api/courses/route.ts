import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { CourseWithDetails } from '@/types/course';
import { Prisma } from '@prisma/client';

// GET /api/courses - Public: list all courses (with optional search)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim();

    const where: Prisma.CourseWhereInput = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const courses = await prisma.course.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        thumbnail: true,
        instructor: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            videos: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ success: true, data: courses });
  } catch (error) {
    console.error('[courses GET]', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/courses - Create course (INSTRUCTOR or ADMIN only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!['INSTRUCTOR', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Requires instructor or admin role' },
        { status: 403 }
      );
    }

    const { title, description, thumbnail, price, currency, isFree } = await req.json();

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }

    // Validate price
    const priceValue = price !== undefined ? parseFloat(price) : 0;
    if (priceValue < 0) {
      return NextResponse.json(
        { success: false, error: 'Price cannot be negative' },
        { status: 400 }
      );
    }

    const course = await prisma.course.create({
      data: {
        title: title.trim(),
        description: description?.trim(),
        thumbnail: thumbnail?.trim(),
        instructorId: session.user.id,
        isPublished: false,
        price: priceValue,
        currency: currency?.trim() || 'USD',
        isFree: isFree !== undefined ? Boolean(isFree) : priceValue === 0,
      },
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        videos: true,
        quizzes: {
          select: {
            id: true,
          },
        },
        _count: {
          select: {
            enrollments: true,
            videos: true,
          },
        },
      },
    });

    const typedCourse: CourseWithDetails = course as CourseWithDetails;

    return NextResponse.json(
      { success: true, data: typedCourse },
      { status: 201 }
    );
  } catch (error) {
    console.error('[courses POST]', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
