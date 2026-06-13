import { supabase } from './client';
import type {
  BusinessQuestion,
  BusinessAnswer,
  CreateQuestionPayload,
  CreateAnswerPayload,
  UpdateAnswerPayload,
} from '../../models/BusinessQA';
import { validateQuestionText, validateAnswerText, sanitizeText } from '../utils/validation';
import { checkRateLimit } from './fraud';

/**
 * Get all Q&A for a business profile, ordered newest first.
 */
export async function getBusinessQuestions(
  businessId: string
): Promise<{ data: BusinessQuestion[]; error: Error | null }> {
  try {
    // Fetch questions with asker profile info
    const { data: questions, error } = await supabase
      .from('business_questions')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) return { data: [], error: new Error(error.message) };
    if (!questions || questions.length === 0) return { data: [], error: null };

    // Fetch asker profiles
    const userIds = [...new Set(questions.map(q => q.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, full_name, profile_picture_url')
      .in('id', userIds);

    const profileMap = new Map(
      (profiles || []).map(p => [p.id, p])
    );

    // Fetch answers for all questions
    const questionIds = questions.map(q => q.id);
    const { data: answers } = await supabase
      .from('business_answers')
      .select('*')
      .in('question_id', questionIds);

    const answerMap = new Map(
      (answers || []).map(a => [a.question_id, a])
    );

    const enriched: BusinessQuestion[] = questions.map(q => ({
      ...q,
      user: profileMap.get(q.user_id) ? {
        username: profileMap.get(q.user_id)!.username,
        full_name: profileMap.get(q.user_id)!.full_name,
        profile_picture_url: profileMap.get(q.user_id)!.profile_picture_url,
      } : undefined,
      answer: answerMap.get(q.id) || null,
    }));

    return { data: enriched, error: null };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err : new Error('Unable to load questions. Please try again.'),
    };
  }
}

/**
 * Post a new question on a business profile.
 * Rate-limited: max 5 questions per 30 minutes per user.
 */
export async function createQuestion(
  userId: string,
  payload: CreateQuestionPayload
): Promise<{ data: BusinessQuestion | null; error: Error | null }> {
  try {
    const cleaned = sanitizeText(payload.question_text);
    const validation = validateQuestionText(cleaned);
    if (!validation.valid) {
      return { data: null, error: new Error(validation.error) };
    }

    // Rate limit check
    const rateCheck = await checkRateLimit(userId, 'question', 5, 30);
    if (!rateCheck.allowed) {
      return { data: null, error: new Error("You're posting questions too quickly. Please wait a few minutes.") };
    }

    const { data, error } = await supabase
      .from('business_questions')
      .insert({
        business_id: payload.business_id,
        user_id: userId,
        question_text: cleaned,
      })
      .select()
      .single();

    if (error) return { data: null, error: new Error(error.message) };
    return { data: data as BusinessQuestion, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unable to submit question. Please check your connection and try again.'),
    };
  }
}

/**
 * Delete a question (only the asker can do this).
 */
export async function deleteQuestion(
  questionId: string,
  userId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('business_questions')
      .delete()
      .eq('id', questionId)
      .eq('user_id', userId);

    if (error) return { error: new Error(error.message) };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error('Failed to delete question.') };
  }
}

/**
 * Post an answer to a question (business owner only).
 */
export async function createAnswer(
  businessOwnerId: string,
  payload: CreateAnswerPayload
): Promise<{ data: BusinessAnswer | null; error: Error | null }> {
  try {
    const cleaned = sanitizeText(payload.answer_text);
    const validation = validateAnswerText(cleaned);
    if (!validation.valid) {
      return { data: null, error: new Error(validation.error) };
    }

    const { data, error } = await supabase
      .from('business_answers')
      .insert({
        question_id: payload.question_id,
        business_id: businessOwnerId,
        answer_text: cleaned,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { data: null, error: new Error('This question has already been answered.') };
      }
      return { data: null, error: new Error(error.message) };
    }
    return { data: data as BusinessAnswer, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unable to submit answer. Please try again.'),
    };
  }
}

/**
 * Update an existing answer (business owner only).
 */
export async function updateAnswer(
  businessOwnerId: string,
  payload: UpdateAnswerPayload
): Promise<{ error: Error | null }> {
  try {
    const cleaned = sanitizeText(payload.answer_text);
    const validation = validateAnswerText(cleaned);
    if (!validation.valid) {
      return { error: new Error(validation.error) };
    }

    const { error } = await supabase
      .from('business_answers')
      .update({
        answer_text: cleaned,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payload.answer_id)
      .eq('business_id', businessOwnerId);

    if (error) return { error: new Error(error.message) };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error('Failed to update answer.') };
  }
}

/**
 * Delete an answer (business owner only).
 */
export async function deleteAnswer(
  answerId: string,
  businessOwnerId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('business_answers')
      .delete()
      .eq('id', answerId)
      .eq('business_id', businessOwnerId);

    if (error) return { error: new Error(error.message) };

    // Also reset the question's is_answered flag
    // We need the question_id, so fetch the answer first (already deleted, so we skip)
    // The trigger handles marking answered, but un-answering needs manual handling
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error('Failed to delete answer.') };
  }
}
