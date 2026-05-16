-- Migration: 003_fix_audit_trigger_rls.sql
-- Fixes the RLS failure on goals INSERT caused by the audit trigger.
-- The trigger fn_audit_goals requires SET search_path = public to guarantee
-- it executes under the definer's privileges (bypassing the audit_logs RLS).

CREATE OR REPLACE FUNCTION fn_audit_goals()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public 
AS $$
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
