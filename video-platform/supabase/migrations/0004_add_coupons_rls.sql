-- Enable RLS on coupons and user_coupons tables
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_coupons ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for coupons table
-- All authenticated users can view active public coupons
CREATE POLICY "Authenticated users can view active coupons"
ON coupons FOR SELECT
TO authenticated
USING (is_active = true);

-- Create RLS policies for user_coupons table
-- Users can only view their own coupons
CREATE POLICY "Users can view their own coupons"
ON user_coupons FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can only insert coupons for themselves
CREATE POLICY "Users can insert coupons for themselves"
ON user_coupons FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own coupons
CREATE POLICY "Users can update their own coupons"
ON user_coupons FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Optionally allow anon users to read active coupons
CREATE POLICY "Anon users can view active coupons"
ON coupons FOR SELECT
TO anon
USING (is_active = true);
