'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  order: number;
}

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  questions: Question[];
}

export default function EditQuizPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const quizId = params.quizId as string;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [questionOptions, setQuestionOptions] = useState(['', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);

  // Redirect if not authenticated or not instructor/admin
  useEffect(() => {
    if (status !== 'loading') {
      const isAuthenticated = status === 'authenticated';
      const hasRole = session?.user?.role === 'INSTRUCTOR' || session?.user?.role === 'ADMIN';

      if (!isAuthenticated) {
        router.push('/login');
      } else if (!hasRole) {
        router.push('/');
      }
    }
  }, [status, session, router]);

  // Fetch quiz data
  useEffect(() => {
    if (!quizId) return;

    const fetchQuiz = async () => {
      try {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        const res = await fetch(`${baseUrl}/api/quizzes/${quizId}`, {
          cache: 'no-store',
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch quiz');
        }

        setQuiz(data.data);
        setTitle(data.data.title);
        setDescription(data.data.description || '');
        setQuestions(data.data.questions);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuiz();
  }, [quizId]);

  const handleSaveQuiz = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const res = await fetch(`${baseUrl}/api/quizzes/${quizId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save quiz');
      }

      setSuccess('Quiz saved successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!questionText.trim()) {
      setError('Question text is required');
      return;
    }

    const validOptions = questionOptions.filter((opt) => opt.trim() !== '');
    if (validOptions.length < 2) {
      setError('At least 2 options are required');
      return;
    }

    // Validate that the correct answer option is not empty and compute correct index in filtered array
    if (questionOptions[correctAnswer].trim() === '') {
      setError('The correct answer must have a non-empty option');
      return;
    }

    // Compute the index in the filtered array
    let filteredCorrectAnswer = 0;
    for (let i = 0; i < correctAnswer; i++) {
      if (questionOptions[i].trim() !== '') {
        filteredCorrectAnswer++;
      }
    }

    setIsAddingQuestion(true);

    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const res = await fetch(`${baseUrl}/api/quizzes/${quizId}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: questionText.trim(),
          options: validOptions,
          correctAnswer: filteredCorrectAnswer,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to add question');
      }

      // Add new question to state
      setQuestions((prev) => [...prev, data.data]);
      setQuestionText('');
      setQuestionOptions(['', '', '']);
      setCorrectAnswer(0);
      setShowQuestionForm(false);
      setSuccess('Question added successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAddingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const res = await fetch(`${baseUrl}/api/quizzes/${quizId}/questions/${questionId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete question');
      }

      // Remove question from state (reordering happens on backend)
      setQuestions((prev) => prev.filter((q) => q.id !== questionId));
      setSuccess('Question deleted successfully!');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteQuiz = async () => {
    if (!confirm('Move this quiz to Trash? You can restore it later.')) return;

    setIsDeleting(true);
    setError(null);

    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const res = await fetch(`${baseUrl}/api/quizzes/${quizId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete quiz');
      }

      router.push(`/instructor/courses/${id}/edit`);
    } catch (err: any) {
      setError(err.message);
      setIsDeleting(false);
    }
  };

  const addOptionField = () => {
    setQuestionOptions((prev) => [...prev, '']);
  };

  const updateOption = (index: number, value: string) => {
    setQuestionOptions((prev) => {
      const newOptions = [...prev];
      newOptions[index] = value;
      return newOptions;
    });
  };

  const removeOptionField = (index: number) => {
    if (questionOptions.length <= 2) {
      setError('At least 2 options are required');
      return;
    }
    setQuestionOptions((prev) => prev.filter((_, i) => i !== index));
    // Adjust correctAnswer if needed
    if (correctAnswer >= questionOptions.length - 1) {
      setCorrectAnswer(questionOptions.length - 2);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!session || (session.user?.role !== 'INSTRUCTOR' && session.user?.role !== 'ADMIN')) {
    return null;
  }

  if (error && !quiz) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded mb-4">
          {error}
        </div>
        <Link href={`/instructor/courses/${id}/edit`} className="text-blue-600 dark:text-blue-400 hover:underline">
          ← Back to Course
        </Link>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-gray-600 dark:text-gray-400">Quiz not found.</p>
        <Link href={`/instructor/courses/${id}/edit`} className="text-blue-600 dark:text-blue-400 hover:underline">
          ← Back to Course
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link href={`/instructor/courses/${id}/edit`} className="text-blue-600 dark:text-blue-400 hover:underline">
          Course
        </Link>
        <span className="mx-2 text-gray-500">→</span>
        <span className="text-gray-900 dark:text-white font-medium">Quiz: {quiz.title}</span>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Edit Quiz
        </h1>
        <button
          onClick={handleDeleteQuiz}
          disabled={isDeleting}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
        >
          {isDeleting ? 'Deleting...' : 'Delete Quiz'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Main Quiz Info */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Quiz Details
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded text-sm">
                {success}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>

              <button
                onClick={handleSaveQuiz}
                disabled={isSaving}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        {/* Right - Questions */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Questions ({questions.length})
              </h2>
              <button
                onClick={() => setShowQuestionForm(!showQuestionForm)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
              >
                {showQuestionForm ? 'Cancel' : '+ Add Question'}
              </button>
            </div>

            {error && showQuestionForm && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded text-sm">
                {error}
              </div>
            )}

            {showQuestionForm && (
              <form onSubmit={handleAddQuestion} className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Question Text *
                    </label>
                    <textarea
                      value={questionText}
                      onChange={(e) => setQuestionText(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      placeholder="Enter your question..."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Options *
                    </label>
                    <div className="space-y-2">
                      {questionOptions.map((option, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="correctAnswer"
                            checked={correctAnswer === index}
                            onChange={() => setCorrectAnswer(index)}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => updateOption(index, e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            placeholder={`Option ${String.fromCharCode(65 + index)}`}
                            required
                          />
                          {questionOptions.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeOptionField(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={addOptionField}
                      className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      + Add another option
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isAddingQuestion}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {isAddingQuestion ? 'Adding...' : 'Add Question'}
                  </button>
                </div>
              </form>
            )}

            {questions.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No questions yet. Click "Add Question" to get started.
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((question, index) => (
                  <div
                    key={question.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {index + 1}. {question.text}
                      </h3>
                      <button
                        onClick={() => handleDeleteQuestion(question.id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                    <div className="ml-4 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      {question.options.map((option, optIndex) => (
                        <div
                          key={optIndex}
                          className={`flex items-center gap-2 ${
                            optIndex === question.correctAnswer
                              ? 'text-green-600 dark:text-green-400 font-medium'
                              : ''
                          }`}
                        >
                          <span>{String.fromCharCode(65 + optIndex)}.</span>
                          <span>{option}</span>
                          {optIndex === question.correctAnswer && (
                            <span className="text-green-600 dark:text-green-400">✓ (Correct)</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
