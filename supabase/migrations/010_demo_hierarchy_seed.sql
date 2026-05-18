-- ==============================================================================
-- Migration: 010_demo_hierarchy_seed.sql
-- Description: Lightweight manager-to-employee hierarchy wiring for demo data.
--              Only updates existing profiles — no new auth.users inserts.
--              Safe to run multiple times (idempotent WHERE clauses).
-- ==============================================================================

-- ── Step 1: Wire direct reports for all manager profiles ──────────────────────
-- Employees in Engineering department → report to first active manager in Engineering
-- Employees in Sales department       → report to first active manager in Sales
-- All other employees                 → report to any active manager (round-robin fallback)

DO $$
DECLARE
  v_eng_mgr_id   UUID;
  v_sales_mgr_id UUID;
  v_fallback_mgr UUID;
BEGIN

  -- Resolve Engineering manager
  SELECT id INTO v_eng_mgr_id
  FROM public.profiles
  WHERE role = 'manager'
    AND is_active = TRUE
    AND department ILIKE '%engineering%'
  ORDER BY created_at ASC
  LIMIT 1;

  -- Resolve Sales manager
  SELECT id INTO v_sales_mgr_id
  FROM public.profiles
  WHERE role = 'manager'
    AND is_active = TRUE
    AND department ILIKE '%sales%'
  ORDER BY created_at ASC
  LIMIT 1;

  -- Fallback: first any active manager (covers departments with no dedicated manager)
  SELECT id INTO v_fallback_mgr
  FROM public.profiles
  WHERE role = 'manager'
    AND is_active = TRUE
  ORDER BY created_at ASC
  LIMIT 1;

  -- Wire Engineering employees → Engineering manager
  IF v_eng_mgr_id IS NOT NULL THEN
    UPDATE public.profiles
    SET    manager_id = v_eng_mgr_id,
           updated_at = NOW()
    WHERE  role       = 'employee'
      AND  department ILIKE '%engineering%'
      AND  manager_id IS NULL          -- only set if not already assigned
      AND  id         != v_eng_mgr_id;
  END IF;

  -- Wire Sales employees → Sales manager
  IF v_sales_mgr_id IS NOT NULL THEN
    UPDATE public.profiles
    SET    manager_id = v_sales_mgr_id,
           updated_at = NOW()
    WHERE  role       = 'employee'
      AND  department ILIKE '%sales%'
      AND  manager_id IS NULL
      AND  id         != v_sales_mgr_id;
  END IF;

  -- Wire remaining unassigned employees → fallback manager
  IF v_fallback_mgr IS NOT NULL THEN
    UPDATE public.profiles
    SET    manager_id = v_fallback_mgr,
           updated_at = NOW()
    WHERE  role       = 'employee'
      AND  manager_id IS NULL
      AND  id         != v_fallback_mgr;
  END IF;

  RAISE NOTICE '[010_demo_hierarchy_seed] Hierarchy wiring complete. eng_mgr=%, sales_mgr=%, fallback=%',
    v_eng_mgr_id, v_sales_mgr_id, v_fallback_mgr;

END $$;

-- ── Step 2: Ensure index exists for fast direct-report lookups ─────────────────
-- (idempotent — migration 007 may have already created this)
CREATE INDEX IF NOT EXISTS idx_profiles_manager_id
  ON public.profiles (manager_id)
  WHERE manager_id IS NOT NULL;
