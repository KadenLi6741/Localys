/** A question asked on a business profile */
export interface BusinessQuestion {
  id: string;
  business_id: string;
  user_id: string;
  question_text: string;
  is_answered: boolean;
  created_at: string;
  updated_at: string;
  /** Joined fields from profiles */
  user?: {
    username: string;
    full_name: string;
    profile_picture_url?: string;
  };
  /** The business answer, if one exists */
  answer?: BusinessAnswer | null;
}

/** An answer from the business owner to a question */
export interface BusinessAnswer {
  id: string;
  question_id: string;
  business_id: string;
  answer_text: string;
  created_at: string;
  updated_at: string;
}

export interface CreateQuestionPayload {
  business_id: string;
  question_text: string;
}

export interface CreateAnswerPayload {
  question_id: string;
  answer_text: string;
}

export interface UpdateAnswerPayload {
  answer_id: string;
  answer_text: string;
}
