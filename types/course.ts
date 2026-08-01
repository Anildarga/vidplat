import { Course, User, Video, Enrollment, Quiz } from '@prisma/client';

export type CourseWithDetails = Course & {
  instructor: Pick<User, 'id' | 'name' | 'image'>;
  videos: Video[];
  quizzes: { id: string }[];
  reviews: any[];
  _count: {
    enrollments: number;
    videos: number;
    reviews: number;
  };
  averageRating: number;
};
