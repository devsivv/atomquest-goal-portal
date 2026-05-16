-- Migration to relax goals_insert_own policy for MVP
-- This resolves the Supabase INSERT RLS mismatch on goals submission
-- where profile_id could sometimes mismatch auth.uid() temporarily.

DROP POLICY IF EXISTS "goals_insert_own" ON goals;

CREATE POLICY "goals_insert_own"
  ON goals FOR INSERT
  WITH CHECK (created_by = auth.uid());
