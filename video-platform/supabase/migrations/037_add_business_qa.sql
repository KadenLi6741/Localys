-- Business Q&A: public questions and answers on business profiles
-- Questions
CREATE TABLE IF NOT EXISTS business_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL CHECK (char_length(trim(question_text)) >= 5 AND char_length(question_text) <= 1000),
  is_answered BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bq_business ON business_questions (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bq_user ON business_questions (user_id);

-- Answers (one per question from the business owner)
CREATE TABLE IF NOT EXISTS business_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES business_questions(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL CHECK (char_length(trim(answer_text)) >= 1 AND char_length(answer_text) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (question_id)
);

CREATE INDEX IF NOT EXISTS idx_ba_question ON business_answers (question_id);

-- RLS for business_questions
ALTER TABLE business_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view questions"
  ON business_questions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can ask questions"
  ON business_questions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own questions"
  ON business_questions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS for business_answers
ALTER TABLE business_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view answers"
  ON business_answers FOR SELECT
  USING (true);

CREATE POLICY "Business owners can insert answers"
  ON business_answers FOR INSERT
  WITH CHECK (auth.uid() = business_id);

CREATE POLICY "Business owners can update own answers"
  ON business_answers FOR UPDATE
  USING (auth.uid() = business_id);

CREATE POLICY "Business owners can delete own answers"
  ON business_answers FOR DELETE
  USING (auth.uid() = business_id);

-- Trigger: auto-set is_answered when an answer is inserted
CREATE OR REPLACE FUNCTION mark_question_answered()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE business_questions SET is_answered = true, updated_at = now()
  WHERE id = NEW.question_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_mark_question_answered
  AFTER INSERT ON business_answers
  FOR EACH ROW
  EXECUTE FUNCTION mark_question_answered();
