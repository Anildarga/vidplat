'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { formatDistanceToNow } from 'date-fns';

interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
}

interface DiscussionReply {
  id: string;
  content: string;
  createdAt: string;
  user: User;
  isInstructorReply: boolean;
  voteScore: number;
  userVote: number;
}

interface DiscussionQuestion {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isResolved: boolean;
  pinned: boolean;
  user: User;
  voteScore: number;
  userVote: number;
  replyCount: number;
  replies: DiscussionReply[];
}

interface DiscussionSidebarProps {
  videoId: string;
}

export default function DiscussionSidebar({ videoId }: DiscussionSidebarProps) {
  const { data: session } = useSession();
  const [questions, setQuestions] = useState<DiscussionQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newQuestion, setNewQuestion] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  useEffect(() => {
    if (videoId && session?.user) {
      fetchQuestions();
    }
  }, [videoId, session]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/discussions/questions?videoId=${videoId}`);
      const data = await res.json();
      if (data.success) {
        setQuestions(data.data);
      } else {
        setError(data.error || 'Failed to load questions');
      }
    } catch (err) {
      setError('Network error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePostQuestion = async () => {
    if (!newQuestion.trim() || !session?.user) return;
    try {
      const res = await fetch('/api/discussions/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, content: newQuestion }),
      });
      const data = await res.json();
      if (data.success) {
        setNewQuestion('');
        fetchQuestions();
      } else {
        alert(data.error || 'Failed to post question');
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
    }
  };

  const handlePostReply = async (questionId: string) => {
    if (!replyContent.trim() || !session?.user) return;
    try {
      const res = await fetch(`/api/discussions/questions/${questionId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyContent }),
      });
      const data = await res.json();
      if (data.success) {
        setReplyContent('');
        setReplyingTo(null);
        fetchQuestions();
      } else {
        alert(data.error || 'Failed to post reply');
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
    }
  };

  const handleVote = async (targetType: 'question' | 'reply', targetId: string, currentVote: number, newVote: number) => {
    if (!session?.user) return;
    // If clicking same vote, remove vote (set to 0)
    const vote = currentVote === newVote ? 0 : newVote;
    try {
      const body: any = { vote };
      if (targetType === 'question') {
        body.questionId = targetId;
      } else {
        body.replyId = targetId;
      }
      const res = await fetch('/api/discussions/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        fetchQuestions();
      } else {
        alert(data.error || 'Failed to vote');
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
    }
  };

  const toggleReply = (questionId: string) => {
    setReplyingTo(replyingTo === questionId ? null : questionId);
    setReplyContent('');
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500">
        Loading discussions...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Video Discussions
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Ask questions and discuss with other students
        </p>
      </div>

      {/* New question input */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <textarea
          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
          placeholder="Ask a question about this video..."
          rows={3}
          value={newQuestion}
          onChange={(e) => setNewQuestion(e.target.value)}
        />
        <div className="mt-2 flex justify-end">
          <button
            onClick={handlePostQuestion}
            disabled={!newQuestion.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Post Question
          </button>
        </div>
      </div>

      {/* Questions list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {questions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No questions yet. Be the first to ask!
          </div>
        ) : (
          questions.map((question) => (
            <div
              key={question.id}
              className={`p-4 rounded-lg border ${question.pinned ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20' : 'border-gray-200 dark:border-gray-700'} ${question.isResolved ? 'bg-green-50 dark:bg-green-900/20' : 'bg-white dark:bg-gray-800'}`}
            >
              <div className="flex items-start gap-3">
                {/* Vote buttons */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => handleVote('question', question.id, question.userVote, 1)}
                    className={`p-1 rounded ${question.userVote === 1 ? 'text-blue-600' : 'text-gray-400 hover:text-blue-600'}`}
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <span className="font-bold text-gray-900 dark:text-white my-1">{question.voteScore}</span>
                  <button
                    onClick={() => handleVote('question', question.id, question.userVote, -1)}
                    className={`p-1 rounded ${question.userVote === -1 ? 'text-red-600' : 'text-gray-400 hover:text-red-600'}`}
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <img
                      src={question.user.image || `https://ui-avatars.com/api/?name=${question.user.name || 'User'}`}
                      alt={question.user.name || 'User'}
                      className="w-8 h-8 rounded-full"
                    />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {question.user.name || question.user.email}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(new Date(question.createdAt), { addSuffix: true })}
                        {question.isResolved && ' · Resolved'}
                        {question.pinned && ' · Pinned'}
                      </p>
                    </div>
                  </div>

                  <p className="text-gray-800 dark:text-gray-200 mb-3">{question.content}</p>

                  <div className="flex items-center gap-4 text-sm">
                    <button
                      onClick={() => toggleReply(question.id)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      {replyingTo === question.id ? 'Cancel' : 'Reply'}
                    </button>
                    <span className="text-gray-500 dark:text-gray-400">
                      {question.replyCount} {question.replyCount === 1 ? 'reply' : 'replies'}
                    </span>
                  </div>

                  {/* Reply input */}
                  {replyingTo === question.id && (
                    <div className="mt-4">
                      <textarea
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                        placeholder="Write a reply..."
                        rows={2}
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                      />
                      <div className="mt-2 flex justify-end gap-2">
                        <button
                          onClick={() => setReplyingTo(null)}
                          className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handlePostReply(question.id)}
                          disabled={!replyContent.trim()}
                          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                        >
                          Post Reply
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Replies list */}
                  {question.replies.length > 0 && (
                    <div className="mt-4 space-y-4 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                      {question.replies.map((reply) => (
                        <div key={reply.id} className="pt-4">
                          <div className="flex items-start gap-3">
                            <img
                              src={reply.user.image || `https://ui-avatars.com/api/?name=${reply.user.name || 'User'}`}
                              alt={reply.user.name || 'User'}
                              className="w-6 h-6 rounded-full"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm text-gray-900 dark:text-white">
                                  {reply.user.name || reply.user.email}
                                </p>
                                {reply.isInstructorReply && (
                                  <span className="px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full">
                                    Instructor
                                  </span>
                                )}
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                                </span>
                              </div>
                              <p className="text-gray-700 dark:text-gray-300 text-sm mt-1">{reply.content}</p>
                              <div className="mt-2 flex items-center gap-2">
                                <button
                                  onClick={() => handleVote('reply', reply.id, reply.userVote, 1)}
                                  className={`text-xs p-1 ${reply.userVote === 1 ? 'text-blue-600' : 'text-gray-400 hover:text-blue-600'}`}
                                >
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                                  </svg>
                                </button>
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{reply.voteScore}</span>
                                <button
                                  onClick={() => handleVote('reply', reply.id, reply.userVote, -1)}
                                  className={`text-xs p-1 ${reply.userVote === -1 ? 'text-red-600' : 'text-gray-400 hover:text-red-600'}`}
                                >
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}