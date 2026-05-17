CREATE OR REPLACE FUNCTION employee_submit_goals(
  p_profile_id uuid,
  p_cycle_id uuid,
  p_goals jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  goal jsonb;
BEGIN
  -- Authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF auth.uid() <> p_profile_id THEN
    RAISE EXCEPTION 'Cannot submit goals for another user';
  END IF;

  -- Validate payload exists
  IF p_goals IS NULL OR jsonb_array_length(p_goals) = 0 THEN
    RAISE EXCEPTION 'No goals supplied';
  END IF;

  -- PRE-VALIDATE ALL GOALS BEFORE DELETING ANYTHING
  FOR goal IN SELECT * FROM jsonb_array_elements(p_goals)
  LOOP
    IF trim(COALESCE(goal->>'title', '')) = '' THEN
      RAISE EXCEPTION 'Goal title is required';
    END IF;

    IF trim(COALESCE(goal->>'thrust_area', '')) = '' THEN
      RAISE EXCEPTION 'Thrust area is required';
    END IF;

    IF trim(COALESCE(goal->>'uom_type', '')) = '' THEN
      RAISE EXCEPTION 'UOM type is required';
    END IF;

    IF COALESCE(goal->>'weightage', '') = '' THEN
      RAISE EXCEPTION 'Weightage is required';
    END IF;

    IF COALESCE(goal->>'target_value', '') = '' THEN
      RAISE EXCEPTION 'Target value is required';
    END IF;

    -- Safe numeric validation
    BEGIN
      PERFORM (goal->>'weightage')::numeric;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Invalid weightage value';
    END;

    BEGIN
      PERFORM (goal->>'target_value')::numeric;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Invalid target value';
    END;
  END LOOP;

  -- INSERT NEW ROWS FIRST
  FOR goal IN SELECT * FROM jsonb_array_elements(p_goals)
  LOOP
    INSERT INTO goals (
      profile_id,
      cycle_id,
      title,
      thrust_area,
      description,
      uom_type,
      weightage,
      target_value,
      target_date,
      status,
      created_by,
      updated_by,
      created_at,
$$;