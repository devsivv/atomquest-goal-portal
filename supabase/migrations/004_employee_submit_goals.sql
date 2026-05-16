-- ============================================================
-- AtomQuest — Migration 004: employee_submit_goals RPC
-- ============================================================
-- Replaces the client-side INSERT (which hits RLS/PostgREST
-- edge cases) with a SECURITY DEFINER function that runs under
-- the DB owner's privileges — exactly like the manager approval
-- RPCs in migration 001.
--
-- Canonical fields only (no category, kpis, or metadata):
--   thrust_area, title, description, uom_type,
--   target_value, weightage, deadline_date
--
-- Preserves:
--   * audit logging  (trg_audit_goals fires normally on INSERT)
--   * soft-delete    (UPDATE sets deleted_at before insert)
--   * manager RPCs   (untouched)
--   * validation     (all business rules stay on the client/schema)
-- ============================================================

CREATE OR REPLACE FUNCTION public.employee_submit_goals(
    p_profile_id   UUID,
    p_cycle_id     UUID,
    p_goals        JSONB          -- array of GoalSubmissionPayload objects
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_goal  JSONB;
BEGIN
    -- ── 1. Ownership guard ──────────────────────────────────────────
    -- Only the authenticated user whose UUID matches p_profile_id
    -- may call this function.  All ownership logic lives here so the
    -- client never needs to do a fragile auth.uid() == profileId check.
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'UNAUTHENTICATED: No active session.';
    END IF;

    IF auth.uid() <> p_profile_id THEN
        RAISE EXCEPTION 'FORBIDDEN: caller auth.uid() does not match p_profile_id.';
    END IF;

    -- ── 2. Soft-delete existing goals for this cycle ────────────────
    -- Uses an explicit alias to avoid ambiguous column references.
    UPDATE goals g
       SET deleted_at = now(),
           deleted_by = p_profile_id
     WHERE g.profile_id = p_profile_id
       AND g.cycle_id   = p_cycle_id
       AND g.deleted_at IS NULL;

    -- ── 3. Insert finalized goal rows ────────────────────────────────
    -- Cast precedence is explicit: (expr)::type, never expr::type on
    -- a ->> extraction.  The audit trigger fires for every row inserted.
    FOR v_goal IN SELECT jsonb_array_elements(p_goals) LOOP
        INSERT INTO goals (
            profile_id,
            cycle_id,
            thrust_area,
            title,
            description,
            uom_type,
            target_value,
            weightage,
            deadline_date,
            status,
            submitted_at,
            created_by,
            updated_by
        )
        VALUES (
            p_profile_id,
            p_cycle_id,
            v_goal->>'thrust_area',
            v_goal->>'title',
            v_goal->>'description',
            (v_goal->>'uom_type')::goal_uom_type,
            (v_goal->>'target_value')::numeric,
            (v_goal->>'weightage')::int,
            (v_goal->>'deadline_date')::date,
            'submitted',
            now(),
            p_profile_id,
            p_profile_id
        );
    END LOOP;
END;
$$;

-- Allow the normal authenticated Supabase client to call the RPC.
GRANT EXECUTE
    ON FUNCTION public.employee_submit_goals(UUID, UUID, JSONB)
    TO authenticated;

-- ============================================================
-- END OF MIGRATION 004
-- ============================================================
