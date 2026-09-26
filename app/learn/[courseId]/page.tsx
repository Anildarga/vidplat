import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { formatDuration } from '@/lib/utils';
import { calculateCourseProgress } from '@/lib/progress-calculator';
import EnrollButton from '@/components/courses/EnrollButton';
import CertificateButton from '@/components/courses/CertificateButton';

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  _count: {
    questions: number;
  };
}

interface PageProps {
  params: Promise<{ courseId: string }>;
}

export default async function LearnPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  const { courseId } = await params;

  // Redirect to login if not authenticated
  if (!session?.user) {
    redirect(`/login?callbackUrl=/learn/${courseId}`);
  }

  // Fetch course with videos
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      instructor: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      videos: {
        orderBy: {
          order: 'asc',
        },
        select: {
          id: true,
          title: true,
          description: true,
          url: true,
          thumbnail: true,
          duration: true,
          order: true,
          unlockType: true,
          unlockDays: true,
          unlockDate: true,
        },
      },
    },
  });

  if (!course) {
    notFound();
  }

  // Fetch enrollment (if any)
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId: session.user.id,
        courseId: courseId,
      },
    },
  });

  // Check enrollment or admin/instructor access
  const isAdmin = session.user.role === 'ADMIN';
  const isOwner = course.instructorId === session.user.id;
  const isInstructor = session.user.role === 'INSTRUCTOR' && isOwner;
  const hasCompletedEnrollment = enrollment?.paymentStatus === 'COMPLETED';
  const canAccess =
    isAdmin ||
    isInstructor ||
    isOwner ||
    hasCompletedEnrollment;

  if (!canAccess) {
    redirect(`/courses/${courseId}?message=Please enroll to access this course`);
  }

  // Compute unlocked status for each video
  const now = new Date();
  const videosWithUnlockStatus = course.videos.map(video => {
    let isUnlocked = false;
    // Instructors/admins can access all videos
    if (isInstructor || isAdmin) {
      isUnlocked = true;
    } else {
      switch (video.unlockType) {
        case 'IMMEDIATE':
          isUnlocked = true;
          break;
        case 'DAYS_AFTER_ENROLLMENT':
          if (enrollment && video.unlockDays !== null) {
            const unlockDate = new Date(enrollment.enrolledAt);
            unlockDate.setDate(unlockDate.getDate() + video.unlockDays);
            isUnlocked = now >= unlockDate;
          } else {
            isUnlocked = false;
          }
          break;
        case 'SPECIFIC_DATE':
          if (video.unlockDate) {
            isUnlocked = now >= new Date(video.unlockDate);
          } else {
            isUnlocked = false;
          }
          break;
        default:
          // Default to immediate if unknown
          isUnlocked = true;
      }
    }
    return {
      ...video,
      isUnlocked,
    };
  });

  // Fetch progress data
  const progress = await calculateCourseProgress(session.user.id, courseId);

  // Fetch quizzes for this course (including passingScore and type)
  const quizzes = await prisma.quiz.findMany({
    where: {
      courseId,
    },
    select: {
      id: true,
      title: true,
      description: true,
      passingScore: true,
      type: true,
      _count: {
        select: {
          questions: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  // Fetch quiz attempts if user has taken any
  const quizAttempts: Record<string, any> = {};
  if (quizzes.length > 0) {
    const attempts = await prisma.quizAttempt.findMany({
      where: {
        userId: session.user.id,
        quizId: {
          in: quizzes.map((q) => q.id),
        },
      },
    });
    attempts.forEach((attempt) => {
      quizAttempts[attempt.quizId] = attempt;
    });
  }

  // Determine quiz visibility and access based on video completion and quiz type
  const allVideosComplete = progress.percentComplete === 100;
  // Treat missing quiz.type as 'MAIN' for backwards compatibility
  const mainQuiz = quizzes.find((q) => !q.type || q.type === 'MAIN');
  const supplementalQuiz = quizzes.find((q) => q.type === 'SUPPLEMENTAL');

  // For students: enforce that quizzes are only accessible after all videos are complete
  const canAccessQuizzes = isInstructor || isAdmin || allVideosComplete;

  // Main quiz attempt status
  let mainAttempt: any = null;
  let mainPassed = false;
  let mainFailed = false;
  if (mainQuiz && quizAttempts[mainQuiz.id]) {
    mainAttempt = quizAttempts[mainQuiz.id];
    const totalScore = mainQuiz._count.questions;
    const percentage = Math.round((mainAttempt.score / totalScore) * 100);
    const passingScore = (mainQuiz.passingScore as number) ?? 60;
    mainPassed = percentage >= passingScore;
    mainFailed = !mainPassed;
  }

  // Supplemental quiz attempt status
  let supplementalAttempt: any = null;
  let supplementalPassed = false;
  if (supplementalQuiz && quizAttempts[supplementalQuiz.id]) {
    supplementalAttempt = quizAttempts[supplementalQuiz.id];
    const totalScore = supplementalQuiz._count.questions;
    const percentage = Math.round((supplementalAttempt.score / totalScore) * 100);
    const passingScore = (supplementalQuiz.passingScore as number) ?? 60;
    supplementalPassed = percentage >= passingScore;
  }

  // Build list of visible quiz cards
  const visibleQuizzes: Array<{
    quiz: any;
    attempt: any;
    buttonText: string;
    buttonHref: string;
    status?: string;
    disabled?: boolean;
  }> = [];

  // Decision: When to show main quiz?
  // - Always show to instructors/admins
  // - For students: show only when all videos are complete
  if (mainQuiz && canAccessQuizzes) {
    if (mainPassed) {
      visibleQuizzes.push({
        quiz: mainQuiz,
        attempt: mainAttempt,
        buttonText: 'Passed',
        buttonHref: '#',
        status: 'Passed',
        disabled: true,
      });
    } else if (!mainAttempt) {
      // Not attempted yet
      visibleQuizzes.push({
        quiz: mainQuiz,
        attempt: null,
        buttonText: 'Take Quiz',
        buttonHref: `/student/courses/${courseId}/quizzes/${mainQuiz.id}/take`,
      });
    } else if (mainFailed) {
      // Failed - show message and encourage taking supplemental (if available)
      if (supplementalQuiz) {
        visibleQuizzes.push({
          quiz: mainQuiz,
          attempt: mainAttempt,
          buttonText: 'Failed - Take Supplemental',
          buttonHref: `/student/courses/${courseId}/quizzes/${supplementalQuiz.id}/take`,
          status: 'Failed',
        });
      } else {
        // No supplemental, show attempted but failed, cannot retake main? Or allow retake? According to spec, only one main attempt. But if no supplement, we may allow retake? For now, we'll hide the main after failure if no supplement, because cannot retake. Could show "Retake not allowed" message.
        // We'll show it as disabled with a note.
        visibleQuizzes.push({
          quiz: mainQuiz,
          attempt: mainAttempt,
          buttonText: 'Failed',
          buttonHref: '#',
          status: 'Failed',
          disabled: true,
        });
      }
    }
  }

  // Decision: When to show supplemental quiz?
  // - Must have a supplementalQuiz
  // - For students: either after main failure OR if already attempted supplemental (even if not failed? but if passed we show), and all videos complete.
  // - For instructors: always show if exists.
  if (supplementalQuiz) {
    const studentEligible = (isInstructor || isAdmin) || (allVideosComplete && (mainFailed || supplementalAttempt));
    if (studentEligible) {
      if (supplementalPassed) {
        visibleQuizzes.push({
          quiz: supplementalQuiz,
          attempt: supplementalAttempt,
          buttonText: 'Completed',
          buttonHref: '#',
          status: 'Completed',
          disabled: true,
        });
      } else if (!supplementalAttempt) {
        visibleQuizzes.push({
          quiz: supplementalQuiz,
          attempt: null,
          buttonText: 'Take Supplemental Quiz',
          buttonHref: `/student/courses/${courseId}/quizzes/${supplementalQuiz.id}/take`,
        });
      } else {
        // Attempted but not passed - can retake
        visibleQuizzes.push({
          quiz: supplementalQuiz,
          attempt: supplementalAttempt,
          buttonText: 'Retake Supplemental Quiz',
          buttonHref: `/student/courses/${courseId}/quizzes/${supplementalQuiz.id}/take`,
        });
      }
    }
  }

  // Find first uncompleted AND unlocked video
  const firstUncompletedUnlockedVideo = videosWithUnlockStatus.find(
    (video) => {
      const videoProgress = progress.videosProgress.find(
        (vp) => vp.videoId === video.id
      );
      return !videoProgress?.completed && video.isUnlocked;
    }
  );
  // If no uncompleted unlocked video, find first unlocked video
  const startVideoId = firstUncompletedUnlockedVideo?.id ||
                      videosWithUnlockStatus.find(v => v.isUnlocked)?.id ||
                      course.videos[0]?.id;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/courses"
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          ← Back to Courses
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT SIDEBAR - Video List */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sticky top-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Course Curriculum
            </h2>

            {/* Overall Progress */}
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-1">
                <span>Progress</span>
                <span>{progress.percentComplete}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${progress.percentComplete}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {progress.completedVideos} of {progress.totalVideos} videos completed
              </p>
            </div>

            {/* Video List */}
            <ul className="space-y-2">
              {videosWithUnlockStatus.map((video, index) => {
                const videoProgress = progress.videosProgress.find(
                  (vp) => vp.videoId === video.id
                );
                const isCompleted = videoProgress?.completed ?? false;
                const isStartVideo = startVideoId === video.id;
                const isUnlocked = video.isUnlocked;

                return (
                  <li key={video.id}>
                    {isUnlocked ? (
                      <Link
                        href={`/learn/${courseId}/${video.id}`}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                          isStartVideo
                            ? 'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <span className="text-gray-500 dark:text-gray-400 font-mono w-6 text-center">
                          {index + 1}
                        </span>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {video.title}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDuration(video.duration ?? 0)}
                          </p>
                        </div>

                        {isCompleted && (
                          <svg
                            className="w-5 h-5 text-green-500 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}

                        {isStartVideo && !isCompleted && (
                          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded">
                            Start
                          </span>
                        )}
                      </Link>
                    ) : (
                      <div
                        className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 cursor-not-allowed"
                        title="This video is locked and will be available later"
                      >
                        <span className="text-gray-400 dark:text-gray-500 font-mono w-6 text-center">
                          {index + 1}
                        </span>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                            {video.title}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {formatDuration(video.duration ?? 0)}
                          </p>
                        </div>

                        <svg
                          className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* RIGHT MAIN AREA - Course Overview */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {course.title}
            </h1>

            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {course.description || 'No description provided.'}
            </p>

            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-6">
              <span>Instructor: {course.instructor.name || 'Unknown'}</span>
              <span>•</span>
              <span>
                {videosWithUnlockStatus.filter(v => v.isUnlocked).length} of {course.videos.length} videos unlocked
              </span>
            </div>

            {/* Course Progress */}
            <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Your Progress
              </h3>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 mb-2">
                <div
                  className="bg-green-500 h-3 rounded-full transition-all"
                  style={{ width: `${progress.percentComplete}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {progress.completedVideos} of {progress.totalVideos} videos completed
                ({progress.percentComplete}%)
              </p>
            </div>

            {/* Certificate Section */}
            <CertificateButton
              courseId={courseId}
              courseName={course.title}
              progressPercent={progress.percentComplete}
            />

            {/* Start Learning Button */}
            {startVideoId ? (
              <Link
                href={`/learn/${courseId}/${startVideoId}`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                    clipRule="evenodd"
                  />
                </svg>
                Continue Learning
              </Link>
            ) : (
              <p className="text-gray-600 dark:text-gray-400">
                No videos available in this course.
              </p>
            )}
          </div>

          {/* Quizzes Section */}
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Quizzes
              </h2>
            </div>

            {quizzes.length === 0 ? (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 text-center">
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  No quizzes available for this course yet.
                </p>
                {isInstructor && (
                  <Link
                    href={`/instructor/courses/${courseId}/quizzes/new`}
                    className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                  >
                    Create a Quiz (Instructor)
                  </Link>
                )}
              </div>
            ) : visibleQuizzes.length === 0 ? (
              // Quizzes exist but are not yet accessible
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 text-center">
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  {isInstructor || isAdmin
                    ? 'Quizzes are available. Instructors can access anytime.'
                    : 'Complete all videos to unlock quizzes.'}
                </p>
                {isInstructor && (
                  <Link
                    href={`/instructor/courses/${courseId}/quizzes/new`}
                    className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                  >
                    Create a Quiz (Instructor)
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {visibleQuizzes.map(({ quiz, attempt, buttonText, buttonHref, status, disabled }) => {
                  const totalQuestions = quiz._count.questions;
                  const scoreInfo = attempt ? (
                    <span className="ml-2 text-blue-600 dark:text-blue-400">
                      • Score: {attempt.score}/{attempt.totalScore} ({Math.round((attempt.score / attempt.totalScore) * 100)}%)
                    </span>
                  ) : null;

                  return (
                    <div
                      key={quiz.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex justify-between items-center"
                    >
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {quiz.title}
                          {status && (
                            <span
                              className={`ml-2 text-xs font-medium px-2 py-1 rounded ${
                                status === 'Passed' || status === 'Completed'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              }`}
                            >
                              {status}
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {totalQuestions} question{totalQuestions !== 1 ? 's' : ''}
                          {scoreInfo}
                        </p>
                        {quiz.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {quiz.description}
                          </p>
                        )}
                      </div>
                      {disabled ? (
                        <span className="px-4 py-2 bg-gray-400 text-white rounded text-sm cursor-not-allowed">
                          {buttonText}
                        </span>
                      ) : (
                        <Link
                          href={buttonHref}
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                        >
                          {buttonText}
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
