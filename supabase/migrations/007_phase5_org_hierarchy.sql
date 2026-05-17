-- ==============================================================================
-- Migration: 007_phase5_org_hierarchy.sql
-- Description: Extend profiles for org hierarchy; add admin-safe RPCs for
--              role assignment, activation toggle, and manager reassignment.
-- ==============================================================================

-- 1. Ensure profiles has all columns we rely on (idempotent ALTERs)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS department  TEXT,
  ADD COLUMN IF NOT EXISTS designation TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url  TEXT,
  ADD COLUMN IF NOT EXISTS employee_id TEXT,
  ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ NOT NULL DEFAULT now();

-- 2. Performance indexes for hierarchy queries
CREATE INDEX IF NOT EXISTS idx_profiles_manager_id  ON public.profiles (manager_id) WHERE manager_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_role        ON public.profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active   ON public.profiles (is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_department  ON public.profiles (department) WHERE department IS NOT NULL;

-- 3. updated_at trigger (reuse the existing fn_set_updated_at if present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgname = 'trg_profiles_updated_at'
       AND tgrelid = 'public.profiles'::regclass
  ) THEN
    CREATE TRIGGER trg_profiles_updated_at
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
  END IF;
END;
$$;

-- 4. Helper: is_admin_or_hr() — skip if already defined in earlier migrations
CREATE OR REPLACE FUNCTION public.is_admin_or_hr()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
     WHERE id = auth.uid() AND role IN ('admin', 'hr')
  );
$$;

-- 5. RPC: assign_user_role — Admin/HR only
CREATE OR REPLACE FUNCTION public.assign_user_role(
  p_target_user_id UUID,
  p_new_role        TEXT
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_caller_role TEXT;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('admin', 'hr') THEN
    RAISE EXCEPTION 'FORBIDDEN: Only admin or HR may assign roles.';
  END IF;

  IF p_new_role NOT IN ('employee', 'manager', 'admin', 'hr') THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Invalid role "%".', p_new_role;
  END IF;

  -- Prevent self-demotion by last admin guard
  IF p_target_user_id = auth.uid() AND p_new_role != 'admin' THEN
    IF (SELECT COUNT(*) FROM public.profiles WHERE role = 'admin' AND is_active = TRUE) <= 1 THEN
      RAISE EXCEPTION 'FORBIDDEN: Cannot remove the last active admin.';
    END IF;
  END IF;

  UPDATE public.profiles
     SET role       = p_new_role,
         updated_at = now()
   WHERE id = p_target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: User % does not exist.', p_target_user_id;
  END IF;
END;
$$;

-- 6. RPC: toggle_user_active — Admin/HR only
CREATE OR REPLACE FUNCTION public.toggle_user_active(
  p_target_user_id UUID,
  p_is_active       BOOLEAN
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_caller_role TEXT;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('admin', 'hr') THEN
    RAISE EXCEPTION 'FORBIDDEN: Only admin or HR may change user activation.';
  END IF;

  -- Prevent deactivating self
  IF p_target_user_id = auth.uid() AND p_is_active = FALSE THEN
    RAISE EXCEPTION 'FORBIDDEN: You cannot deactivate your own account.';
  END IF;

  UPDATE public.profiles
     SET is_active  = p_is_active,
         updated_at = now()
   WHERE id = p_target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: User % does not exist.', p_target_user_id;
  END IF;
END;
$$;

-- 7. RPC: assign_manager — Admin/HR only; prevents circular hierarchy
CREATE OR REPLACE FUNCTION public.assign_manager(
  p_target_user_id UUID,
  p_manager_id      UUID  -- NULL to clear manager
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_caller_role TEXT;
  v_walk        UUID;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('admin', 'hr') THEN
    RAISE EXCEPTION 'FORBIDDEN: Only admin or HR may reassign managers.';
  END IF;

  -- Self-manager guard
  IF p_target_user_id = p_manager_id THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: A user cannot be their own manager.';
  END IF;

  -- Circular hierarchy guard: walk up from proposed manager to root
  IF p_manager_id IS NOT NULL THEN
    v_walk := p_manager_id;
    LOOP
      SELECT manager_id INTO v_walk FROM public.profiles WHERE id = v_walk;
      EXIT WHEN v_walk IS NULL;
      IF v_walk = p_target_user_id THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: Circular reporting hierarchy detected.';
      END IF;
    END LOOP;
  END IF;

  UPDATE public.profiles
     SET manager_id = p_manager_id,
         updated_at = now()
   WHERE id = p_target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: User % does not exist.', p_target_user_id;
  END IF;
END;
$$;

-- 8. Grant execute to authenticated users (RPCs enforce their own RBAC)
GRANT EXECUTE ON FUNCTION public.assign_user_role(UUID, TEXT)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_user_active(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_manager(UUID, UUID)        TO authenticated;

-- 9. RLS: Admin/HR can UPDATE profiles (for non-RPC paths, belt-and-suspenders)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_update_admin_hr'
  ) THEN
    CREATE POLICY "profiles_update_admin_hr"
      ON public.profiles FOR UPDATE
      USING (is_admin_or_hr());
  END IF;
END; $$;
