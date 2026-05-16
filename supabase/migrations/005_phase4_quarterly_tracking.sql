-- ============================================================
-- AtomQuest — Phase 4, Step 1: Quarterly Tracking Foundation
-- Migration: 005_phase4_quarterly_tracking.sql
-- ============================================================
-- Run AFTER 004_employee_submit_goals.sql.
-- All statements are idempotent (IF NOT EXISTS / OR REPLACE).
--
-- Architecture principles enforced here:
--   • Approved goals are IMMUTABLE — quarterly progress is stored
--     in separate tables and never touches the goals row content.
--   • One check-in row per (goal_id, quarter) — enforced by UNIQUE
--     constraint + upsert-safe RPC design.
--   • All writes go through SECURITY DEFINER RPCs so RLS stays
--     strict; direct INSERT/UPDATE is blocked for employees.
--   • Audit trail is append-only (quarterly_checkin_audit_logs).
--   • Consistent with existing: profiles, goals, goal_approval_logs,
--     audit_logs, fn_set_updated_at(), is_admin_or_hr(), is_admin().
-- ============================================================


-- ============================================================
-- SECTION 0: ENUM — quarter label
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'quarter_label'
  ) THEN
    CREATE TYPE quarter_label AS ENUM ('Q1', 'Q2', 'Q3', 'Q4');
  END IF;
END$$;

COMMENT ON TYPE quarter_label IS
  'Fiscal-quarter identifier used across all quarterly tracking tables.';


-- ============================================================
-- SECTION 1: quarterly_checkins
-- ============================================================
-- One row per (goal_id, quarter).
-- Stores the self-assessed progress percentage the employee
-- reports at each quarterly checkpoint.
-- The parent goals row is NEVER modified; this table is the
-- single source of truth for in-flight progress.

CREATE TABLE IF NOT EXISTS quarterly_checkins (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  goal_id         UUID          NOT NULL
                    REFERENCES goals(id) ON DELETE CASCADE,
  employee_id     UUID          NOT NULL
                    REFERENCES profiles(id) ON DELETE RESTRICT,

  -- Quarter being checked in
  quarter         quarter_label NOT NULL,

  -- Progress reported by the employee (0–100 %)
  progress_pct    NUMERIC(5,2)  NOT NULL
                    CHECK (progress_pct >= 0 AND progress_pct <= 100),

  -- Optional narrative from the employee
  employee_notes  TEXT,

  -- Workflow state for this check-in
  -- 'draft'     → employee saved but has not submitted
  -- 'submitted' → awaiting manager acknowledgement
  -- 'acknowledged' → manager has reviewed and signed off
  checkin_status  TEXT          NOT NULL DEFAULT 'draft'
                    CHECK (checkin_status IN ('draft', 'submitted', 'acknowledged')),

  -- Manager acknowledgement metadata
  acknowledged_by UUID          REFERENCES profiles(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,

  -- Soft-delete (preserves audit history)
  deleted_at      TIMESTAMPTZ,
  deleted_by      UUID          REFERENCES profiles(id) ON DELETE SET NULL,

  -- Standard audit stamps
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- One check-in row per goal per quarter (active rows only)
  CONSTRAINT uq_checkin_goal_quarter
    UNIQUE (goal_id, quarter)
);

COMMENT ON TABLE quarterly_checkins IS
  'One row per (goal_id, quarter). Stores employee self-assessed progress '
  'without modifying the immutable approved goals row.';
COMMENT ON COLUMN quarterly_checkins.progress_pct IS
  'Employee-reported completion percentage for this goal in this quarter (0–100).';
COMMENT ON COLUMN quarterly_checkins.checkin_status IS
  'Workflow state: draft → submitted → acknowledged.';
COMMENT ON COLUMN quarterly_checkins.acknowledged_by IS
  'Profile ID of the manager who acknowledged this check-in.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_qci_goal_id
  ON quarterly_checkins (goal_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_qci_employee_id
  ON quarterly_checkins (employee_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_qci_quarter
  ON quarterly_checkins (quarter);

CREATE INDEX IF NOT EXISTS idx_qci_status
  ON quarterly_checkins (checkin_status)
  WHERE deleted_at IS NULL;

-- Composite: fast fetch of all check-ins for a specific employee+quarter
CREATE INDEX IF NOT EXISTS idx_qci_employee_quarter
  ON quarterly_checkins (employee_id, quarter)
  WHERE deleted_at IS NULL;

-- Composite: manager dashboard — all check-ins pending acknowledgement
CREATE INDEX IF NOT EXISTS idx_qci_pending_ack
  ON quarterly_checkins (acknowledged_by, checkin_status)
  WHERE checkin_status = 'submitted' AND deleted_at IS NULL;

-- Auto-update updated_at
CREATE OR REPLACE TRIGGER trg_quarterly_checkins_updated_at
  BEFORE UPDATE ON quarterly_checkins
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- ============================================================
-- SECTION 2: quarterly_goal_updates
-- ============================================================
-- Richer detail record linked to a check-in.
-- While quarterly_checkins is the lightweight "headline" row,
-- this table holds supporting evidence, actual vs target values,
-- and manager scoring — enabling deep analytics without
-- polluting the check-in row.

CREATE TABLE IF NOT EXISTS quarterly_goal_updates (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Parent check-in (cascade delete keeps data consistent)
  checkin_id        UUID          NOT NULL
                      REFERENCES quarterly_checkins(id) ON DELETE CASCADE,

  -- Denormalised for fast queries (avoids double-join)
  goal_id           UUID          NOT NULL
                      REFERENCES goals(id) ON DELETE CASCADE,
  employee_id       UUID          NOT NULL
                      REFERENCES profiles(id) ON DELETE RESTRICT,
  quarter           quarter_label NOT NULL,

  -- Actuals
  actual_value      NUMERIC(12,4),   -- measured value (matches goal uom_type)
  actual_pct        NUMERIC(5,2)     -- derived/confirmed completion %
                      CHECK (actual_pct IS NULL OR (actual_pct >= 0 AND actual_pct <= 100)),

  -- Supporting evidence / URLs / attachments description
  evidence_notes    TEXT,

  -- Blockers or challenges (surfaced to manager)
  blockers          TEXT,

  -- Manager assessment
  manager_score     NUMERIC(3,1)   -- 0.0 – 5.0 rating scale
                      CHECK (manager_score IS NULL OR
                             (manager_score >= 0 AND manager_score <= 5)),
  manager_feedback  TEXT,
  scored_by         UUID           REFERENCES profiles(id) ON DELETE SET NULL,
  scored_at         TIMESTAMPTZ,

  -- Extensible metadata bag (UI context, client version, etc.)
  metadata          JSONB          NOT NULL DEFAULT '{}',

  -- Soft-delete
  deleted_at        TIMESTAMPTZ,
  deleted_by        UUID           REFERENCES profiles(id) ON DELETE SET NULL,

  -- Audit stamps
  created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE quarterly_goal_updates IS
  'Detailed quarterly progress record linked to a quarterly_checkins row. '
  'Holds actual values, evidence, blockers, and manager scoring. Never modifies goals.';
COMMENT ON COLUMN quarterly_goal_updates.actual_value IS
  'Raw measured value in the goal''s unit of measurement.';
COMMENT ON COLUMN quarterly_goal_updates.manager_score IS
  'Manager rating 0.0–5.0 for this goal''s quarterly performance.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_qgu_checkin_id
  ON quarterly_goal_updates (checkin_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_qgu_goal_id
  ON quarterly_goal_updates (goal_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_qgu_employee_id
  ON quarterly_goal_updates (employee_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_qgu_quarter
  ON quarterly_goal_updates (quarter);

-- Composite: analytics — all updates for a goal across quarters
CREATE INDEX IF NOT EXISTS idx_qgu_goal_quarter
  ON quarterly_goal_updates (goal_id, quarter)
  WHERE deleted_at IS NULL;

-- Composite: manager scoring dashboard
CREATE INDEX IF NOT EXISTS idx_qgu_scored_by
  ON quarterly_goal_updates (scored_by, quarter)
  WHERE scored_by IS NOT NULL AND deleted_at IS NULL;

-- Auto-update updated_at
CREATE OR REPLACE TRIGGER trg_quarterly_goal_updates_updated_at
  BEFORE UPDATE ON quarterly_goal_updates
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- ============================================================
-- SECTION 3: quarterly_checkin_audit_logs
-- ============================================================
-- Append-only audit log for every state transition on a check-in.
-- Mirrors the pattern of goal_approval_logs: immutable, no UPDATE,
-- no DELETE, written only by SECURITY DEFINER RPCs.

CREATE TABLE IF NOT EXISTS quarterly_checkin_audit_logs (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  checkin_id    UUID          NOT NULL
                  REFERENCES quarterly_checkins(id) ON DELETE CASCADE,
  goal_id       UUID          NOT NULL
                  REFERENCES goals(id) ON DELETE CASCADE,
  actor_id      UUID          NOT NULL
                  REFERENCES profiles(id),

  -- Quarter for quick filtering without a join
  quarter       quarter_label NOT NULL,

  -- Action performed
  action        TEXT          NOT NULL
                  CHECK (action IN (
                    'checkin_created',
                    'checkin_updated',
                    'checkin_submitted',
                    'checkin_acknowledged',
                    'checkin_deleted',
                    'update_scored'
                  )),

  -- Status transition
  from_status   TEXT,
  to_status     TEXT,

  -- Snapshot of changed values (old → new)
  old_values    JSONB,
  new_values    JSONB,

  -- Extensible metadata
  metadata      JSONB         NOT NULL DEFAULT '{}',

  -- Immutable — NO updated_at by design (mirrors goal_approval_logs)
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE quarterly_checkin_audit_logs IS
  'Immutable audit timeline for quarterly check-in state transitions. '
  'One row per action. Never UPDATE or DELETE. Written only by SECURITY DEFINER RPCs.';
COMMENT ON COLUMN quarterly_checkin_audit_logs.action IS
  'Semantic label for the event that triggered this log entry.';
COMMENT ON COLUMN quarterly_checkin_audit_logs.old_values IS
  'JSONB snapshot of the row before the action (NULL for creates).';
COMMENT ON COLUMN quarterly_checkin_audit_logs.new_values IS
  'JSONB snapshot of the row after the action (NULL for deletes).';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_qcal_checkin_id
  ON quarterly_checkin_audit_logs (checkin_id);

CREATE INDEX IF NOT EXISTS idx_qcal_goal_id
  ON quarterly_checkin_audit_logs (goal_id);

CREATE INDEX IF NOT EXISTS idx_qcal_actor_id
  ON quarterly_checkin_audit_logs (actor_id);

CREATE INDEX IF NOT EXISTS idx_qcal_action
  ON quarterly_checkin_audit_logs (action);

CREATE INDEX IF NOT EXISTS idx_qcal_created_at
  ON quarterly_checkin_audit_logs (created_at DESC);

-- Composite: full timeline for a single check-in ordered by time
CREATE INDEX IF NOT EXISTS idx_qcal_checkin_timeline
  ON quarterly_checkin_audit_logs (checkin_id, created_at DESC);

-- Composite: all audit entries for a goal across all quarters
CREATE INDEX IF NOT EXISTS idx_qcal_goal_timeline
  ON quarterly_checkin_audit_logs (goal_id, quarter, created_at DESC);


-- ============================================================
-- SECTION 4: GUARD TRIGGER — prevent progress on non-approved goals
-- ============================================================
-- An employee must not be able to open a quarterly check-in
-- against a goal that is not yet approved (or has been locked
-- out again by an admin unlock-and-re-review cycle).

CREATE OR REPLACE FUNCTION fn_guard_checkin_on_approved_goal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status    goal_status;
  v_locked    BOOLEAN;
BEGIN
  SELECT status, is_locked
    INTO v_status, v_locked
    FROM goals
   WHERE id = NEW.goal_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'GOAL_NOT_FOUND: Goal % does not exist.', NEW.goal_id;
  END IF;

  IF v_status <> 'approved' OR v_locked IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION
      'CHECKIN_BLOCKED: Quarterly check-ins are only allowed on approved '
      'and locked goals. Current status: %, is_locked: %.',
      v_status, v_locked;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_guard_checkin_approved
  BEFORE INSERT ON quarterly_checkins
  FOR EACH ROW EXECUTE FUNCTION fn_guard_checkin_on_approved_goal();

COMMENT ON FUNCTION fn_guard_checkin_on_approved_goal() IS
  'Blocks INSERT into quarterly_checkins unless the parent goal is '
  'approved (status=approved AND is_locked=TRUE). '
  'Enforces the "immutable approved goals" invariant.';


-- ============================================================
-- SECTION 5: GUARD TRIGGER — employee_id must own the goal
-- ============================================================

CREATE OR REPLACE FUNCTION fn_guard_checkin_employee_owns_goal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM goals
     WHERE id         = NEW.goal_id
       AND profile_id = NEW.employee_id
  ) THEN
    RAISE EXCEPTION
      'FORBIDDEN: employee_id % does not own goal %.', NEW.employee_id, NEW.goal_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_guard_checkin_ownership
  BEFORE INSERT ON quarterly_checkins
  FOR EACH ROW EXECUTE FUNCTION fn_guard_checkin_employee_owns_goal();

COMMENT ON FUNCTION fn_guard_checkin_employee_owns_goal() IS
  'Ensures the check-in employee_id matches the goal''s profile_id, '
  'preventing cross-employee data pollution.';


-- ============================================================
-- SECTION 6: RPC — upsert_quarterly_checkin
-- ============================================================
-- SECURITY DEFINER so it can bypass the strict RLS INSERT block
-- and write the audit log atomically.
-- Employees call this to save (draft) or submit their check-in.

CREATE OR REPLACE FUNCTION upsert_quarterly_checkin(
  p_goal_id       UUID,
  p_quarter       quarter_label,
  p_progress_pct  NUMERIC,
  p_notes         TEXT     DEFAULT NULL,
  p_submit        BOOLEAN  DEFAULT FALSE   -- TRUE = status → submitted
)
RETURNS quarterly_checkins
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee_id UUID;
  v_old_row     quarterly_checkins%ROWTYPE;
  v_new_row     quarterly_checkins%ROWTYPE;
  v_action      TEXT;
  v_from_status TEXT;
  v_to_status   TEXT;
BEGIN
  -- ── 1. Session guard ─────────────────────────────────────
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED: No active session.';
  END IF;

  v_employee_id := auth.uid();

  -- ── 2. Confirm goal ownership ─────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM goals
     WHERE id         = p_goal_id
       AND profile_id = v_employee_id
       AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN: You do not own goal %.', p_goal_id;
  END IF;

  -- ── 3. Validate progress range ────────────────────────────
  IF p_progress_pct < 0 OR p_progress_pct > 100 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: progress_pct must be between 0 and 100.';
  END IF;

  -- ── 4. Fetch existing row if present ──────────────────────
  SELECT * INTO v_old_row
    FROM quarterly_checkins
   WHERE goal_id = p_goal_id
     AND quarter = p_quarter
     AND deleted_at IS NULL;

  -- Guard: cannot re-submit an already-acknowledged check-in
  IF FOUND AND v_old_row.checkin_status = 'acknowledged' THEN
    RAISE EXCEPTION
      'CHECKIN_LOCKED: This check-in has already been acknowledged '
      'by your manager and cannot be modified.';
  END IF;

  -- ── 5. Determine new status ────────────────────────────────
  v_from_status := COALESCE(v_old_row.checkin_status, 'draft');
  v_to_status   := CASE WHEN p_submit THEN 'submitted' ELSE 'draft' END;

  -- ── 6. Upsert ─────────────────────────────────────────────
  INSERT INTO quarterly_checkins (
    goal_id, employee_id, quarter,
    progress_pct, employee_notes, checkin_status
  )
  VALUES (
    p_goal_id, v_employee_id, p_quarter,
    p_progress_pct, p_notes, v_to_status
  )
  ON CONFLICT (goal_id, quarter)
  DO UPDATE SET
    progress_pct    = EXCLUDED.progress_pct,
    employee_notes  = EXCLUDED.employee_notes,
    checkin_status  = EXCLUDED.checkin_status,
    updated_at      = NOW()
  WHERE quarterly_checkins.checkin_status <> 'acknowledged'
  RETURNING * INTO v_new_row;

  -- ── 7. Determine audit action label ───────────────────────
  IF v_old_row IS NULL THEN
    v_action := 'checkin_created';
  ELSIF p_submit THEN
    v_action := 'checkin_submitted';
  ELSE
    v_action := 'checkin_updated';
  END IF;

  -- ── 8. Write audit log ────────────────────────────────────
  INSERT INTO quarterly_checkin_audit_logs (
    checkin_id, goal_id, actor_id, quarter,
    action, from_status, to_status,
    old_values, new_values, metadata
  )
  VALUES (
    v_new_row.id, p_goal_id, v_employee_id, p_quarter,
    v_action, v_from_status, v_to_status,
    CASE WHEN v_old_row IS NOT NULL THEN to_jsonb(v_old_row) ELSE NULL END,
    to_jsonb(v_new_row),
    jsonb_build_object('triggered_by', 'upsert_quarterly_checkin')
  );

  RETURN v_new_row;
END;
$$;

COMMENT ON FUNCTION upsert_quarterly_checkin(UUID, quarter_label, NUMERIC, TEXT, BOOLEAN) IS
  'Employee RPC: creates or updates a quarterly check-in (draft or submit). '
  'Blocked on acknowledged check-ins. Writes audit log atomically. '
  'Only callable for goals owned by auth.uid().';

GRANT EXECUTE ON FUNCTION upsert_quarterly_checkin(UUID, quarter_label, NUMERIC, TEXT, BOOLEAN)
  TO authenticated;


-- ============================================================
-- SECTION 7: RPC — acknowledge_quarterly_checkin
-- ============================================================
-- Manager calls this to acknowledge an employee's submitted check-in.
-- Optionally attaches a manager score + feedback via quarterly_goal_updates.

CREATE OR REPLACE FUNCTION acknowledge_quarterly_checkin(
  p_checkin_id      UUID,
  p_manager_id      UUID,
  p_manager_score   NUMERIC   DEFAULT NULL,
  p_manager_feedback TEXT     DEFAULT NULL
)
RETURNS quarterly_checkins
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_checkin   quarterly_checkins%ROWTYPE;
  v_update_id UUID;
BEGIN
  -- ── 1. Session guard ─────────────────────────────────────
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED: No active session.';
  END IF;

  IF auth.uid() <> p_manager_id THEN
    RAISE EXCEPTION 'FORBIDDEN: caller auth.uid() does not match p_manager_id.';
  END IF;

  -- ── 2. Lock and fetch check-in row ───────────────────────
  SELECT * INTO v_checkin
    FROM quarterly_checkins
   WHERE id = p_checkin_id
     AND deleted_at IS NULL
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CHECKIN_NOT_FOUND: Check-in % does not exist.', p_checkin_id;
  END IF;

  IF v_checkin.checkin_status <> 'submitted' THEN
    RAISE EXCEPTION
      'INVALID_TRANSITION: Only submitted check-ins can be acknowledged. '
      'Current status: %.', v_checkin.checkin_status;
  END IF;

  -- ── 3. Verify manager is the direct manager of the employee ─
  IF NOT EXISTS (
    SELECT 1 FROM profiles
     WHERE id         = v_checkin.employee_id
       AND manager_id = p_manager_id
       AND is_active  = TRUE
  ) THEN
    RAISE EXCEPTION
      'FORBIDDEN: You are not the direct manager of this check-in''s owner.';
  END IF;

  -- ── 4. Validate score range ───────────────────────────────
  IF p_manager_score IS NOT NULL AND
     (p_manager_score < 0 OR p_manager_score > 5) THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: manager_score must be between 0.0 and 5.0.';
  END IF;

  -- ── 5. Acknowledge ────────────────────────────────────────
  UPDATE quarterly_checkins SET
    checkin_status  = 'acknowledged',
    acknowledged_by = p_manager_id,
    acknowledged_at = NOW(),
    updated_at      = NOW()
  WHERE id = p_checkin_id
  RETURNING * INTO v_checkin;

  -- ── 6. Upsert quarterly_goal_updates with manager scoring ─
  -- Only inserts if score or feedback provided
  IF p_manager_score IS NOT NULL OR p_manager_feedback IS NOT NULL THEN
    INSERT INTO quarterly_goal_updates (
      checkin_id, goal_id, employee_id, quarter,
      manager_score, manager_feedback, scored_by, scored_at,
      metadata
    )
    VALUES (
      p_checkin_id,
      v_checkin.goal_id,
      v_checkin.employee_id,
      v_checkin.quarter,
      p_manager_score,
      p_manager_feedback,
      p_manager_id,
      NOW(),
      jsonb_build_object('triggered_by', 'acknowledge_quarterly_checkin')
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_update_id;
  END IF;

  -- ── 7. Write audit log ────────────────────────────────────
  INSERT INTO quarterly_checkin_audit_logs (
    checkin_id, goal_id, actor_id, quarter,
    action, from_status, to_status,
    new_values, metadata
  )
  VALUES (
    p_checkin_id,
    v_checkin.goal_id,
    p_manager_id,
    v_checkin.quarter,
    'checkin_acknowledged',
    'submitted',
    'acknowledged',
    to_jsonb(v_checkin),
    jsonb_build_object(
      'triggered_by',   'acknowledge_quarterly_checkin',
      'update_id',       v_update_id,
      'manager_score',   p_manager_score
    )
  );

  RETURN v_checkin;
END;
$$;

COMMENT ON FUNCTION acknowledge_quarterly_checkin(UUID, UUID, NUMERIC, TEXT) IS
  'Manager RPC: acknowledges a submitted quarterly check-in. '
  'Optionally records a manager score (0–5) and written feedback in quarterly_goal_updates. '
  'Validates direct-manager relationship. Writes audit log atomically.';

GRANT EXECUTE ON FUNCTION acknowledge_quarterly_checkin(UUID, UUID, NUMERIC, TEXT)
  TO authenticated;


-- ============================================================
-- SECTION 8: RLS — quarterly_checkins
-- ============================================================

ALTER TABLE quarterly_checkins ENABLE ROW LEVEL SECURITY;

-- Employees see only their own active check-ins
CREATE POLICY "qci_select_own"
  ON quarterly_checkins FOR SELECT
  USING (employee_id = auth.uid() AND deleted_at IS NULL);

-- Managers see check-ins for their direct reports
CREATE POLICY "qci_select_manager"
  ON quarterly_checkins FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM profiles
       WHERE id         = quarterly_checkins.employee_id
         AND manager_id = auth.uid()
         AND is_active  = TRUE
    )
  );

-- HR / Admin see everything
CREATE POLICY "qci_select_admin_hr"
  ON quarterly_checkins FOR SELECT
  USING (is_admin_or_hr());

-- Direct INSERT blocked — employees must use upsert_quarterly_checkin RPC
CREATE POLICY "qci_insert_deny"
  ON quarterly_checkins FOR INSERT
  WITH CHECK (FALSE);

-- Direct UPDATE blocked — use RPCs only
CREATE POLICY "qci_update_deny"
  ON quarterly_checkins FOR UPDATE
  USING (FALSE);

-- Hard DELETE blocked — use soft-delete via RPC
CREATE POLICY "qci_delete_deny"
  ON quarterly_checkins FOR DELETE
  USING (FALSE);


-- ============================================================
-- SECTION 9: RLS — quarterly_goal_updates
-- ============================================================

ALTER TABLE quarterly_goal_updates ENABLE ROW LEVEL SECURITY;

-- Employees see updates for their own goals
CREATE POLICY "qgu_select_own"
  ON quarterly_goal_updates FOR SELECT
  USING (employee_id = auth.uid() AND deleted_at IS NULL);

-- Managers see updates for their direct reports
CREATE POLICY "qgu_select_manager"
  ON quarterly_goal_updates FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM profiles
       WHERE id         = quarterly_goal_updates.employee_id
         AND manager_id = auth.uid()
         AND is_active  = TRUE
    )
  );

-- HR / Admin see everything
CREATE POLICY "qgu_select_admin_hr"
  ON quarterly_goal_updates FOR SELECT
  USING (is_admin_or_hr());

-- Direct writes blocked — use acknowledge_quarterly_checkin RPC
CREATE POLICY "qgu_insert_deny"
  ON quarterly_goal_updates FOR INSERT
  WITH CHECK (FALSE);

CREATE POLICY "qgu_update_deny"
  ON quarterly_goal_updates FOR UPDATE
  USING (FALSE);

CREATE POLICY "qgu_delete_deny"
  ON quarterly_goal_updates FOR DELETE
  USING (FALSE);


-- ============================================================
-- SECTION 10: RLS — quarterly_checkin_audit_logs
-- ============================================================

ALTER TABLE quarterly_checkin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Employees can read audit logs for their own check-ins
CREATE POLICY "qcal_select_own"
  ON quarterly_checkin_audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM quarterly_checkins
       WHERE id          = checkin_id
         AND employee_id = auth.uid()
         AND deleted_at  IS NULL
    )
  );

-- Managers can read audit logs for their direct reports' check-ins
CREATE POLICY "qcal_select_manager"
  ON quarterly_checkin_audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM quarterly_checkins qci
      JOIN profiles p ON p.id = qci.employee_id
       WHERE qci.id        = checkin_id
         AND p.manager_id  = auth.uid()
         AND qci.deleted_at IS NULL
    )
  );

-- HR / Admin see everything
CREATE POLICY "qcal_select_admin_hr"
  ON quarterly_checkin_audit_logs FOR SELECT
  USING (is_admin_or_hr());

-- Immutable — all direct writes blocked
CREATE POLICY "qcal_insert_deny"
  ON quarterly_checkin_audit_logs FOR INSERT
  WITH CHECK (FALSE);

CREATE POLICY "qcal_update_deny"
  ON quarterly_checkin_audit_logs FOR UPDATE
  USING (FALSE);

CREATE POLICY "qcal_delete_deny"
  ON quarterly_checkin_audit_logs FOR DELETE
  USING (FALSE);


-- ============================================================
-- END OF MIGRATION 005
-- ============================================================
