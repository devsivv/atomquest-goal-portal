-- ============================================================
-- AtomQuest — Phase 3: Enterprise Approval Persistence Layer
-- Migration: 001_phase3_approval_persistence.sql
-- ============================================================
-- Run this in Supabase SQL Editor AFTER the base schema.sql.
-- All statements are idempotent (IF NOT EXISTS / OR REPLACE).
-- ============================================================

-- ============================================================
-- SECTION 1: EXTEND goals TABLE — Lifecycle Audit Columns
-- ============================================================
-- These columns capture exactly WHO performed each lifecycle
-- action and WHEN, independently of the generic audit_logs table.

ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS locked_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locked_by          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_review_action TEXT
    CHECK (last_review_action IN (
      'approved', 'rejected', 'revision_requested', 'unlocked'
    ));

COMMENT ON COLUMN goals.locked_at          IS 'Timestamp when this goal was locked (set on approval).';
COMMENT ON COLUMN goals.locked_by          IS 'Profile ID of the manager who locked the goal.';
COMMENT ON COLUMN goals.reviewed_at        IS 'Timestamp of the most recent manager review action.';
COMMENT ON COLUMN goals.reviewed_by        IS 'Profile ID of the last manager who reviewed this goal.';
COMMENT ON COLUMN goals.last_review_action IS 'Semantic label of the last manager action on this goal.';

-- Indexes for the new audit columns
CREATE INDEX IF NOT EXISTS idx_goals_reviewed_by     ON goals (reviewed_by) WHERE reviewed_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_goals_locked_by       ON goals (locked_by)   WHERE locked_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_goals_last_action     ON goals (last_review_action) WHERE last_review_action IS NOT NULL;

-- ============================================================
-- SECTION 2: goal_approval_logs — Immutable Timeline Table
-- ============================================================
-- One row per lifecycle transition. Never updated or deleted.
-- Drives the goal timeline UI for both employees and managers.

CREATE TABLE IF NOT EXISTS goal_approval_logs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id      UUID        NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  actor_id     UUID        NOT NULL REFERENCES profiles(id),
  -- Semantic action label (mirrors audit_action enum conceptually)
  action       TEXT        NOT NULL
    CHECK (action IN (
      'submitted', 'approved', 'rejected',
      'revision_requested', 'revision_submitted',
      'locked', 'unlocked', 'bulk_approved'
    )),
  from_status  goal_status NOT NULL,
  to_status    goal_status NOT NULL,
  -- Optional human-readable feedback visible to the employee
  comment      TEXT,
  -- Mandatory reason for reject / revision_requested
  reason       TEXT,
  -- Extensible metadata bag (e.g. client IP, UI context)
  metadata     JSONB       NOT NULL DEFAULT '{}',
  -- Immutable — NO updated_at by design
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  goal_approval_logs IS
  'Immutable approval timeline. One row per goal lifecycle transition. Never UPDATE or DELETE.';
COMMENT ON COLUMN goal_approval_logs.action      IS
  'Semantic action label for the lifecycle event.';
COMMENT ON COLUMN goal_approval_logs.from_status IS
  'goal_status value immediately before this transition.';
COMMENT ON COLUMN goal_approval_logs.to_status   IS
  'goal_status value immediately after this transition.';
COMMENT ON COLUMN goal_approval_logs.comment     IS
  'Optional inline comment from the manager, visible to the employee.';
COMMENT ON COLUMN goal_approval_logs.reason      IS
  'Mandatory reason supplied for reject/revision_requested actions.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_apl_goal_id    ON goal_approval_logs (goal_id);
CREATE INDEX IF NOT EXISTS idx_apl_actor_id   ON goal_approval_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_apl_action     ON goal_approval_logs (action);
CREATE INDEX IF NOT EXISTS idx_apl_created_at ON goal_approval_logs (created_at DESC);
-- Composite: fast timeline fetch for a specific goal ordered by time
CREATE INDEX IF NOT EXISTS idx_apl_goal_timeline
  ON goal_approval_logs (goal_id, created_at DESC);

-- ============================================================
-- SECTION 3: manager_comments — Threaded Comment Table
-- ============================================================
-- Supports both public comments (visible to employee) and
-- internal comments (manager/HR/admin only).

CREATE TABLE IF NOT EXISTS manager_comments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id     UUID        NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  author_id   UUID        NOT NULL REFERENCES profiles(id),
  body        TEXT        NOT NULL
    CHECK (LENGTH(TRIM(body)) >= 5),
  -- FALSE = visible to goal owner; TRUE = manager/HR/admin only
  is_internal BOOLEAN     NOT NULL DEFAULT FALSE,
  -- Soft delete
  deleted_at  TIMESTAMPTZ,
  deleted_by  UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  -- Audit
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  manager_comments IS
  'Threaded manager comments on goals. is_internal=TRUE hides from goal owner.';
COMMENT ON COLUMN manager_comments.is_internal IS
  'If TRUE, comment is hidden from the employee who owns the goal.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mc_goal_id   ON manager_comments (goal_id)   WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mc_author_id ON manager_comments (author_id);
CREATE INDEX IF NOT EXISTS idx_mc_internal  ON manager_comments (goal_id, is_internal) WHERE deleted_at IS NULL;

-- Auto-update updated_at
CREATE TRIGGER trg_manager_comments_updated_at
  BEFORE UPDATE ON manager_comments
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ============================================================
-- SECTION 4: HELPER — fn_assert_manager_can_act
-- ============================================================
-- Validates that p_manager_id is the direct manager of the goal
-- owner before any approval action proceeds. Raises exceptions
-- that bubble up cleanly to the Supabase client.

CREATE OR REPLACE FUNCTION fn_assert_manager_can_act(
  p_goal_id    UUID,
  p_manager_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id  UUID;
  v_goal_status goal_status;
BEGIN
  -- Fetch goal owner and current status
  SELECT profile_id, status
    INTO v_profile_id, v_goal_status
    FROM goals
   WHERE id = p_goal_id
     AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'GOAL_NOT_FOUND: Goal % does not exist or has been deleted.', p_goal_id;
  END IF;

  -- Self-approval guard (mirrors DB constraint goals_no_self_approve)
  IF v_profile_id = p_manager_id THEN
    RAISE EXCEPTION 'FORBIDDEN: You cannot approve your own goals.';
  END IF;

  -- Verify manager relationship via profiles.manager_id
  IF NOT EXISTS (
    SELECT 1 FROM profiles
     WHERE id         = v_profile_id
       AND manager_id = p_manager_id
       AND is_active  = TRUE
  ) THEN
    RAISE EXCEPTION
      'FORBIDDEN: You are not the direct manager of this goal''s owner.';
  END IF;
END;
$$;

-- ============================================================
-- SECTION 5: TRANSACTIONAL APPROVAL RPC FUNCTIONS
-- ============================================================
-- All three functions are SECURITY DEFINER so they can write to
-- goal_approval_logs (which blocks direct inserts via RLS).
-- Each function:
--   1. Validates permissions (fn_assert_manager_can_act)
--   2. Validates the status transition
--   3. Updates goals atomically (FOR UPDATE row lock)
--   4. Inserts an immutable approval log entry
--   5. Optionally inserts a manager_comment
--   6. Returns the updated goals row

-- ------------------------------------------------------------
-- approve_goal_sheet
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION approve_goal_sheet(
  p_goal_id    UUID,
  p_manager_id UUID,
  p_comment    TEXT DEFAULT NULL
)
RETURNS goals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_status goal_status;
  v_goal       goals%ROWTYPE;
BEGIN
  -- Permission check
  PERFORM fn_assert_manager_can_act(p_goal_id, p_manager_id);

  -- Lock row, read current status
  SELECT status INTO v_old_status
    FROM goals WHERE id = p_goal_id FOR UPDATE;

  -- Validate transition
  IF v_old_status NOT IN ('submitted', 'under_review') THEN
    RAISE EXCEPTION
      'INVALID_TRANSITION: Goal must be submitted or under_review to approve. Current status: %',
      v_old_status;
  END IF;

  -- Atomic goal update
  -- Note: the existing fn_goal_approval_lock trigger will also fire
  -- and set is_locked=TRUE, approved_at=NOW() — that's belt-and-suspenders.
  -- We set the new Phase 3 columns explicitly here.
  UPDATE goals SET
    status              = 'approved',
    approved_by         = p_manager_id,
    approved_at         = NOW(),
    reviewed_at         = NOW(),
    reviewed_by         = p_manager_id,
    last_review_action  = 'approved',
    is_locked           = TRUE,
    locked_at           = NOW(),
    locked_by           = p_manager_id,
    updated_at          = NOW()
  WHERE id = p_goal_id
  RETURNING * INTO v_goal;

  -- Write immutable approval log
  INSERT INTO goal_approval_logs
    (goal_id, actor_id, action, from_status, to_status, comment, metadata)
  VALUES
    (p_goal_id, p_manager_id, 'approved', v_old_status, 'approved',
     p_comment,
     jsonb_build_object('triggered_by', 'approve_goal_sheet'));

  -- Write optional public manager comment
  IF p_comment IS NOT NULL AND LENGTH(TRIM(p_comment)) >= 5 THEN
    INSERT INTO manager_comments (goal_id, author_id, body, is_internal)
    VALUES (p_goal_id, p_manager_id, TRIM(p_comment), FALSE);
  END IF;

  RETURN v_goal;
END;
$$;

COMMENT ON FUNCTION approve_goal_sheet(UUID, UUID, TEXT) IS
  'Atomically approves a goal: updates status to approved, sets lock columns, '
  'writes approval log entry, and optionally adds a public manager comment.';

-- ------------------------------------------------------------
-- reject_goal_sheet
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION reject_goal_sheet(
  p_goal_id    UUID,
  p_manager_id UUID,
  p_reason     TEXT,
  p_comment    TEXT DEFAULT NULL
)
RETURNS goals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_status goal_status;
  v_goal       goals%ROWTYPE;
BEGIN
  -- Validate mandatory reason
  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 10 THEN
    RAISE EXCEPTION
      'VALIDATION_ERROR: Rejection reason must be at least 10 characters.';
  END IF;

  PERFORM fn_assert_manager_can_act(p_goal_id, p_manager_id);

  SELECT status INTO v_old_status
    FROM goals WHERE id = p_goal_id FOR UPDATE;

  IF v_old_status NOT IN ('submitted', 'under_review') THEN
    RAISE EXCEPTION
      'INVALID_TRANSITION: Goal must be submitted or under_review to reject. Current: %',
      v_old_status;
  END IF;

  -- Rejected goals remain UNLOCKED so the employee can revise and re-submit.
  UPDATE goals SET
    status              = 'rejected',
    rejected_reason     = TRIM(p_reason),
    approved_by         = p_manager_id,
    reviewed_at         = NOW(),
    reviewed_by         = p_manager_id,
    last_review_action  = 'rejected',
    is_locked           = FALSE,
    -- Clear any stale lock metadata from prior cycles
    locked_at           = NULL,
    locked_by           = NULL,
    updated_at          = NOW()
  WHERE id = p_goal_id
  RETURNING * INTO v_goal;

  INSERT INTO goal_approval_logs
    (goal_id, actor_id, action, from_status, to_status, reason, comment, metadata)
  VALUES
    (p_goal_id, p_manager_id, 'rejected', v_old_status, 'rejected',
     TRIM(p_reason), p_comment,
     jsonb_build_object('triggered_by', 'reject_goal_sheet'));

  IF p_comment IS NOT NULL AND LENGTH(TRIM(p_comment)) >= 5 THEN
    INSERT INTO manager_comments (goal_id, author_id, body, is_internal)
    VALUES (p_goal_id, p_manager_id, TRIM(p_comment), FALSE);
  END IF;

  RETURN v_goal;
END;
$$;

COMMENT ON FUNCTION reject_goal_sheet(UUID, UUID, TEXT, TEXT) IS
  'Atomically rejects a goal with a mandatory reason. Goal stays UNLOCKED '
  'so the employee can revise and re-submit. Writes approval log entry.';

-- ------------------------------------------------------------
-- request_goal_revision
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION request_goal_revision(
  p_goal_id    UUID,
  p_manager_id UUID,
  p_reason     TEXT,
  p_comment    TEXT DEFAULT NULL
)
RETURNS goals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_status goal_status;
  v_goal       goals%ROWTYPE;
BEGIN
  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 10 THEN
    RAISE EXCEPTION
      'VALIDATION_ERROR: Revision reason must be at least 10 characters.';
  END IF;

  PERFORM fn_assert_manager_can_act(p_goal_id, p_manager_id);

  SELECT status INTO v_old_status
    FROM goals WHERE id = p_goal_id FOR UPDATE;

  IF v_old_status NOT IN ('submitted', 'under_review') THEN
    RAISE EXCEPTION
      'INVALID_TRANSITION: Goal must be submitted or under_review to request revision. Current: %',
      v_old_status;
  END IF;

  -- revision_requested goals are UNLOCKED — employee must edit and re-submit.
  UPDATE goals SET
    status              = 'revision_requested',
    rejected_reason     = TRIM(p_reason),
    approved_by         = p_manager_id,
    reviewed_at         = NOW(),
    reviewed_by         = p_manager_id,
    last_review_action  = 'revision_requested',
    is_locked           = FALSE,
    locked_at           = NULL,
    locked_by           = NULL,
    updated_at          = NOW()
  WHERE id = p_goal_id
  RETURNING * INTO v_goal;

  INSERT INTO goal_approval_logs
    (goal_id, actor_id, action, from_status, to_status, reason, comment, metadata)
  VALUES
    (p_goal_id, p_manager_id, 'revision_requested', v_old_status, 'revision_requested',
     TRIM(p_reason), p_comment,
     jsonb_build_object('triggered_by', 'request_goal_revision'));

  IF p_comment IS NOT NULL AND LENGTH(TRIM(p_comment)) >= 5 THEN
    INSERT INTO manager_comments (goal_id, author_id, body, is_internal)
    VALUES (p_goal_id, p_manager_id, TRIM(p_comment), FALSE);
  END IF;

  RETURN v_goal;
END;
$$;

COMMENT ON FUNCTION request_goal_revision(UUID, UUID, TEXT, TEXT) IS
  'Atomically sets status to revision_requested. Goal is UNLOCKED for employee revision. '
  'Writes approval log entry. Employee must re-submit after making changes.';

-- ============================================================
-- SECTION 6: RLS — goal_approval_logs
-- ============================================================

ALTER TABLE goal_approval_logs ENABLE ROW LEVEL SECURITY;

-- Employees can read timeline for their own goals
CREATE POLICY "apl_select_own"
  ON goal_approval_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM goals
       WHERE goals.id         = goal_id
         AND goals.profile_id = auth.uid()
         AND goals.deleted_at IS NULL
    )
  );

-- Managers can read timeline for their direct reports' goals
CREATE POLICY "apl_select_manager"
  ON goal_approval_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM goals g
      JOIN profiles p ON p.id = g.profile_id
       WHERE g.id         = goal_id
         AND p.manager_id = auth.uid()
         AND g.deleted_at IS NULL
    )
  );

-- HR and Admin see everything
CREATE POLICY "apl_select_admin_hr"
  ON goal_approval_logs FOR SELECT
  USING (is_admin_or_hr());

-- Direct INSERT blocked — only SECURITY DEFINER functions may write
CREATE POLICY "apl_insert_deny"
  ON goal_approval_logs FOR INSERT
  WITH CHECK (FALSE);

-- No UPDATE or DELETE ever (immutable log)
CREATE POLICY "apl_update_deny"
  ON goal_approval_logs FOR UPDATE
  USING (FALSE);

CREATE POLICY "apl_delete_deny"
  ON goal_approval_logs FOR DELETE
  USING (FALSE);

-- ============================================================
-- SECTION 7: RLS — manager_comments
-- ============================================================

ALTER TABLE manager_comments ENABLE ROW LEVEL SECURITY;

-- Employee sees only PUBLIC (non-internal) comments on their own goals
CREATE POLICY "mc_select_employee_public"
  ON manager_comments FOR SELECT
  USING (
    deleted_at  IS NULL
    AND is_internal = FALSE
    AND EXISTS (
      SELECT 1 FROM goals
       WHERE goals.id         = goal_id
         AND goals.profile_id = auth.uid()
         AND goals.deleted_at IS NULL
    )
  );

-- Managers see ALL comments (public + internal) on their direct reports' goals
CREATE POLICY "mc_select_manager"
  ON manager_comments FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM goals g
      JOIN profiles p ON p.id = g.profile_id
       WHERE g.id         = goal_id
         AND p.manager_id = auth.uid()
         AND g.deleted_at IS NULL
    )
  );

-- Comment authors always see their own comments (e.g. to show sent state)
CREATE POLICY "mc_select_own_author"
  ON manager_comments FOR SELECT
  USING (deleted_at IS NULL AND author_id = auth.uid());

-- HR/Admin see all non-deleted comments
CREATE POLICY "mc_select_admin_hr"
  ON manager_comments FOR SELECT
  USING (is_admin_or_hr() AND deleted_at IS NULL);

-- Managers (and admins) can insert comments on their direct reports' goals
CREATE POLICY "mc_insert_manager"
  ON manager_comments FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
       WHERE id   = auth.uid()
         AND role IN ('manager', 'admin')
    )
    AND EXISTS (
      SELECT 1 FROM goals g
      JOIN profiles p ON p.id = g.profile_id
       WHERE g.id         = goal_id
         AND p.manager_id = auth.uid()
         AND g.deleted_at IS NULL
    )
  );

-- Authors can soft-delete their own comments (set deleted_at)
CREATE POLICY "mc_soft_delete_own"
  ON manager_comments FOR UPDATE
  USING  (author_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (author_id = auth.uid());

-- Admins can soft-delete any comment
CREATE POLICY "mc_soft_delete_admin"
  ON manager_comments FOR UPDATE
  USING (is_admin());

-- ============================================================
-- SECTION 8: GRANT EXECUTE TO authenticated ROLE
-- ============================================================

GRANT EXECUTE ON FUNCTION fn_assert_manager_can_act(UUID, UUID)        TO authenticated;
GRANT EXECUTE ON FUNCTION approve_goal_sheet(UUID, UUID, TEXT)          TO authenticated;
GRANT EXECUTE ON FUNCTION reject_goal_sheet(UUID, UUID, TEXT, TEXT)     TO authenticated;
GRANT EXECUTE ON FUNCTION request_goal_revision(UUID, UUID, TEXT, TEXT) TO authenticated;

-- ============================================================
-- SECTION 9: PATCH fn_goal_approval_lock — honour locked_at/locked_by
-- ============================================================
-- The existing trigger sets is_locked=TRUE on approval but doesn't know
-- about the new locked_at / locked_by columns. We patch it to also
-- clear them on unlock so state stays consistent.

CREATE OR REPLACE FUNCTION fn_goal_approval_lock()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- ── Approve: lock the goal ────────────────────────────────
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    NEW.is_locked   := TRUE;
    NEW.approved_at := COALESCE(NEW.approved_at, NOW());
    -- locked_at / locked_by set by the RPC function; only set here if null
    NEW.locked_at   := COALESCE(NEW.locked_at, NOW());
    NEW.locked_by   := COALESCE(NEW.locked_by, NEW.approved_by);
  END IF;

  -- ── Block content edits on locked goals ──────────────────
  IF OLD.is_locked = TRUE AND NEW.is_locked = TRUE THEN
    IF NEW.title         IS DISTINCT FROM OLD.title         OR
       NEW.description   IS DISTINCT FROM OLD.description   OR
       NEW.weightage      IS DISTINCT FROM OLD.weightage      OR
       NEW.thrust_area   IS DISTINCT FROM OLD.thrust_area   OR
       NEW.uom_type      IS DISTINCT FROM OLD.uom_type      OR
       NEW.target_value  IS DISTINCT FROM OLD.target_value  OR
       NEW.deadline_date IS DISTINCT FROM OLD.deadline_date THEN
      RAISE EXCEPTION
        'GOAL_LOCKED: Goal is locked after approval. Contact admin to unlock.';
    END IF;
  END IF;

  -- ── Submit: set submitted_at on first submission ──────────
  IF NEW.status = 'submitted' AND OLD.status = 'draft' THEN
    NEW.submitted_at := COALESCE(NEW.submitted_at, NOW());
  END IF;

  -- ── Reject / Revision: ensure goal is NOT locked ─────────
  IF NEW.status IN ('rejected', 'revision_requested') THEN
    NEW.is_locked := FALSE;
    NEW.locked_at := NULL;
    NEW.locked_by := NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================
-- END OF MIGRATION 001
-- ============================================================
