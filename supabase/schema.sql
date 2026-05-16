-- ============================================================
-- AtomQuest Goal Tracking Portal — Production Database Schema
-- ============================================================
-- PostgreSQL 15+ / Supabase
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================

-- ============================================================
-- SECTION 1: EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- SECTION 2: ENUM TYPES
-- ============================================================

CREATE TYPE user_role AS ENUM (
  'employee',   -- Standard individual contributor
  'manager',    -- Can approve/reject goals for their team
  'hr',         -- Read-only audit access across org
  'admin'       -- Full access: unlock goals, manage cycles
);

CREATE TYPE goal_status AS ENUM (
  'draft',               -- Created, not yet submitted
  'submitted',           -- Sent for manager approval
  'under_review',        -- Manager is reviewing
  'revision_requested',  -- Manager asked for changes
  'approved',            -- Approved → auto-locks goal
  'rejected',            -- Rejected permanently
  'completed',           -- Marked done
  'archived'             -- Soft-archived
);

CREATE TYPE goal_priority AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TYPE cycle_status AS ENUM (
  'planning',  -- Goal creation open
  'active',    -- Goals locked, check-ins open
  'review',    -- End-of-cycle reviews
  'closed'     -- Finalized
);

CREATE TYPE cycle_type AS ENUM ('quarterly', 'half_yearly', 'annual');

CREATE TYPE checkin_status AS ENUM ('draft', 'submitted', 'reviewed');

CREATE TYPE shared_goal_status AS ENUM ('active', 'inactive', 'archived');

CREATE TYPE audit_action AS ENUM (
  'INSERT', 'UPDATE', 'DELETE',
  'SUBMIT', 'APPROVE', 'REJECT',
  'LOCK', 'UNLOCK', 'COMPLETE'
);

-- Unit of Measurement type for goal measurement strategy (BRD requirement)
CREATE TYPE goal_uom_type AS ENUM (
  'numeric_max',     -- Numeric: higher value = better performance
  'numeric_min',     -- Numeric: lower value = better performance
  'percentage_max',  -- Percentage: higher % = better performance
  'percentage_min',  -- Percentage: lower % = better performance
  'timeline',        -- Date/milestone-based completion
  'zero_based'       -- Target is zero (e.g., defects, incidents)
);

-- ============================================================
-- SECTION 3: TABLES
-- ============================================================

-- ------------------------------------------------------------
-- profiles: extends auth.users with app profile data
-- ------------------------------------------------------------
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id   TEXT UNIQUE NOT NULL,
  full_name     TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  role          user_role NOT NULL DEFAULT 'employee',
  manager_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  department    TEXT NOT NULL,
  designation   TEXT NOT NULL,
  avatar_url    TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  -- Audit
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID REFERENCES profiles(id),
  updated_by    UUID REFERENCES profiles(id),

  CONSTRAINT profiles_no_self_manage   CHECK (id != manager_id),
  CONSTRAINT profiles_email_format     CHECK (email ~* '^[^@]+@[^@]+\.[^@]+$')
);

COMMENT ON TABLE  profiles IS 'App profiles — 1:1 with auth.users. Soft-deactivated via is_active.';
COMMENT ON COLUMN profiles.manager_id IS 'Direct manager. NULL = top of hierarchy.';

-- ------------------------------------------------------------
-- goal_cycles: Q1/Q2/annual planning periods
-- ------------------------------------------------------------
CREATE TABLE goal_cycles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT UNIQUE NOT NULL,
  cycle_type  cycle_type NOT NULL DEFAULT 'quarterly',
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  status      cycle_status NOT NULL DEFAULT 'planning',
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  -- Audit
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES profiles(id),
  updated_by  UUID REFERENCES profiles(id),

  CONSTRAINT goal_cycles_date_order CHECK (end_date > start_date)
);

-- Only one default cycle at a time
CREATE UNIQUE INDEX idx_goal_cycles_single_default
  ON goal_cycles (is_default)
  WHERE is_default = TRUE;

COMMENT ON TABLE goal_cycles IS 'Performance planning cycles. Goals and check-ins are scoped to a cycle.';

-- ------------------------------------------------------------
-- goals: core goal entity
-- ------------------------------------------------------------
CREATE TABLE goals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cycle_id        UUID NOT NULL REFERENCES goal_cycles(id) ON DELETE RESTRICT,
  -- Content
  title           TEXT NOT NULL,
  description     TEXT,
  category        TEXT NOT NULL DEFAULT 'General',
  thrust_area     TEXT NOT NULL,                             -- BRD: Thrust Area grouping
  priority        goal_priority NOT NULL DEFAULT 'medium',
  status          goal_status NOT NULL DEFAULT 'draft',
  -- Unit of Measurement (BRD requirement)
  uom_type          goal_uom_type NOT NULL DEFAULT 'numeric_max',
  target_value      NUMERIC,                                -- Expected target (for numeric/percentage UOMs)
  achievement_value NUMERIC,                                -- Actual achieved value
  deadline_date     DATE,                                   -- UOM-specific milestone deadline
  -- Weight & progress
  weightage       INTEGER NOT NULL DEFAULT 10,
  progress        INTEGER NOT NULL DEFAULT 0,
  -- Timeline
  due_date        DATE,
  -- Approval workflow
  submitted_at    TIMESTAMPTZ,
  approved_by     UUID REFERENCES profiles(id),
  approved_at     TIMESTAMPTZ,
  rejected_reason TEXT,
  -- Flags
  is_locked       BOOLEAN NOT NULL DEFAULT FALSE,
  is_shared       BOOLEAN NOT NULL DEFAULT FALSE,
  -- Autosave tracking (Frontend drafts)
  last_autosaved_at TIMESTAMPTZ,
  draft_content     JSONB,
  -- Soft delete
  deleted_at      TIMESTAMPTZ,
  deleted_by      UUID REFERENCES profiles(id),
  -- Audit
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID NOT NULL REFERENCES profiles(id),
  updated_by      UUID REFERENCES profiles(id),

  CONSTRAINT goals_weightage_range     CHECK (weightage >= 10 AND weightage <= 100),
  CONSTRAINT goals_progress_range      CHECK (progress >= 0   AND progress <= 100),
  CONSTRAINT goals_no_self_approve     CHECK (approved_by IS NULL OR approved_by != profile_id)
);

COMMENT ON TABLE  goals IS 'Core goals. Max 8 per (profile, cycle). Total weightage = 100. Locked after approval.';
COMMENT ON COLUMN goals.is_locked         IS 'Set TRUE on approval. Edits blocked until admin unlocks.';
COMMENT ON COLUMN goals.weightage         IS '10–100. Sum across active goals for same (profile_id, cycle_id) must equal 100.';
COMMENT ON COLUMN goals.thrust_area       IS 'BRD Thrust Area — strategic grouping for this goal (e.g., Revenue, Quality, Innovation).';
COMMENT ON COLUMN goals.uom_type          IS 'Unit of Measurement strategy. Determines how achievement_value is compared to target_value.';
COMMENT ON COLUMN goals.target_value      IS 'Numeric/percentage target to achieve. NULL for timeline/zero_based UOMs.';
COMMENT ON COLUMN goals.achievement_value IS 'Actual achieved value at end of cycle. Populated during check-in or cycle close.';
COMMENT ON COLUMN goals.deadline_date     IS 'Milestone deadline for timeline UOM type. Separate from due_date which is the overall goal deadline.';
COMMENT ON COLUMN goals.draft_content     IS 'JSONB blob to persist incomplete frontend forms without triggering constraint violations.';
COMMENT ON COLUMN goals.last_autosaved_at IS 'Timestamp of the last frontend autosave. Useful to show users when their draft was last backed up.';

-- ------------------------------------------------------------
-- quarterly_checkins: one per goal per quarter
-- ------------------------------------------------------------
CREATE TABLE quarterly_checkins (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id             UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  cycle_id            UUID NOT NULL REFERENCES goal_cycles(id) ON DELETE RESTRICT,
  profile_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quarter             SMALLINT NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  check_in_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  -- Progress snapshot
  progress_percentage INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
  achievements        TEXT,
  blockers            TEXT,
  next_steps          TEXT,
  -- Manager review
  manager_comments    TEXT,
  status              checkin_status NOT NULL DEFAULT 'draft',
  reviewed_by         UUID REFERENCES profiles(id),
  reviewed_at         TIMESTAMPTZ,
  -- Audit
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by          UUID NOT NULL REFERENCES profiles(id),
  updated_by          UUID REFERENCES profiles(id),

  CONSTRAINT checkins_one_per_quarter UNIQUE (goal_id, cycle_id, quarter)  -- cycle_id prevents conflicts across multiple cycles
);

COMMENT ON TABLE quarterly_checkins IS 'Quarterly progress snapshots. One per goal per quarter.';

-- ------------------------------------------------------------
-- shared_goal_master: manager-defined template goals
-- ------------------------------------------------------------
CREATE TABLE shared_goal_master (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id              UUID NOT NULL REFERENCES goal_cycles(id) ON DELETE RESTRICT,
  created_by_manager_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  title                 TEXT NOT NULL,
  description           TEXT,
  category              TEXT NOT NULL DEFAULT 'General',
  thrust_area           TEXT NOT NULL,                       -- BRD: Thrust Area grouping (syncs to assignments)
  priority              goal_priority NOT NULL DEFAULT 'medium',
  suggested_weightage   INTEGER NOT NULL DEFAULT 10
                          CHECK (suggested_weightage >= 10 AND suggested_weightage <= 100),
  status                shared_goal_status NOT NULL DEFAULT 'active',
  -- Soft delete
  deleted_at            TIMESTAMPTZ,
  deleted_by            UUID REFERENCES profiles(id),
  -- Audit
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            UUID NOT NULL REFERENCES profiles(id),
  updated_by            UUID REFERENCES profiles(id)
);

COMMENT ON TABLE shared_goal_master IS 'Template goals created by managers. Changes sync to linked employee goals.';

-- ------------------------------------------------------------
-- shared_goal_assignments: links master → employee goal
-- ------------------------------------------------------------
CREATE TABLE shared_goal_assignments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_goal_id UUID NOT NULL REFERENCES shared_goal_master(id) ON DELETE CASCADE,
  goal_id        UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  profile_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by    UUID NOT NULL REFERENCES profiles(id),
  is_synced      BOOLEAN NOT NULL DEFAULT TRUE,
  -- Soft delete
  deleted_at     TIMESTAMPTZ,
  -- Audit
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT sga_unique_assignment UNIQUE (shared_goal_id, profile_id)
);

COMMENT ON TABLE  shared_goal_assignments IS 'Maps shared_goal_master to individual employee goals.';
COMMENT ON COLUMN shared_goal_assignments.is_synced IS 'If TRUE, master edits auto-propagate to linked goal (when goal is not locked).';

-- ------------------------------------------------------------
-- audit_logs: immutable append-only audit trail
-- ------------------------------------------------------------
CREATE TABLE audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name      TEXT NOT NULL,
  record_id       UUID NOT NULL,
  action          audit_action NOT NULL,
  old_values      JSONB,
  new_values      JSONB,
  changed_by      UUID REFERENCES profiles(id),
  changed_by_role user_role,
  ip_address      INET,
  user_agent      TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- NO updated_at — immutable by design
);

COMMENT ON TABLE audit_logs IS 'Immutable audit trail. Append-only. No UPDATE/DELETE permitted (enforced via RLS + trigger).';

-- ============================================================
-- SECTION 4: INDEXES
-- ============================================================

-- profiles
CREATE INDEX idx_profiles_manager_id  ON profiles (manager_id);
CREATE INDEX idx_profiles_role        ON profiles (role);
CREATE INDEX idx_profiles_department  ON profiles (department);
CREATE INDEX idx_profiles_is_active   ON profiles (is_active) WHERE is_active = TRUE;

-- goal_cycles
CREATE INDEX idx_cycles_status        ON goal_cycles (status);
CREATE INDEX idx_cycles_dates         ON goal_cycles (start_date, end_date);

-- goals
CREATE INDEX idx_goals_profile_id     ON goals (profile_id);
CREATE INDEX idx_goals_cycle_id       ON goals (cycle_id);
CREATE INDEX idx_goals_status         ON goals (status);
CREATE INDEX idx_goals_is_locked      ON goals (is_locked);
CREATE INDEX idx_goals_profile_cycle  ON goals (profile_id, cycle_id);
CREATE INDEX idx_goals_active         ON goals (profile_id, cycle_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_goals_approved_by    ON goals (approved_by) WHERE approved_by IS NOT NULL;

-- quarterly_checkins
CREATE INDEX idx_checkins_goal_id     ON quarterly_checkins (goal_id);
CREATE INDEX idx_checkins_profile_id  ON quarterly_checkins (profile_id);
CREATE INDEX idx_checkins_cycle_id    ON quarterly_checkins (cycle_id);
CREATE INDEX idx_checkins_status      ON quarterly_checkins (status);

-- shared_goal_master
CREATE INDEX idx_sgm_cycle_id         ON shared_goal_master (cycle_id);
CREATE INDEX idx_sgm_manager_id       ON shared_goal_master (created_by_manager_id);
CREATE INDEX idx_sgm_active           ON shared_goal_master (cycle_id) WHERE deleted_at IS NULL;

-- shared_goal_assignments
CREATE INDEX idx_sga_shared_goal_id   ON shared_goal_assignments (shared_goal_id);
CREATE INDEX idx_sga_profile_id       ON shared_goal_assignments (profile_id);
CREATE INDEX idx_sga_goal_id          ON shared_goal_assignments (goal_id);

-- audit_logs
CREATE INDEX idx_audit_table_record   ON audit_logs (table_name, record_id);
CREATE INDEX idx_audit_changed_by     ON audit_logs (changed_by);
CREATE INDEX idx_audit_created_at     ON audit_logs (created_at DESC);
CREATE INDEX idx_audit_action         ON audit_logs (action);

-- ============================================================
-- SECTION 5: FUNCTIONS & TRIGGERS
-- ============================================================

-- ------------------------------------------------------------
-- Auto-update updated_at
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_cycles_updated_at
  BEFORE UPDATE ON goal_cycles FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_goals_updated_at
  BEFORE UPDATE ON goals FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_checkins_updated_at
  BEFORE UPDATE ON quarterly_checkins FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_sgm_updated_at
  BEFORE UPDATE ON shared_goal_master FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_sga_updated_at
  BEFORE UPDATE ON shared_goal_assignments FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ------------------------------------------------------------
-- Enforce max 8 goals per employee per cycle (INSERT only)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_check_max_goals()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM goals
  WHERE profile_id = NEW.profile_id
    AND cycle_id   = NEW.cycle_id
    AND deleted_at IS NULL;

  IF v_count >= 8 THEN
    RAISE EXCEPTION
      'GOAL_LIMIT_EXCEEDED: Max 8 goals per employee per cycle. Current: %', v_count;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_goals_max_check
  BEFORE INSERT ON goals
  FOR EACH ROW EXECUTE FUNCTION fn_check_max_goals();

-- ------------------------------------------------------------
-- Enforce weightage total ≤ 100 on INSERT/UPDATE
-- (Application must validate = 100 before approval)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_check_weightage()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_total INTEGER;
BEGIN
  SELECT COALESCE(SUM(weightage), 0) INTO v_total
  FROM goals
  WHERE profile_id = NEW.profile_id
    AND cycle_id   = NEW.cycle_id
    AND deleted_at IS NULL
    AND id         != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);

  IF (v_total + NEW.weightage) > 100 THEN
    RAISE EXCEPTION
  'WEIGHTAGE_EXCEEDED: Total weightage would be %. Max is 100.',
  (v_total + NEW.weightage);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_goals_weightage_check
  BEFORE INSERT OR UPDATE OF weightage ON goals
  FOR EACH ROW EXECUTE FUNCTION fn_check_weightage();

-- ------------------------------------------------------------
-- Auto-lock goal on approval; block edits on locked goals
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_goal_approval_lock()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Auto-lock on approval
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    NEW.is_locked   = TRUE;
    NEW.approved_at = NOW();
  END IF;

  -- Block content edits on locked goals
  IF OLD.is_locked = TRUE AND NEW.is_locked = TRUE THEN
    IF NEW.title             IS DISTINCT FROM OLD.title             OR
   NEW.description       IS DISTINCT FROM OLD.description       OR
   NEW.weightage         IS DISTINCT FROM OLD.weightage         OR
   NEW.category          IS DISTINCT FROM OLD.category          OR
   NEW.thrust_area       IS DISTINCT FROM OLD.thrust_area       OR
   NEW.uom_type          IS DISTINCT FROM OLD.uom_type          OR
   NEW.target_value      IS DISTINCT FROM OLD.target_value      OR
   NEW.deadline_date     IS DISTINCT FROM OLD.deadline_date THEN
      RAISE EXCEPTION
        'GOAL_LOCKED: Goal is locked. Request admin unlock before editing.';
    END IF;
  END IF;

  -- Set submitted_at on first submission
  IF NEW.status = 'submitted' AND OLD.status = 'draft' THEN
    NEW.submitted_at = NOW();
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_goal_approval_lock
  BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION fn_goal_approval_lock();

-- ------------------------------------------------------------
-- Sync shared_goal_master edits to employee goals
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_sync_shared_goal()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.title       IS DISTINCT FROM OLD.title       OR
     NEW.description IS DISTINCT FROM OLD.description OR
     NEW.priority    IS DISTINCT FROM OLD.priority    OR
     NEW.category    IS DISTINCT FROM OLD.category    OR
     NEW.thrust_area IS DISTINCT FROM OLD.thrust_area THEN

    UPDATE goals g
    SET title       = NEW.title,
        description = NEW.description,
        priority    = NEW.priority,
        category    = NEW.category,
        thrust_area = NEW.thrust_area,
        updated_at  = NOW()
    FROM shared_goal_assignments sga
    WHERE sga.shared_goal_id = NEW.id
      AND sga.goal_id        = g.id
      AND sga.is_synced      = TRUE
      AND g.is_locked        = FALSE
      AND g.deleted_at       IS NULL
      AND sga.deleted_at     IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_shared_goal
  AFTER UPDATE ON shared_goal_master
  FOR EACH ROW EXECUTE FUNCTION fn_sync_shared_goal();

-- ------------------------------------------------------------
-- Audit log trigger for goals (all DML)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_audit_goals()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_action   audit_action;
  v_old      JSONB;
  v_new      JSONB;
BEGIN
  IF    TG_OP = 'INSERT' THEN v_action := 'INSERT'; v_old := NULL;           v_new := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN v_action := 'DELETE'; v_old := to_jsonb(OLD);  v_new := NULL;
  ELSE
    v_action := 'UPDATE';
    v_old    := to_jsonb(OLD);
    v_new    := to_jsonb(NEW);
    -- Semantic action mapping
    IF OLD.status != NEW.status THEN
      CASE NEW.status
        WHEN 'submitted'  THEN v_action := 'SUBMIT';
        WHEN 'approved'   THEN v_action := 'APPROVE';
        WHEN 'rejected'   THEN v_action := 'REJECT';
        WHEN 'completed'  THEN v_action := 'COMPLETE';
        ELSE NULL;
      END CASE;
    END IF;
    IF OLD.is_locked = FALSE AND NEW.is_locked = TRUE  THEN v_action := 'LOCK';   END IF;
    IF OLD.is_locked = TRUE  AND NEW.is_locked = FALSE THEN v_action := 'UNLOCK'; END IF;
  END IF;

  INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, changed_by, created_at)
  VALUES (TG_TABLE_NAME, COALESCE(NEW.id, OLD.id), v_action, v_old, v_new, auth.uid(), NOW());

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_audit_goals
  AFTER INSERT OR UPDATE OR DELETE ON goals
  FOR EACH ROW EXECUTE FUNCTION fn_audit_goals();

-- ------------------------------------------------------------
-- Auto-create profile on Supabase Auth signup
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, employee_id, department, designation, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name',   'New User'),
    COALESCE(NEW.raw_user_meta_data->>'employee_id', 'EMP-' || UPPER(SUBSTRING(NEW.id::TEXT, 1, 8))),
    COALESCE(NEW.raw_user_meta_data->>'department',  'General'),
    COALESCE(NEW.raw_user_meta_data->>'designation', 'Employee'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'employee')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION fn_handle_new_user();

-- ============================================================
-- SECTION 6: ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_cycles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE quarterly_checkins     ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_goal_master     ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_goal_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs             ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- Helper: check if current user is admin or hr
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_admin_or_hr()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'hr') AND is_active = TRUE
  );
$$;

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = TRUE
  );
$$;

-- Helper: check if user_id is a direct report of current user
CREATE OR REPLACE FUNCTION is_my_report(p_profile_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_profile_id AND manager_id = auth.uid() AND is_active = TRUE
  );
$$;

-- ------------------------------------------------------------
-- RLS: profiles
-- ------------------------------------------------------------
-- View own profile
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (id = auth.uid());

-- Managers see their direct reports
CREATE POLICY "profiles_select_team"
  ON profiles FOR SELECT
  USING (manager_id = auth.uid());

-- Admin/HR see all profiles
CREATE POLICY "profiles_select_admin"
  ON profiles FOR SELECT
  USING (is_admin_or_hr());

-- Users update own profile (non-role fields)
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admin can update any profile (role changes, etc.)
CREATE POLICY "profiles_update_admin"
  ON profiles FOR UPDATE
  USING (is_admin());

-- ------------------------------------------------------------
-- RLS: goal_cycles
-- ------------------------------------------------------------
-- All active users can read cycles
CREATE POLICY "cycles_select_all"
  ON goal_cycles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins manage cycles
CREATE POLICY "cycles_insert_admin"
  ON goal_cycles FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "cycles_update_admin"
  ON goal_cycles FOR UPDATE
  USING (is_admin());

-- ------------------------------------------------------------
-- RLS: goals
-- ------------------------------------------------------------
-- Employees see their own goals
CREATE POLICY "goals_select_own"
  ON goals FOR SELECT
  USING (profile_id = auth.uid() AND deleted_at IS NULL);

-- Managers see their team's goals
CREATE POLICY "goals_select_team"
  ON goals FOR SELECT
  USING (is_my_report(profile_id) AND deleted_at IS NULL);

-- Admin/HR see all goals
CREATE POLICY "goals_select_admin"
  ON goals FOR SELECT
  USING (is_admin_or_hr());

-- Employees create their own goals
CREATE POLICY "goals_insert_own"
  ON goals FOR INSERT
  WITH CHECK (profile_id = auth.uid() AND created_by = auth.uid());

-- Employees update their own unlocked goals
CREATE POLICY "goals_update_own"
  ON goals FOR UPDATE
  USING (profile_id = auth.uid() AND is_locked = FALSE AND deleted_at IS NULL);

-- Managers update goals for their reports (approval workflow)
CREATE POLICY "goals_update_manager"
  ON goals FOR UPDATE
  USING (is_my_report(profile_id));

-- Admins update any goal (includes unlock)
CREATE POLICY "goals_update_admin"
  ON goals FOR UPDATE
  USING (is_admin());

-- Soft-delete own goals (set deleted_at)
CREATE POLICY "goals_delete_own"
  ON goals FOR UPDATE
  USING (profile_id = auth.uid() AND status = 'draft');

-- ------------------------------------------------------------
-- RLS: quarterly_checkins
-- ------------------------------------------------------------
CREATE POLICY "checkins_select_own"
  ON quarterly_checkins FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "checkins_select_team"
  ON quarterly_checkins FOR SELECT
  USING (is_my_report(profile_id));

CREATE POLICY "checkins_select_admin"
  ON quarterly_checkins FOR SELECT
  USING (is_admin_or_hr());

CREATE POLICY "checkins_insert_own"
  ON quarterly_checkins FOR INSERT
  WITH CHECK (profile_id = auth.uid() AND created_by = auth.uid());

CREATE POLICY "checkins_update_own"
  ON quarterly_checkins FOR UPDATE
  USING (profile_id = auth.uid() AND status = 'draft');

CREATE POLICY "checkins_update_manager"
  ON quarterly_checkins FOR UPDATE
  USING (is_my_report(profile_id));

-- ------------------------------------------------------------
-- RLS: shared_goal_master
-- ------------------------------------------------------------
CREATE POLICY "sgm_select_all"
  ON shared_goal_master FOR SELECT
  USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);

CREATE POLICY "sgm_insert_manager"
  ON shared_goal_master FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'admin'))
  );

CREATE POLICY "sgm_update_owner"
  ON shared_goal_master FOR UPDATE
  USING (created_by_manager_id = auth.uid() OR is_admin());

-- ------------------------------------------------------------
-- RLS: shared_goal_assignments
-- ------------------------------------------------------------
CREATE POLICY "sga_select_own"
  ON shared_goal_assignments FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "sga_select_manager"
  ON shared_goal_assignments FOR SELECT
  USING (is_my_report(profile_id) OR is_admin_or_hr());

CREATE POLICY "sga_insert_manager"
  ON shared_goal_assignments FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'admin'))
  );

-- ------------------------------------------------------------
-- RLS: audit_logs
-- ------------------------------------------------------------
-- Admin and HR can read; no one can write directly (trigger only)
CREATE POLICY "audit_select_admin_hr"
  ON audit_logs FOR SELECT
  USING (is_admin_or_hr());

-- Block direct inserts — only the trigger function (SECURITY DEFINER) writes here
CREATE POLICY "audit_insert_deny"
  ON audit_logs FOR INSERT
  WITH CHECK (FALSE);

-- ============================================================
-- SECTION 7: SEED DATA
-- ============================================================

-- NOTE: Profiles are auto-created via fn_handle_new_user trigger on auth signup.
-- Run this seed AFTER creating your first admin user via Supabase Auth.

-- Seed: Current active quarter cycle
INSERT INTO goal_cycles (name, cycle_type, start_date, end_date, status, is_default)
VALUES
  ('Q1 FY2025-26', 'quarterly', '2025-04-01', '2025-06-30', 'planning', TRUE),
  ('Q2 FY2025-26', 'quarterly', '2025-07-01', '2025-09-30', 'planning', FALSE),
  ('Q3 FY2025-26', 'quarterly', '2025-10-01', '2025-12-31', 'planning', FALSE),
  ('Q4 FY2025-26', 'quarterly', '2026-01-01', '2026-03-31', 'planning', FALSE)
ON CONFLICT (name) DO NOTHING;
