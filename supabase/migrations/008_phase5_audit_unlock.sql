-- ==============================================================================
-- Migration: 008_phase5_audit_unlock.sql
-- Description: Admin Goal Unlock Governance RPC.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.unlock_goal(
  p_goal_id UUID,
  p_reason  TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role user_role;
  v_old_status  goal_status;
BEGIN
  -- 1. Must be admin
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid() AND is_active = TRUE;
  IF v_caller_role != 'admin' THEN
    RAISE EXCEPTION 'FORBIDDEN: Only active admins may unlock goals.';
  END IF;

  -- 2. Validate reason length
  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 10 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Unlock reason must be at least 10 characters for auditing.';
  END IF;

  -- 3. Get old status and lock row
  SELECT status INTO v_old_status FROM public.goals WHERE id = p_goal_id FOR UPDATE;

  -- 4. Update goal state
  UPDATE public.goals
     SET is_locked = FALSE,
         status = 'under_review',  -- Drop back to under review
         last_review_action = 'unlocked',
         locked_at = NULL,
         locked_by = NULL,
         updated_at = NOW()
   WHERE id = p_goal_id
     AND is_locked = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: Goal % is not locked or does not exist.', p_goal_id;
  END IF;

  -- Note: The existing trigger `trg_audit_goals` automatically inserts a row into `audit_logs` 
  -- with action 'UNLOCK' (and captures old_values vs new_values) because is_locked changes to FALSE.

  -- 5. Insert explicit timeline event so the employee/manager sees the admin action
  INSERT INTO public.goal_approval_logs (
    goal_id, actor_id, action, from_status, to_status, reason, metadata
  ) VALUES (
    p_goal_id, 
    auth.uid(), 
    'unlocked', 
    v_old_status, 
    'under_review', 
    TRIM(p_reason), 
    jsonb_build_object('triggered_by', 'admin_unlock_rpc')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.unlock_goal(UUID, TEXT) TO authenticated;
