'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface UserProfile {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
  image: string | null;
  username: string | null;
  bio: string | null;
  role: string;
  createdAt: string;
}

interface Enrollment {
  id: string;
  courseId: string;
  enrolledAt: string;
  progressPercent: number;
  course: {
    id: string;
    title: string;
    description: string | null;
    thumbnail: string | null;
    instructor: {
      name: string | null;
    };
  };
}

interface Certificate {
  id: string;
  courseId: string;
  issuedAt: string;
  course: {
    title: string;
    thumbnail: string | null;
  };
}

export default function StudentProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated' && session?.user) {
      // Mock data for demonstration
      const mockUser: UserProfile = {
        id: '1',
        name: session.user.name || 'Student',
        firstName: session.user.name?.split(' ')[0] || null,
        lastName: session.user.name?.split(' ')[1] || null,
        email: session.user.email || 'student@example.com',
        image: session.user.image || null,
        username: session.user.name?.toLowerCase().replace(/\s/g, '') || 'student',
        bio: 'Passionate learner exploring new skills.',
        role: 'STUDENT',
        createdAt: '2024-01-15',
      };
      setUser(mockUser);
      setUsername(mockUser.username || '');

      const mockEnrollments: Enrollment[] = [
        {
          id: 'e1',
          courseId: 'c1',
          enrolledAt: '2024-02-10',
          progressPercent: 65,
          course: {
            id: 'c1',
            title: 'Introduction to React',
            description: 'Learn React from scratch',
            thumbnail: null,
            instructor: { name: 'John Doe' },
          },
        },
        {
          id: 'e2',
          courseId: 'c2',
          enrolledAt: '2024-03-05',
          progressPercent: 30,
          course: {
            id: 'c2',
            title: 'Advanced JavaScript',
            description: 'Deep dive into modern JS',
            thumbnail: null,
            instructor: { name: 'Jane Smith' },
          },
        },
      ];
      setEnrollments(mockEnrollments);

      const mockCertificates: Certificate[] = [
        {
          id: 'cert1',
          courseId: 'c3',
          issuedAt: '2024-01-20',
          course: {
            title: 'Web Development Fundamentals',
            thumbnail: null,
          },
        },
      ];
      setCertificates(mockCertificates);

      setLoading(false);
    }
  }, [status, session, router]);

  const handleSaveUsername = () => {
    if (user) {
      setUser({ ...user, username });
      setEditing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Profile Info */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex flex-col items-center">
                <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white dark:border-gray-700 shadow-lg">
                  {user.image ? (
                    <Image
                      src={user.image}
                      alt={user.name || 'User'}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white text-4xl font-bold">
                      {user.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
                <h1 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">
                  {user.name}
                </h1>
                <p className="text-gray-500 dark:text-gray-400">{user.email}</p>
                <div className="mt-4 flex items-center space-x-2">
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm font-medium rounded-full">
                    {user.role}
                  </span>
                  <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 text-sm font-medium rounded-full">
                    Member since {new Date(user.createdAt).getFullYear()}
                  </span>
                </div>

                {/* Username Section */}
                <div className="mt-8 w-full">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Username</h3>
                    {editing ? (
                      <button
                        onClick={handleSaveUsername}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded"
                      >
                        Save
                      </button>
                    ) : (
                      <button
                        onClick={() => setEditing(true)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  {editing ? (
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="mt-2 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  ) : (
                    <p className="mt-2 text-gray-700 dark:text-gray-300">@{user.username}</p>
                  )}
                </div>

                {/* Bio */}
                <div className="mt-6 w-full">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Bio</h3>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">
                    {user.bio || 'No bio provided.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Courses & Certificates */}
          <div className="lg:col-span-2 space-y-8">
            {/* Enrolled Courses */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">My Courses</h3>
                <Link
                  href="/student/courses"
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  View all
                </Link>
              </div>

              {enrollments.length > 0 ? (
                <div className="space-y-4">
                  {enrollments.map((enrollment) => (
                    <div
                      key={enrollment.id}
                      className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      {enrollment.course.thumbnail ? (
                        <div className="w-16 h-16 relative rounded overflow-hidden flex-shrink-0">
                          <Image
                            src={enrollment.course.thumbnail}
                            alt={enrollment.course.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-600 dark:text-blue-300 font-bold">
                            {enrollment.course.title.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div className="ml-4 flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {enrollment.course.title}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Instructor: {enrollment.course.instructor.name || 'Unknown'}
                        </p>
                        <div className="mt-2">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600 dark:text-gray-300">Progress</span>
                            <span className="font-medium">{enrollment.progressPercent}%</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${enrollment.progressPercent}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">No courses in progress</p>
                </div>
              )}
            </div>

            {/* Certificates */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">My Certificates</h3>
                <Link
                  href="/student"
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  View all
                </Link>
              </div>

              {certificates.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {certificates.map((cert) => (
                    <div
                      key={cert.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center"
                    >
                      <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded flex items-center justify-center flex-shrink-0">
                        <span className="text-green-600 dark:text-green-300 font-bold text-xl">
                          ✓
                        </span>
                      </div>
                      <div className="ml-4">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {cert.course.title}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Issued {new Date(cert.issuedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">No certificates yet</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                    Complete a course to earn your first certificate!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
