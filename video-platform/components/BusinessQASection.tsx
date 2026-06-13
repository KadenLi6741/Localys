'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getBusinessQuestions,
  createQuestion,
  deleteQuestion,
  createAnswer,
  updateAnswer,
  deleteAnswer,
} from '@/lib/supabase/businessQA';
import type { BusinessQuestion } from '@/models/BusinessQA';

interface BusinessQASectionProps {
  /** The business owner's profile ID */
  businessId: string;
  /** Whether the current user is the business owner */
  isOwner: boolean;
}

export function BusinessQASection({ businessId, isOwner }: BusinessQASectionProps) {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<BusinessQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [questionText, setQuestionText] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadQuestions = useCallback(async () => {
    const { data, error: loadError } = await getBusinessQuestions(businessId);
    if (loadError) {
      setError(loadError.message);
    } else {
      setQuestions(data);
    }
    setLoading(false);
  }, [businessId]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const handleAskQuestion = async () => {
    if (!user || !questionText.trim()) return;
    setPosting(true);
    setError(null);

    const { data, error: postError } = await createQuestion(user.id, {
      business_id: businessId,
      question_text: questionText.trim(),
    });

    if (postError) {
      setError(postError.message);
    } else if (data) {
      setQuestionText('');
      await loadQuestions();
    }
    setPosting(false);
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!user) return;
    const { error: delError } = await deleteQuestion(questionId, user.id);
    if (delError) {
      setError(delError.message);
    } else {
      setQuestions(prev => prev.filter(q => q.id !== questionId));
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="bg-[var(--color-charcoal-light)] rounded-lg p-4 animate-pulse">
            <div className="h-4 w-3/4 bg-[var(--color-charcoal-lighter-plus)] rounded mb-2" />
            <div className="h-3 w-1/2 bg-[var(--color-charcoal-lighter-plus)] rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Ask a Question form (not shown to business owner viewing their own page) */}
      {user && !isOwner && (
        <div className="bg-[var(--color-charcoal-light)] border border-[var(--color-charcoal-lighter-plus)] rounded-lg p-4">
          <textarea
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder="Ask a question about this business..."
            rows={2}
            maxLength={1000}
            className="w-full bg-transparent border border-[var(--color-charcoal-lighter-plus)] rounded-lg px-3 py-2 text-sm text-[var(--color-cream)] placeholder-[#9E9A90] focus:outline-none focus:border-[#1B5EA8]/50 resize-none"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-[var(--color-cream)]/40">
              {questionText.length}/1000
            </span>
            <button
              onClick={handleAskQuestion}
              disabled={posting || questionText.trim().length < 5}
              className="bg-[#1B5EA8] text-white text-sm font-medium px-4 py-1.5 rounded-lg hover:bg-[#1B5EA8]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {posting ? 'Posting...' : 'Ask Question'}
            </button>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Questions list */}
      {questions.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-[var(--color-cream)]/60 text-sm">No questions yet. Be the first to ask!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              isOwner={isOwner}
              isAsker={user?.id === q.user_id}
              businessId={businessId}
              onDeleted={() => handleDeleteQuestion(q.id)}
              onAnswered={loadQuestions}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── QuestionCard ─────────────────────────────────────────────────────

interface QuestionCardProps {
  question: BusinessQuestion;
  isOwner: boolean;
  isAsker: boolean;
  businessId: string;
  onDeleted: () => void;
  onAnswered: () => void;
}

function QuestionCard({ question, isOwner, isAsker, businessId, onDeleted, onAnswered }: QuestionCardProps) {
  const { user } = useAuth();
  const [answerText, setAnswerText] = useState('');
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timeAgo = formatTimeAgo(question.created_at);

  const handleSubmitAnswer = async () => {
    if (!user || !answerText.trim()) return;
    setSubmitting(true);
    setError(null);

    const { error: answerError } = await createAnswer(user.id, {
      question_id: question.id,
      answer_text: answerText.trim(),
    });

    if (answerError) {
      setError(answerError.message);
    } else {
      setAnswerText('');
      onAnswered();
    }
    setSubmitting(false);
  };

  const handleEditAnswer = async () => {
    if (!user || !question.answer || !editText.trim()) return;
    setSubmitting(true);
    setError(null);

    const { error: editError } = await updateAnswer(user.id, {
      answer_id: question.answer.id,
      answer_text: editText.trim(),
    });

    if (editError) {
      setError(editError.message);
    } else {
      setEditing(false);
      onAnswered();
    }
    setSubmitting(false);
  };

  const handleDeleteAnswer = async () => {
    if (!user || !question.answer) return;
    const { error: delError } = await deleteAnswer(question.answer.id, user.id);
    if (delError) {
      setError(delError.message);
    } else {
      onAnswered();
    }
  };

  return (
    <div className="bg-[var(--color-charcoal-light)] border border-[var(--color-charcoal-lighter-plus)] rounded-lg p-4">
      {/* Question */}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-[#1B5EA8]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          {question.user?.profile_picture_url ? (
            <img src={question.user.profile_picture_url} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-[#1B5EA8]">
              {(question.user?.full_name || 'U')[0].toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[var(--color-cream)]">
              {question.user?.full_name || question.user?.username || 'User'}
            </span>
            <span className="text-xs text-[var(--color-cream)]/40">{timeAgo}</span>
          </div>
          <p className="text-sm text-[var(--color-cream)]/90 mt-1">{question.question_text}</p>
          {isAsker && (
            <button
              onClick={onDeleted}
              className="text-xs text-red-400/60 hover:text-red-400 mt-1 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Answer */}
      {question.answer && !editing && (
        <div className="mt-3 ml-11 bg-[#1B5EA8]/10 border border-[#1B5EA8]/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-[#1B5EA8]">Business Response</span>
            <span className="text-xs text-[var(--color-cream)]/40">
              {formatTimeAgo(question.answer.created_at)}
            </span>
          </div>
          <p className="text-sm text-[var(--color-cream)]/90">{question.answer.answer_text}</p>
          {isOwner && (
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => {
                  setEditing(true);
                  setEditText(question.answer!.answer_text);
                }}
                className="text-xs text-[#1B5EA8] hover:underline"
              >
                Edit
              </button>
              <button
                onClick={handleDeleteAnswer}
                className="text-xs text-red-400/60 hover:text-red-400"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      )}

      {/* Edit answer form */}
      {editing && question.answer && (
        <div className="mt-3 ml-11">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={2}
            maxLength={2000}
            className="w-full bg-transparent border border-[#1B5EA8]/30 rounded-lg px-3 py-2 text-sm text-[var(--color-cream)] placeholder-[#9E9A90] focus:outline-none focus:border-[#1B5EA8]/50 resize-none"
          />
          <div className="flex gap-2 mt-1">
            <button
              onClick={handleEditAnswer}
              disabled={submitting || !editText.trim()}
              className="text-xs bg-[#1B5EA8] text-white px-3 py-1 rounded-lg disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="text-xs text-[var(--color-cream)]/60 hover:text-[var(--color-cream)]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Reply form for business owner (no answer yet) */}
      {isOwner && !question.answer && !editing && (
        <div className="mt-3 ml-11">
          <textarea
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
            placeholder="Write your response..."
            rows={2}
            maxLength={2000}
            className="w-full bg-transparent border border-[var(--color-charcoal-lighter-plus)] rounded-lg px-3 py-2 text-sm text-[var(--color-cream)] placeholder-[#9E9A90] focus:outline-none focus:border-[#1B5EA8]/50 resize-none"
          />
          <button
            onClick={handleSubmitAnswer}
            disabled={submitting || !answerText.trim()}
            className="mt-1 text-xs bg-[#1B5EA8] text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
          >
            {submitting ? 'Posting...' : 'Reply'}
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-red-400 text-xs mt-2 ml-11">{error}</p>
      )}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────

function formatTimeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoDate).toLocaleDateString();
}
